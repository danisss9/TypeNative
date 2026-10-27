// Fast parallel conformance runner: each probe runs in its own temp cwd
// (the CLI writes dist/ relative to cwd) so Go builds don't clash.
// Each examples/<name>/main.ts is also built (not run) as `example-<name>`.
// Usage: node scripts/conformance-parallel.mjs [--native] [filter]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const native = process.argv.includes('--native');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';
const compiler = native
  ? [path.join(root, 'native', process.platform === 'win32' ? 'typenative.exe' : 'typenative')]
  : ['node', path.join(root, 'bin', 'cli.js')];
const probes = readdirSync(path.join(root, 'conformance'))
  .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.d.ts') && f.includes(filter))
  .sort();

// A probe whose first line reads `// conformance-skip: win32 (reason)` doesn't run on those platforms
function skipsHere(file) {
  const first = readFileSync(path.join(root, 'conformance', file), 'utf-8').split('\n', 1)[0];
  const match = /^\/\/ conformance-skip: ([\w, ]+)/.exec(first);
  return !!match && match[1].split(',').some((p) => p.trim() === process.platform);
}
const skipped = probes.filter(skipsHere);
for (const file of skipped) probes.splice(probes.indexOf(file), 1);

// Extra CLI flags from a first line reading `// conformance-flags: --cover`
function probeFlags(file) {
  const first = readFileSync(path.join(root, 'conformance', file), 'utf-8').split('\n', 1)[0];
  const match = /^\/\/ conformance-flags: (.+)/.exec(first);
  return match ? match[1].trim().split(/\s+/) : [];
}

// Examples are long-running or take arguments, so they're only type-checked and built
const examples = readdirSync(path.join(root, 'examples'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(root, 'examples', d.name, 'main.ts')))
  .map((d) => `example-${d.name}`)
  .filter((name) => name.includes(filter))
  .sort();
const exe = process.platform === 'win32' ? 'example.exe' : 'example';

const jobs = [
  ...probes.map((file) => ({
    name: file.replace(/\.tsx?$/, ''),
    args: ['--source', path.join(root, 'conformance', file), '--script', ...probeFlags(file)]
  })),
  ...examples.map((name) => ({
    name,
    args: ['--source', path.join(root, 'examples', name.slice('example-'.length), 'main.ts'), '--output', exe]
  }))
];

// Each probe is a Go build; two per core keeps them busy while others type-check or run
const N = Math.min(8, Math.max(2, os.availableParallelism() * 2));
let idx = 0;
let done = 0;
const failures = [];

// Kills a probe with everything it started: the compiler runs the probe's
// binary, which may spawn workers or children of its own. Killing only the
// compiler would leave those running (a runaway probe then starves the rest).
function killTree(p) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(p.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-p.pid, 'SIGKILL');
  } catch { /* the group is already gone */ }
}

function runOne({ name, args: jobArgs }) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'conf-'));
  return new Promise((resolve) => {
    const [command, ...args] = compiler;
    // Its own process group (POSIX) so a timeout can kill the whole group
    const p = spawn(command, [...args, ...jobArgs], {
      cwd: dir,
      detached: process.platform !== 'win32'
    });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    const t = setTimeout(() => killTree(p), 90000);
    p.on('close', (code) => {
      clearTimeout(t);
      // Anything the probe left running in its group goes too
      if (process.platform !== 'win32') killTree(p);
      if (code !== 0) {
        const line =
          out
            .split('\n')
            .find((l) => /\.go:\d+|panic:|Unsupported syntax|Error|error TS\d+|assert/.test(l))
            ?.trim() ?? `exit ${code}`;
        failures.push({ name, reason: line.slice(0, 160) });
      }
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch { /* Windows may briefly lock native.exe; leave tmp dir */ }
      done++;
      if (done % 10 === 0 || done === jobs.length) process.stdout.write(`\r${done}/${jobs.length}`);
      resolve();
    });
  });
}

async function worker() {
  while (idx < jobs.length) {
    const job = jobs[idx++];
    await runOne(job);
  }
}

// Build one sqlite probe alone first: the vendored driver is ~5 MB of Go, and
// with a cold cache every sqlite probe would compile it at once (timing out
// on small runners); afterwards the rest reuse the cached build
const warm = jobs.find((j) => j.name.includes('sqlite'));
if (warm) {
  jobs.splice(jobs.indexOf(warm), 1);
  jobs.unshift(warm);
  idx = 1;
  await runOne(warm);
}
await Promise.all(Array.from({ length: N }, worker));
console.log('');
failures.sort((a, b) => (a.name < b.name ? -1 : 1));
for (const f of failures) console.log(`  ✘ ${f.name}: ${f.reason}`);
const failed = new Set(failures.map((f) => f.name));
const cats = new Map();
for (const { name } of jobs) {
  const cat = name.split('-')[0];
  const s = cats.get(cat) ?? { passed: 0, total: 0 };
  s.total++;
  if (!failed.has(name)) s.passed++;
  cats.set(cat, s);
}
let tot = 0;
for (const [c, s] of cats) {
  tot += s.passed;
  console.log(`  ${c.padEnd(10)} ${s.passed}/${s.total} (${Math.round((s.passed / s.total) * 100)}%)`);
}
console.log(`  ${'total'.padEnd(10)} ${tot}/${jobs.length} (${Math.round((tot / jobs.length) * 100)}%)`);
if (skipped.length > 0) console.log(`  skipped on ${process.platform}: ${skipped.join(', ')}`);
if (tot < jobs.length) process.exit(1);
