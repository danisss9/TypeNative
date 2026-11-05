// Performance runner: builds every probe in performance/ with TypeNative, then
// times it under Node.js and as a native binary, interleaving the two runtimes
// round by round. Each probe times its own hot loop and prints
// `checksum: <x>` and `elapsed: <ms> ms`; the checksums must match.
// --write puts the results table into performance/README.md (only the rows of
// the probes that ran change).
// Usage: node scripts/performance.mjs [filter] [--runs N] [--native] [--write]
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'performance');
const readme = path.join(dir, 'README.md');
const argv = process.argv.slice(2);
const native = argv.includes('--native');
const write = argv.includes('--write');
const runsAt = argv.indexOf('--runs');
const runs = runsAt >= 0 ? Math.max(1, Number(argv[runsAt + 1]) || 7) : 7;
const filter = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--runs') ?? '';
const compiler = native
  ? [path.join(root, 'native', process.platform === 'win32' ? 'typenative.exe' : 'typenative')]
  : [process.execPath, path.join(root, 'bin', 'cli.js')];
const exe = process.platform === 'win32' ? 'probe.exe' : 'probe';

const probes = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && f.includes(filter))
  .sort();
if (probes.length === 0) {
  console.error(`no probe in performance/ matches "${filter}"`);
  process.exit(1);
}

// Line 1 of every probe reads `// perf: <description>`
function describe(file) {
  const first = readFileSync(path.join(dir, file), 'utf-8').split('\n', 1)[0];
  return /^\/\/ perf: (.+)/.exec(first)?.[1].trim() ?? '';
}

function runProbe(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf-8', timeout: 120000 });
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const elapsed = /^elapsed: ([\d.]+) ms/m.exec(out);
  const checksum = /^checksum: (.*)$/m.exec(out);
  if (result.status !== 0 || !elapsed || !checksum) {
    const reason = out.split('\n').find((l) => /panic:|Error|error/.test(l))?.trim() ?? (result.error ? 'timeout' : `exit ${result.status}`);
    return { error: reason.slice(0, 160) };
  }
  return { ms: Number(elapsed[1]), checksum: checksum[1].trim() };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const fmt = (ms) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(1));
const ratio = (nodeMs, nativeMs) => {
  const r = nodeMs / nativeMs;
  return r >= 1 ? `**${r.toFixed(1)}x faster**` : `${(1 / r).toFixed(1)}x slower`;
};

const rows = new Map();
const failures = [];
for (const file of probes) {
  const name = file.replace(/\.ts$/, '');
  process.stdout.write(`${name.padEnd(22)} build`);
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'perf-'));
  const binary = path.join(tmp, exe);
  const [command, ...args] = compiler;
  const build = spawnSync(command, [...args, '--source', path.join('performance', file), '--output', binary], {
    cwd: root,
    encoding: 'utf-8',
    timeout: 300000
  });
  if (build.status !== 0) {
    const out = `${build.stdout ?? ''}${build.stderr ?? ''}`.split('\n');
    const reason = out.find((l) => /\.go:\d+|Unsupported syntax|Error|error TS\d+/.test(l))?.trim() ?? 'build failed';
    failures.push(`  ✘ ${name}: ${reason.slice(0, 160)}`);
    console.log(' ✘');
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    continue;
  }

  // Alternate which runtime goes first so drifting machine load hits both alike
  const nodeMs = [];
  const nativeMs = [];
  let error = null;
  // A pathological probe (seconds per run) stops early once it has used its budget
  const budgetMs = 15000;
  for (let round = 0; round < runs && !error && nativeMs.reduce((a, b) => a + b, 0) < budgetMs; round++) {
    process.stdout.write(round === 0 ? ' run ' : '.');
    const order = round % 2 === 0 ? ['node', 'native'] : ['native', 'node'];
    const result = {};
    for (const which of order) {
      result[which] = which === 'node' ? runProbe(process.execPath, [path.join('performance', file)]) : runProbe(binary, []);
    }
    if (result.node.error) error = `node: ${result.node.error}`;
    else if (result.native.error) error = `native: ${result.native.error}`;
    else if (result.node.checksum !== result.native.checksum)
      error = `checksum mismatch: node ${result.node.checksum}, native ${result.native.checksum}`;
    else {
      nodeMs.push(result.node.ms);
      nativeMs.push(result.native.ms);
    }
  }
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch { /* Windows may briefly lock the binary; leave the tmp dir */ }
  if (error) {
    failures.push(`  ✘ ${name}: ${error}`);
    console.log(' ✘');
    continue;
  }
  const row = { name, description: describe(file), node: nodeMs, native: nativeMs };
  rows.set(name, row);
  console.log(` node ${fmt(median(nodeMs))} ms, native ${fmt(median(nativeMs))} ms`);
}

function tableRow({ name, description, node, native: nat }) {
  const n = `${fmt(Math.min(...node))} / ${fmt(median(node))}`;
  const t = `${fmt(Math.min(...nat))} / ${fmt(median(nat))}${nat.length < runs ? ` (${nat.length} run${nat.length > 1 ? 's' : ''})` : ''}`;
  return `| [${name}](${name}.ts) | ${description} | ${n} | ${t} | ${ratio(median(node), median(nat))} |`;
}

const header = [
  '| Probe | Measures | Node ms (min / median) | TypeNative ms (min / median) | TypeNative vs Node (median) |',
  '| ----- | -------- | ---------------------: | ---------------------------: | :-------------------------- |'
];
const lines = [...rows.values()].map(tableRow);
console.log('');
if (lines.length > 0) console.log([...header, ...lines].join('\n'));
if (failures.length > 0) console.log(`\n${failures.join('\n')}`);

if (write && rows.size > 0) {
  const START = '<!-- perf-results:start -->';
  const END = '<!-- perf-results:end -->';
  const text = readFileSync(readme, 'utf-8');
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a < 0 || b < a) {
    console.error(`performance/README.md has no ${START} … ${END} region`);
    process.exit(1);
  }
  // Keep the rows of probes that didn't run this time (a filter or a failure)
  const kept = new Map();
  for (const line of text.slice(a, b).split('\n')) {
    const m = /^\| \[([\w-]+)\]/.exec(line);
    if (m) kept.set(m[1], line);
  }
  for (const row of rows.values()) kept.set(row.name, tableRow(row));
  // …but drop rows of probes that were deleted
  const all = new Set(readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, '')));
  const body = [...kept.entries()]
    .filter(([name]) => all.has(name))
    .sort(([x], [y]) => (x < y ? -1 : 1))
    .map(([, line]) => line);

  const go = spawnSync('go', ['version'], { encoding: 'utf-8' }).stdout?.trim().replace(/^go version /, '') ?? 'go ?';
  const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8')).version;
  const env =
    `Last run ${new Date().toISOString().slice(0, 10)}${filter ? ` (only \`${filter}\` probes updated)` : ''}: ` +
    `${os.type()} ${os.release()}, ${os.cpus()[0]?.model.trim() ?? 'unknown CPU'}, Node ${process.version}, ` +
    `${go}, TypeNative ${version}${native ? ' (self-hosted compiler)' : ''}, ${runs} interleaved runs per probe.`;
  const region = [START, '', env, '', ...header, ...body, '', END].join('\n');
  writeFileSync(readme, text.slice(0, a) + region + text.slice(b + END.length));
  console.log(`\nwrote ${body.length} rows to performance/README.md`);
}

if (failures.length > 0) process.exit(1);
