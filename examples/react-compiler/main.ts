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

  const out = [generate(ast, {}, source).code];
  for (const event of events) out.push(describe(event));
  return out.join('\n');
}

const file = process.argv[2];
const source = file ? fs.readFileSync(file, 'utf-8') : DEMO;
const filename = file ?? 'demo.jsx';
try {
  console.log(compile(source, filename));
} catch (e) {
  // (an error the compiler or the parser throws, as a comment: the same
  // under both runtimes)
  const message = e instanceof CompilerError ? e.withPrintedMessage(source, { eslint: false }).message : (e as Error).message;
  console.log(`// compile error: ${message}`);
  process.exitCode = 1;
}
