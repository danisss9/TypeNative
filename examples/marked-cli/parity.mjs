// Parity check: Node.js vs the TypeNative build of the marked CLI.
//
// Fetches marked's own spec suites at the vendored tag (v18.1.2) into .cache/,
// compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout, then feeds every case's markdown on stdin to both, in each mode:
// default (GFM), --no-gfm and --tokens (the lexer's token list as JSON). A
// case's front matter (gfm / pedantic / breaks) becomes CLI flags, as marked's
// test runner turns it into options. stdout, stderr and the exit code must
// match byte for byte (stack frames aside: see withoutStackFrames). Failures
// are written to .cache/failures/.
//
// Usage:  node parity.mjs [filter]     (filter: a case id substring or a mode)

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const upstream = path.join(cache, 'marked');
const specs = path.join(upstream, 'test', 'specs');
const failuresDir = path.join(cache, 'failures');
const exePath = path.join(cache, process.platform === 'win32' ? 'marked.exe' : 'marked');
const filter = process.argv[2] ?? '';
const MODES = [
  { name: 'default', args: [] },
  { name: 'no-gfm', args: ['--no-gfm'] },
  { name: 'tokens', args: ['--tokens'] }
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(1);
  }
}

// The corpus: marked's spec suites (test/specs) at the vendored tag
function fetchSpecs() {
  if (fs.existsSync(path.join(specs, 'commonmark'))) return;
  fs.mkdirSync(cache, { recursive: true });
  console.log('Fetching marked v18.1.2 test/specs ...');
  run('git', ['clone', '--quiet', '--depth', '1', '--branch', 'v18.1.2', '--filter=blob:none', '--sparse', 'https://github.com/markedjs/marked.git', upstream]);
  run('git', ['-C', upstream, 'sparse-checkout', 'set', 'test/specs']);
}

// Front matter (---\nkey: value\n---\n) as CLI flags; the rest is the markdown
function frontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) return { markdown: text, args: [] };
  const args = [];
  for (const line of match[1].split(/\r?\n/)) {
    const [key, value] = line.split(':').map((s) => s.trim());
    if (!['gfm', 'pedantic', 'breaks'].includes(key)) continue;
    args.push(value === 'false' ? `--no-${key}` : `--${key}`);
  }
  return { markdown: text.slice(match[0].length), args };
}

function listInputs() {
  const inputs = [];
  for (const [dir, file] of [['commonmark', 'commonmark.0.31.2.json'], ['gfm', 'gfm.0.29.json']]) {
    for (const c of JSON.parse(fs.readFileSync(path.join(specs, dir, file), 'utf8'))) {
      inputs.push({ id: `${dir}-${c.example}`, markdown: c.markdown, args: [] });
    }
  }
  for (const dir of ['new', 'original', 'redos']) {
    for (const name of fs.readdirSync(path.join(specs, dir)).sort()) {
      const file = path.join(specs, dir, name);
      if (name.endsWith('.md')) {
        inputs.push({ id: `${dir}-${name.slice(0, -3)}`, ...frontMatter(fs.readFileSync(file, 'utf8')) });
      } else if (name.endsWith('.cjs')) {
        // module.exports = { markdown: `…`, html: `…` }: evaluated with
        // nothing but a module object in scope
        const sandbox = { module: { exports: {} } };
        vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 5000 });
        const { markdown } = sandbox.module.exports;
        inputs.push({ id: `${dir}-${name.slice(0, -4)}`, markdown: String(markdown), args: [] });
      }
    }
  }
  return inputs;
}

function exec(command, args, input) {
  return new Promise((resolve) => {
    const p = spawn(command, args, { cwd: here, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    p.stdout.on('data', (d) => stdout.push(d));
    p.stderr.on('data', (d) => stderr.push(d));
    const timer = setTimeout(() => p.kill('SIGKILL'), 10000);
    p.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code: signal ? signal : code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    });
    p.stdin.on('error', () => {});
    p.stdin.end(input);
  });
}

// Node prints an error's stack ("    at …" lines, the frames of the JS call
// stack); a native binary has no JS frames to show. The frames are dropped
// (an inspected error's own properties, which follow the last frame as " {",
// stay where they are); warnings' process ids differ too
function withoutStackFrames(buffer) {
  const out = [];
  for (const line of buffer.toString().split('\n')) {
    if (/^ {4}at /.test(line)) {
      if (line.endsWith(' {')) out[out.length - 1] += ' {';
      continue;
    }
    // (and process warnings name the process id)
    out.push(line.replace(/^\(node:\d+\) /, '(node) '));
  }
  return Buffer.from(out.join('\n'));
}

function sameOutput(a, b) {
  return a.code === b.code && a.stdout.equals(b.stdout) && withoutStackFrames(a.stderr).equals(withoutStackFrames(b.stderr));
}

function report(failure) {
  const { id, mode, input, args, node, native } = failure;
  const text = [
    `# ${id} (${mode}: ${args.join(' ')})`,
    '## input',
    input.toString(),
    `## node (exit ${node.code})`,
    '### stdout', node.stdout.toString(), '### stderr', node.stderr.toString(),
    `## native (exit ${native.code})`,
    '### stdout', native.stdout.toString(), '### stderr', native.stderr.toString()
  ].join('\n');
  fs.writeFileSync(path.join(failuresDir, `${id}-${mode}.txt`), text);
}

fetchSpecs();
console.log('Compiling main.ts ...');
run(process.execPath, [cli, '--source', path.join(here, 'main.ts'), '--output', exePath], { cwd: here });

const cases = [];
for (const input of listInputs()) {
  for (const mode of MODES) {
    if (filter && !input.id.includes(filter) && mode.name !== filter) continue;
    cases.push({ ...input, mode, allArgs: [...input.args, ...mode.args] });
  }
}
fs.rmSync(failuresDir, { recursive: true, force: true });
fs.mkdirSync(failuresDir, { recursive: true });

let next = 0;
let passed = 0;
const failed = [];
async function worker() {
  while (next < cases.length) {
    const c = cases[next++];
    const input = Buffer.from(c.markdown);
    const [node, native] = await Promise.all([
      exec(process.execPath, [path.join(here, 'main.ts'), ...c.allArgs], input),
      exec(exePath, c.allArgs, input)
    ]);
    if (sameOutput(node, native)) passed++;
    else {
      failed.push(`${c.id} (${c.mode.name})`);
      report({ id: c.id, mode: c.mode.name, input, args: c.allArgs, node, native });
    }
  }
}
const workers = Math.max(2, Math.min(16, os.availableParallelism()));
await Promise.all(Array.from({ length: workers }, () => worker()));

const rate = cases.length ? ((100 * passed) / cases.length).toFixed(2) : '100.00';
console.log(`\n${passed}/${cases.length} cases match (${rate}%)`);
if (failed.length > 0) {
  console.log(`${failed.length} failures (details in .cache/failures/):`);
  for (const f of failed.slice(0, 40)) console.log(`  ${f}`);
  if (failed.length > 40) console.log(`  … and ${failed.length - 40} more`);
  process.exitCode = 1;
}
