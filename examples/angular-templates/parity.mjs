// Parity check: Node.js vs the TypeNative build of the Angular template compiler.
//
// Fetches the component templates of Angular's own compiler compliance tests
// (packages/compiler-cli/test/compliance/test_cases, at a pinned commit) into
// .cache/, compiles main.ts to a native binary with the TypeNative CLI from
// this repo checkout, then compiles every template with both runtimes. stdout,
// stderr and the exit code must match byte for byte. Failures are written to
// .cache/failures/.
//
// The corpus: every external .html template, and every inline `template:`
// string literal (backtick strings with `${…}` substitutions and concatenated
// strings are left out: their text is only known when the test file runs).
//
// Usage:  node parity.mjs [filter]     (filter: a substring of a case id)

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const upstream = path.join(cache, 'angular-src');
const COMMIT = '939171c6f92eb9e7401afa142a343aff4f3ff859';
const TEST_CASES = 'packages/compiler-cli/test/compliance/test_cases';
const casesDir = path.join(upstream, TEST_CASES);
const inputsDir = path.join(cache, 'templates');
const failuresDir = path.join(cache, 'failures');
const exePath = path.join(cache, process.platform === 'win32' ? 'ng-compile.exe' : 'ng-compile');
const filter = process.argv[2] ?? '';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(1);
  }
}

// The compliance test cases at the pinned commit (a sparse, blobless fetch)
function fetchCases() {
  if (fs.existsSync(casesDir)) return;
  fs.mkdirSync(upstream, { recursive: true });
  console.log(`Fetching angular/angular ${COMMIT.slice(0, 7)} ${TEST_CASES} ...`);
  const git = (...args) => run('git', ['-C', upstream, ...args]);
  git('init', '--quiet');
  git('remote', 'add', 'origin', 'https://github.com/angular/angular.git');
  git('sparse-checkout', 'set', TEST_CASES);
  git('fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', COMMIT);
  git('checkout', '--quiet', 'FETCH_HEAD');
}

// A JS string literal's body with its escapes resolved
function unescape(body) {
  return body.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|.)/g, (_, c) => {
    if (c[0] === 'u') return String.fromCodePoint(parseInt(c[1] === '{' ? c.slice(2, -1) : c.slice(1), 16));
    if (c[0] === 'x') return String.fromCharCode(parseInt(c.slice(1), 16));
    if (c === '\n' || c === '\r\n') return '';
    return { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' }[c] ?? c;
  });
}

// The `template:` string literals of a test file
function inlineTemplates(file) {
  const src = fs.readFileSync(file, 'utf8');
  const found = [];
  const re = /\btemplate:\s*/g;
  while (re.exec(src)) {
    const start = re.lastIndex;
    const quote = src[start];
    if (quote !== '`' && quote !== "'" && quote !== '"') continue;
    let end = start + 1;
    let substitution = false;
    while (end < src.length && src[end] !== quote) {
      if (src[end] === '\\') end++;
      else if (quote === '`' && src[end] === '$' && src[end + 1] === '{') substitution = true;
      end++;
    }
    if (substitution || src.slice(end + 1).trimStart().startsWith('+')) continue;
    found.push(unescape(src.slice(start + 1, end)));
  }
  return found;
}

function listCases() {
  const cases = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      const id = path.relative(casesDir, file).split(path.sep).join('/');
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) cases.push({ id, template: fs.readFileSync(file, 'utf8') });
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !entry.name.includes('golden')) {
        inlineTemplates(file).forEach((template, index) => cases.push({ id: `${id}#${index}`, template }));
      }
    }
  };
  walk(casesDir);
  return cases;
}

function spawnCollect(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: here });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: signal ? signal : code });
    });
  });
}

fetchCases();
const cases = listCases().filter((c) => c.id.includes(filter));
console.log(`Compiling main.ts with TypeNative ...`);
run(process.execPath, [cli, '--source', path.join(here, 'main.ts'), '--output', exePath], { cwd: repoRoot });
run(process.execPath, [path.join(here, 'run-node.mjs'), '--build'], { cwd: here });

fs.rmSync(failuresDir, { recursive: true, force: true });
fs.rmSync(inputsDir, { recursive: true, force: true });
fs.mkdirSync(failuresDir, { recursive: true });
fs.mkdirSync(inputsDir, { recursive: true });

let passed = 0;
let next = 0;
const failed = [];
async function worker() {
  while (next < cases.length) {
    const index = next++;
    const { id, template } = cases[index];
    const input = path.join(inputsDir, `${index}.html`);
    fs.writeFileSync(input, template);
    const [node, native] = await Promise.all([
      spawnCollect(process.execPath, [path.join(here, 'run-node.mjs'), input]),
      spawnCollect(exePath, [input])
    ]);
    if (node.stdout === native.stdout && node.stderr === native.stderr && node.code === native.code) {
      passed++;
      continue;
    }
    failed.push(id);
    const report = (name, r) => `--- ${name} (exit ${r.code})\n${r.stdout}${r.stderr ? `--- ${name} stderr\n${r.stderr}` : ''}`;
    fs.writeFileSync(path.join(failuresDir, `${index}.txt`), `${id}\n--- template\n${template}\n${report('node', node)}${report('native', native)}`);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Math.min(8, os.availableParallelism() - 1)) }, worker));

for (const id of failed.sort()) console.log(`FAIL ${id}`);
console.log(`${passed}/${cases.length} templates match (${((100 * passed) / Math.max(1, cases.length)).toFixed(2)}%)`);
process.exitCode = failed.length > 0 ? 1 : 0;
