// Fast parallel conformance runner: each probe runs in its own temp cwd
// (the CLI writes dist/ relative to cwd) so Go builds don't clash.
// Each examples/<name>/main.ts is also built (not run) as `example-<name>`.
// Usage: node scripts/conformance-parallel.mjs [--native] [filter]
import { fork, spawn, spawnSync } from 'node:child_process';
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

// Examples first (longest-job-first) so multi-second builds overlap with the
// shorter probes instead of leaving a long tail at the end of the run.
const jobs = [
  ...examples.map((name) => ({
    name,
    build: true,
    args: ['--source', path.join(root, 'examples', name.slice('example-'.length), 'main.ts'), '--output', exe]
  })),
  ...probes.map((file) => ({
    name: file.replace(/\.tsx?$/, ''),
    args: ['--source', path.join(root, 'conformance', file), '--script', ...probeFlags(file)]
  }))
];

// One worker per logical core (min 4 for 2-core CI runners, max 16); overridable via CONFORMANCE_JOBS
const N = Number(process.env.CONFORMANCE_JOBS) || Math.min(16, Math.max(4, os.availableParallelism()));
const runStarted = Date.now();
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

function formatFailure(code, timedOut, budget, started, out) {
  if (code === 0 && !timedOut) return null;
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  // The first recognizable error, else the last thing the probe printed
  // (a `go build failed:` toolchain error, a log line): a bare exit code
  // says nothing about where it stopped
  const at = lines.findIndex((l) => /\.go:\d+|panic:|Unsupported syntax|Error|error TS\d+|assert|go build failed/.test(l));
  // A go build failure prints '# command-line-arguments' and an empty
  // line before the first error, so take a few lines: the reason alone
  // would name nothing that failed to compile
  const line =
    at < 0
      ? lines.slice(-2).join(' | ')
      : lines[at] === 'go build failed:'
        ? lines.slice(at, at + 4).join(' ')
        : lines[at];
  // taskkill /f exits the tree with 1, so a timeout on Windows otherwise
  // reads as a plain failure
  const status = timedOut ? `timed out after ${budget / 1000}s` : `exit ${code} after ${Math.round((Date.now() - started) / 1000)}s`;
  return `${status}${line ? `: ${line}` : ''}`.slice(0, 240);
}

function removeTempDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch { /* Windows may briefly lock native.exe; leave tmp dir */ }
}

function runOneSpawn({ name, args: jobArgs }) {
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
    // An example's build is its own program's: the vendored-package ones
    // transpile tens of thousands of lines and go build the result (the same
    // budget the sequential runner gives them); probes get 90s
    const budget = name.startsWith('example-') ? 600000 : 90000;
    const started = Date.now();
    let timedOut = false;
    const t = setTimeout(() => {
      timedOut = true;
      killTree(p);
    }, budget);
    p.on('close', (code) => {
      clearTimeout(t);
      // Anything the probe left running in its group goes too
      if (process.platform !== 'win32') killTree(p);
      const reason = formatFailure(code, timedOut, budget, started, out);
      removeTempDir(dir);
      resolve(reason);
    });
  });
}

// Persistent Node workers for !native: keeps V8, TypeScript, and parsed .d.ts
// files warm across probes instead of paying cold-start on every probe.
const workerPath = path.join(import.meta.dirname, 'conformance-worker.mjs');
const activeWorkers = new Set();
let nextJobId = 1;

function spawnPoolWorker() {
  const w = fork(workerPath, [], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    detached: process.platform !== 'win32'
  });
  activeWorkers.add(w);
  w.on('exit', () => activeWorkers.delete(w));
  return w;
}

function runOnWorker(poolState, job) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'conf-'));
  return new Promise((resolve) => {
    if (!poolState.proc || !poolState.proc.connected) poolState.proc = spawnPoolWorker();
    const w = poolState.proc;
    const id = nextJobId++;
    const budget = job.name.startsWith('example-') ? 600000 : 90000;
    const started = Date.now();
    let timedOut = false;
    let settled = false;

    const finish = (code, out) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      w.off('message', onMsg);
      w.off('exit', onExit);
      const reason = formatFailure(code, timedOut, budget, started, out);
      removeTempDir(dir);
      resolve(reason);
    };

    const onMsg = (msg) => {
      if (msg && msg.id === id) finish(msg.code, msg.out ?? '');
    };
    const onExit = (code) => {
      poolState.proc = null;
      finish(code ?? 1, '');
    };

    const t = setTimeout(() => {
      timedOut = true;
      poolState.proc = null;
      killTree(w);
      finish(1, '');
    }, budget);

    w.on('message', onMsg);
    w.on('exit', onExit);
    w.send({ id, args: job.args, dir, build: !!job.build });
  });
}

const soloPoolState = { proc: null };
function runOne(job, poolState = soloPoolState) {
  return native ? runOneSpawn(job) : runOnWorker(poolState, job);
}

// Wall time per job, for the slowest-jobs summary
const durations = new Map();

// A probe run in the pack; its failure (a reason) or null
async function runCounted(job, poolState = soloPoolState) {
  const started = Date.now();
  const reason = await runOne(job, poolState);
  durations.set(job.name, Date.now() - started);
  if (reason !== null) failures.push({ name: job.name, reason });
  done++;
  if (done % 10 === 0 || done === jobs.length) process.stdout.write(`\r${done}/${jobs.length}`);
}

async function worker() {
  const poolState = { proc: null };
  while (idx < jobs.length) {
    const job = jobs[idx++];
    await runCounted(job, poolState);
  }
  if (poolState.proc) {
    poolState.proc.kill();
    poolState.proc = null;
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
  await runCounted(warm);
}
// The largest example (the React Compiler: ~450 transpiled modules) also runs
// alone before the pack, so its build gets full cores instead of contending
// with N-1 other jobs
const heavy = jobs.find((j) => j.name === 'example-react-compiler');
if (heavy) {
  jobs.splice(jobs.indexOf(heavy), 1);
  jobs.splice(idx, 0, heavy);
  await runCounted(heavy);
  idx++;
}
await Promise.all(Array.from({ length: N }, worker));
console.log('');
// A failure in the pack runs once more, alone: on a small CI runner N
// concurrent go builds can push a probe past its budget, or the toolchain
// can trip over a file another build holds, which says nothing about the
// probe. One that passes alone is reported as flaky with its first failure,
// so a real intermittent bug stays visible; one that fails again counts
const flaky = [];
for (const f of [...failures]) {
  const retry = await runOne(jobs.find((j) => j.name === f.name));
  if (retry === null) {
    flaky.push(f);
    failures.splice(failures.indexOf(f), 1);
  } else {
    f.reason = `${f.reason}; alone: ${retry}`.slice(0, 400);
  }
}
if (soloPoolState.proc) {
  soloPoolState.proc.kill();
  soloPoolState.proc = null;
}
failures.sort((a, b) => (a.name < b.name ? -1 : 1));
flaky.sort((a, b) => (a.name < b.name ? -1 : 1));
for (const f of flaky) console.log(`  ⚠ ${f.name} passed alone after failing in the pack: ${f.reason}`);
for (const f of failures) console.log(`  ✘ ${f.name}: ${f.reason}`);
// GitHub shows annotations on the run page without opening the step's log
if (process.env.GITHUB_ACTIONS) {
  const esc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  for (const f of flaky) console.log(`::warning title=Flaky probe ${f.name}::${esc(f.reason)}`);
  for (const f of failures) console.log(`::error title=Probe ${f.name}::${esc(f.reason)}`);
}
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
// Where the time went: the slowest jobs usually bound the run
const slowest = [...durations].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`  ${(runStarted ? Math.round((Date.now() - runStarted) / 1000) : 0)}s total; slowest: ${slowest.map(([n, ms]) => `${n} ${(ms / 1000).toFixed(1)}s`).join(', ')}`);
if (skipped.length > 0) console.log(`  skipped on ${process.platform}: ${skipped.join(', ')}`);
if (tot < jobs.length) process.exit(1);
