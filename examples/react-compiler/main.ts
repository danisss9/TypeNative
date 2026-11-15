// React Compiler, natively: the vendored babel-plugin-react-compiler source
// compiles React components and hooks to their auto-memoized form, the way
// the Babel plugin does, on the vendored Babel parser, traverse and generator
// (no @babel/core). The output is the same as running this file under Node.
//
//   node run-node.mjs [file.jsx]
//   typenative --source main.ts --output react-compile && ./react-compile [file.jsx]
//
// The first line of the input can carry the compiler's test pragmas, as in
// the compiler's own fixtures: `// @compilationMode:"infer" @enableJsxOutlining`.

import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import * as nodeOs from 'node:os';
import { spawn } from 'node:child_process';
import { parse, type ParserPlugin } from './vendor/babel/parser/src/index.ts';
import traverse, { type NodePath } from './vendor/babel/traverse/src/index.ts';
import generate from './vendor/babel/generator/src/index.ts';
import type * as t from './vendor/babel/types/src/index.ts';
import { CompilerError } from './vendor/react-compiler/src/CompilerError.ts';
import {
  compileProgram,
  type LoggerEvent,
  type PluginOptions,
} from './vendor/react-compiler/src/Entrypoint/index.ts';
import { parseConfigPragmaForTests } from './vendor/react-compiler/src/Utils/TestUtils.ts';

const DEMO = `// @compilationMode:"infer"
import { useState } from 'react';

export function TodoList({ todos, filter, onToggle }) {
  const [query, setQuery] = useState('');
  const visible = todos.filter(
    (todo) => (filter === 'all' || todo.status === filter) && todo.title.includes(query),
  );
  const remaining = todos.filter((todo) => todo.status !== 'done').length;

  if (todos.length === 0) {
    return <p className="empty">Nothing to do</p>;
  }
  return (
    <section>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <ul>
        {visible.map((todo) => (
          <li key={todo.id} className={todo.status} onClick={() => onToggle(todo.id)}>
            {todo.title}
          </li>
        ))}
      </ul>
      <footer>{remaining} of {todos.length} left</footer>
    </section>
  );
}

export function useTotal(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  return { subtotal, tax, total: subtotal + tax };
}
`;

function position(loc: t.SourceLocation | null | undefined): string {
  return loc ? `${loc.start.line}:${loc.start.column}` : '?';
}

// A logger event as a comment line (the first line of an error's text: a
// pipeline error carries its stack, which differs between runtimes)
function describe(event: LoggerEvent): string {
  switch (event.kind) {
    case 'CompileSuccess':
      return (
        `// CompileSuccess ${event.fnName ?? '(anonymous)'} at ${position(event.fnLoc)}: ` +
        `${event.memoSlots} slots, ${event.memoBlocks} blocks, ${event.memoValues} values, ` +
        `${event.prunedMemoBlocks} pruned blocks, ${event.prunedMemoValues} pruned values`
      );
    case 'CompileError': {
      const description = event.detail.description ? `. ${event.detail.description}` : '';
      return `// CompileError at ${position(event.detail.loc ?? event.fnLoc)}: [${event.detail.category}] ${event.detail.reason}${description}`;
    }
    case 'CompileDiagnostic':
      return `// CompileDiagnostic at ${position(event.fnLoc)}: [${event.detail.category}] ${event.detail.reason}`;
    case 'CompileSkip':
      return `// CompileSkip at ${position(event.fnLoc)}: ${event.reason}`;
    case 'PipelineError':
    case 'CompileUnexpectedThrow':
      return `// ${event.kind} at ${position(event.fnLoc)}: ${event.data.split('\n')[0]}`;
    case 'Timing':
      return '// Timing';
  }
}

function compile(source: string, filename: string): string {
  const { code, events } = compileParts(source, filename);
  return [code, ...events].join('\n');
}

function compileParts(source: string, filename: string): { code: string; events: string[] } {
  const firstLine = source.substring(0, source.indexOf('\n'));
  const flow = firstLine.includes('@flow');
  const plugins: ParserPlugin[] = flow
    ? ['flow', 'jsx']
    : ['typescript', 'jsx', 'explicitResourceManagement'];
  const ast = parse(source, {
    sourceFilename: filename,
    sourceType: firstLine.includes('@script') ? 'script' : 'module',
    plugins,
  });

  // The options the compiler's fixture runner (snap) uses
  const events: LoggerEvent[] = [];
  const config = parseConfigPragmaForTests(firstLine, { compilationMode: 'all' });
  const opts: PluginOptions = {
    ...config,
    environment: {
      ...config.environment,
      assertValidMutableRanges: true,
      validatePreserveExistingMemoizationGuarantees: firstLine.includes(
        '@validatePreserveExistingMemoizationGuarantees',
      ),
    },
    logger: {
      logEvent: (_filename: string | null, event: LoggerEvent): void => {
        events.push(event);
      },
    },
    enableReanimatedCheck: false,
    target: '19',
  };

  traverse(ast, {
    Program(program: NodePath<t.Program>) {
      compileProgram(program, {
        opts,
        filename,
        comments: ast.comments ?? [],
        code: source,
      });
      program.skip();
    },
  });

  const code = generate(ast, {}, source).code;
  return { code, events: events.map(describe) };
}

// Large files of independent top-level functions: a worker process compiles
// each contiguous run of functions, and the parent joins their output. The
// per-function output is independent, and each chunk is padded so source
// positions (the // CompileSuccess lines) stay the ones of the whole file.
// Under Node each worker re-imports the compiler (expensive); TypeNative's
// workers start from the compiled binary. TN_PARALLEL=0 disables it.
const MAX_WORKERS = 6;
const MIN_FUNCTIONS = 8;

type Chunk = { first: string; text: string };

function splitSource(source: string): Chunk[] | undefined {
  // (compiler temps are renamed per chunk; a source using such a name keeps
  // the single-process path)
  if (/\b_temp\d*\b/.test(source)) return undefined;
  const lines = source.split('\n');
  const starts: { name: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(lines[i]);
    if (match) starts.push({ name: match[1], line: i });
  }
  if (starts.length < MIN_FUNCTIONS) return undefined;
  // (the header must be imports / comments only: the chunks share it)
  const header = lines.slice(0, starts[0].line);
  if (header.some((l) => l.trim() !== '' && !/^(import\b|\/\/|\/\*|\*|'use |"use )/.test(l.trim()))) return undefined;
  // (each function runs to the line before the next one; brace-counted, so
  // templates and strings with braces could fool it — then no parallelism)
  const ranges: { name: string; start: number; end: number }[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].line;
    const limit = i + 1 < starts.length ? starts[i + 1].line : lines.length;
    let depth = 0;
    let end = -1;
    for (let j = start; j < limit; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth === 0 && j > start) { end = j; break; }
    }
    if (end < 0 || !/^\}/.test(lines[end])) return undefined;
    // (only functions are split: anything else between them — variables,
    // statements — would be dropped, so such a file compiles in one process)
    if (i + 1 < starts.length) {
      for (let j = end + 1; j < starts[i + 1].line; j++) {
        const text = lines[j].trim();
        if (text !== '' && !/^(\/\/|\/\*|\*)/.test(text)) return undefined;
      }
    }
    ranges.push({ name: starts[i].name, start, end });
  }
  const workers = Math.min(MAX_WORKERS, Math.ceil(ranges.length / 10));
  // (one worker would only add a process start: compile in this one)
  if (workers < 2) return undefined;
  const chunks: Chunk[] = [];
  const per = Math.ceil(ranges.length / workers);
  for (let i = 0; i < ranges.length; i += per) {
    const group = ranges.slice(i, i + per);
    const firstStart = group[0].start;
    const padding = Math.max(0, firstStart - header.length);
    const pad: string[] = [];
    for (let k = 0; k < padding; k++) pad.push('');
    const body = lines.slice(firstStart, group[group.length - 1].end + 1);
    // the last chunk carries the rest of the file (export default …)
    const tail = i + per >= ranges.length ? lines.slice(group[group.length - 1].end + 1) : [];
    chunks.push({
      first: group[0].name,
      text: [...header, ...pad, ...body, ...tail].join('\n'),
    });
  }
  return chunks;
}

function runWorkerProcess(chunkFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const nodeMain = process.env.TN_NODE_MAIN;
    const args = nodeMain ? [nodeMain, chunkFile, '--worker'] : [chunkFile, '--worker'];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout?.on('data', (data: unknown) => (out += String(data)));
    child.stderr?.on('data', (data: unknown) => (err += String(data)));
    child.on('error', (e: unknown) => {
      reject(e);
    });
    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(out);
      } else {
        reject(new Error(err || `worker exited with ${code}`));
      }
    });
  });
}

async function parallelCompile(source: string, filename: string, chunks: Chunk[]): Promise<string> {
  const dir = fs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'tn-react-compile-'));
  try {
    const files: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const file = nodePath.join(dir, `chunk${i}.jsx`);
      fs.writeFileSync(file, chunks[i].text);
      files.push(file);
    }
    const outputs: string[] = await Promise.all(files.map(runWorkerProcess));
    const codes: string[] = [];
    const events: string[] = [];
    for (const text of outputs) {
      const part = JSON.parse(text) as { code: string; events: string[] };
      codes.push(part.code);
      for (const event of part.events) events.push(event);
    }
    let prefix = '';
    const sections: string[] = [];
    let needsMemoCache = false;
    for (let i = 0; i < codes.length; i++) {
      const marker = `function ${chunks[i].first}(`;
      const at = codes[i].indexOf(marker);
      if (at < 0) throw new Error(`chunk ${i}: ${marker} not found`);
      if (i === 0) prefix = codes[i].slice(0, at);
      if (codes[i].includes('react/compiler-runtime')) needsMemoCache = true;
      // (each chunk numbers its generated _temp functions from 0: keep them
      // apart across the merged program)
      const section = codes[i].slice(at).replace(/\b_temp(\d*)\b/g, (_m, n: string) => `_temp${n}__tn${i}`).trimEnd();
      sections.push(section);
    }
    // (chunk 0 may not need the memo cache import when a later one does)
    if (needsMemoCache && !prefix.includes('react/compiler-runtime')) {
      prefix = `import { c as _c } from "react/compiler-runtime";\n${prefix}`;
    }
    return [prefix + sections.join('\n'), ...events].join('\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const workerMode = process.argv.includes('--worker');
const fileArgs = process.argv.slice(1).filter((a) => !a.startsWith('--'));
const file = workerMode ? fileArgs[fileArgs.length - 1] : process.argv[2];
const source = file ? fs.readFileSync(file, 'utf-8') : DEMO;
const filename = file ?? 'demo.jsx';

function printError(e: unknown): void {
  // (an error the compiler or the parser throws, as a comment: the same
  // under both runtimes)
  const message = e instanceof CompilerError ? e.withPrintedMessage(source, { eslint: false }).message : (e as Error).message;
  console.log(`// compile error: ${message}`);
  // TN_DEBUG_ERRORS=1 surfaces the thrown value and its stack (a pass
  // failure whose message is empty prints as `undefined` otherwise)
  if (process.env.TN_DEBUG_ERRORS) {
    console.log(`// debug: typeof=${typeof e} string=${String(e)}`);
    const stack = (e as Error)?.stack;
    if (stack) console.log(stack);
  }
  process.exitCode = 1;
}

if (workerMode) {
  try {
    console.log(JSON.stringify(compileParts(source, filename)));
  } catch (e) {
    printError(e);
  }
} else {
  try {
    // (a worker re-runs this module; under Node it needs the module's path)
    const nodeRuntime = !process.env.TN_NODE_MAIN && /(^|[\\/])node(\.exe)?$/i.test(process.execPath);
    const chunks = process.env.TN_PARALLEL === '0' || nodeRuntime ? undefined : splitSource(source);
    console.log(chunks ? await parallelCompile(source, filename, chunks) : compile(source, filename));
  } catch {
    // (a worker failed: the whole file, compiled in this process)
    try {
      console.log(compile(source, filename));
    } catch (e) {
      printError(e);
    }
  }
}
