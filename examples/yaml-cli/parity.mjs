// Parity check: Node.js vs the TypeNative build of the yaml CLI.
//
// Fetches the yaml-test-suite (tag data-2022-01-17) into .cache/, compiles
// main.ts to a native binary with the TypeNative CLI from this repo checkout,
// then feeds every test's in.yaml to both, in each mode: default (re-emit the
// YAML), --json, valid and lex. stdout, stderr and the exit code must match
// byte for byte (stack frames aside: see withoutStackFrames). Failures are
// written to .cache/failures/.
//
// Usage:  node parity.mjs [filter]     (filter: a test id substring or a mode)

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const suite = path.join(cache, 'yaml-test-suite');
const failuresDir = path.join(cache, 'failures');
const exePath = path.join(cache, process.platform === 'win32' ? 'yaml.exe' : 'yaml');
const filter = process.argv[2] ?? '';
const MODES = [
  { name: 'default', args: [] },
  { name: 'json', args: ['--json'] },
  { name: 'valid', args: ['valid'] },
  { name: 'lex', args: ['lex'] }
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(1);
  }
}

// The corpus: yaml-test-suite's data branch, one directory per test (some
// with numbered sub-tests), each with an in.yaml
function fetchSuite() {
  if (fs.existsSync(path.join(suite, '.git')) || fs.existsSync(path.join(suite, '229Q'))) return;
  fs.mkdirSync(cache, { recursive: true });
  console.log('Fetching yaml-test-suite data-2022-01-17 ...');
  run('git', ['clone', '--quiet', '--depth', '1', '--branch', 'data-2022-01-17', 'https://github.com/yaml/yaml-test-suite.git', suite]);
}

function listInputs() {
  const inputs = [];
  const walk = (dir, id) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && entry.name !== '.git') walk(path.join(dir, entry.name), id ? `${id}-${entry.name}` : entry.name);
      else if (entry.name === 'in.yaml') inputs.push({ id, file: path.join(dir, entry.name) });
    }
  };
  walk(suite, '');
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
  const { id, mode, input, node, native } = failure;
  const text = [
    `# ${id} (${mode})`,
    '## input',
    input.toString(),
    `## node (exit ${node.code})`,
    '### stdout', node.stdout.toString(), '### stderr', node.stderr.toString(),
    `## native (exit ${native.code})`,
    '### stdout', native.stdout.toString(), '### stderr', native.stderr.toString()
  ].join('\n');
  fs.writeFileSync(path.join(failuresDir, `${id}-${mode}.txt`), text);
}

fetchSuite();
console.log('Compiling main.ts ...');
run(process.execPath, [cli, '--source', path.join(here, 'main.ts'), '--output', exePath], { cwd: here });

const cases = [];
for (const input of listInputs()) {
  for (const mode of MODES) {
    if (filter && !input.id.includes(filter) && mode.name !== filter) continue;
    cases.push({ ...input, mode });
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
    const input = fs.readFileSync(c.file);
    const [node, native] = await Promise.all([
      exec(process.execPath, [path.join(here, 'main.ts'), ...c.mode.args], input),
      exec(exePath, c.mode.args, input)
    ]);
    if (sameOutput(node, native)) passed++;
    else {
      failed.push(`${c.id} (${c.mode.name})`);
      report({ id: c.id, mode: c.mode.name, input, node, native });
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
