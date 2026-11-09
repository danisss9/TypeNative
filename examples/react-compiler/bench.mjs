// Benchmark: Node.js vs TypeNative for the React Compiler, both compiling
// React components and hooks to their auto-memoized form.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then measures:
//   (a) per-call latency: complete process runs (spawn to exit) on the
//       built-in demo (two components with hooks, derived lists, JSX with
//       conditionals, lists and event handlers);
//   (b) scaling: generated component files of growing size (8 to 64 KB by
//       default), each a screen of cards with hooks, derived arrays,
//       conditionals and JSX lists, from a fixed-seed generator, so every
//       machine gets the same input. Under Node the file runs through
//       run-node.mjs (the vendored compiler sources use enums, which Node's
//       type stripping cannot run; the TypeScript compile is cached).
// Runs alternate Node and native, so drift on the machine hits both alike.
// Both runtimes' output must be identical, or the benchmark stops.
//
// Usage:  node bench.mjs [runs=30] [sizeRuns=5] [kilobytes=8,16,32,64]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exePath = path.join(cache, process.platform === 'win32' ? 'react-compile.exe' : 'react-compile');
const bigPath = path.join(cache, 'generated-screen.jsx');
const runs = Number(process.argv[2] ?? '30') || 30;
const sizeRuns = Number(process.argv[3] ?? '5') || 5;
const sizes = (process.argv[4] ?? '8,16,32,64').split(',').map(Number).filter((n) => n > 0);

// Deterministic pseudo-random numbers (a fixed-seed LCG): the same components
// on every run and every machine
let seed = 42;
function rand(n) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return Math.floor(seed / 65536) % n;
}

const WORDS = ['user', 'order', 'item', 'price', 'label', 'status', 'owner', 'total', 'title', 'count', 'tag', 'note'];
const HOOKS = ['useState', 'useReducer', 'useRef'];

function word() {
  return WORDS[rand(WORDS.length)];
}

function card(i) {
  const a = word();
  const b = word();
  const hook = HOOKS[rand(HOOKS.length)];
  const lines = [`function Card${i}({ items, active, onSelect }) {`];
  switch (hook) {
    case 'useState':
      lines.push(`  const [open, setOpen] = useState(false);`);
      break;
    case 'useReducer':
      lines.push(`  const [open, toggle] = useReducer((state) => !state, false);`);
      break;
    default:
      lines.push(`  const ref = useRef(null);`);
  }
  lines.push(`  const total = items.reduce((sum, item) => sum + item.price, 0);`);
  lines.push(`  const visible = items.filter((item) => item.status === active && item.title.includes('${a}'));`);
  if (hook !== 'useRef') {
    lines.push(`  if (items.length === 0) {`, `    return <p className="empty">No ${a} items</p>;`, `  }`);
  }
  lines.push(`  return (`);
  lines.push(`    <section className={open ? "card open" : "card"} ref=${hook === 'useRef' ? '{ref}' : '{undefined}'}>`);
  lines.push(`      <h2 onClick=${hook === 'useReducer' ? '{toggle}' : '{() => setOpen(!open)}'}>{total}</h2>`);
  lines.push(`      <ul>`);
  lines.push(`        {visible.map((item) => (`);
  lines.push(`          <li key={item.id} className={item.status} onClick={() => onSelect(item.id)}>`);
  lines.push(`            {item.title} ({item.${b}})`);
  lines.push(`          </li>`);
  lines.push(`        ))}`);
  lines.push(`      </ul>`);
  lines.push(`      <footer>{visible.length} of {items.length} ${a} items</footer>`);
  lines.push(`    </section>`);
  lines.push(`  );`);
  lines.push(`}`);
  return lines.join('\n');
}

function source(bytes) {
  const out = [`import { useReducer, useRef, useState } from 'react';`, ''];
  let size = 0;
  for (let i = 0; size < bytes; i++) {
    const c = card(i);
    out.push(c);
    size += c.length + 1;
  }
  out.push('export default Card0;', '');
  return out.join('\n');
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(13);
}

function runOnce(command, args) {
  const t0 = performance.now();
  const result = spawnSync(command, args, { cwd: here, maxBuffer: 1 << 30 });
  const elapsed = performance.now() - t0;
  if (result.status !== 0) {
    console.error(`run failed: ${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
    process.exit(1);
  }
  return { elapsed, stdout: result.stdout };
}

// Alternating Node and native runs; the two outputs must match
function timeBoth(args, count) {
  const node = [];
  const native = [];
  for (let i = 0; i < count; i++) {
    const a = runOnce(process.execPath, ['run-node.mjs', ...args]);
    const b = runOnce(exePath, args);
    if (!a.stdout.equals(b.stdout)) {
      console.error('Node and native output differ');
      process.exit(1);
    }
    if (a.stdout.toString().startsWith('// compile error:')) {
      console.error(`the source has errors:\n${a.stdout.toString().slice(0, 2000)}`);
      process.exit(1);
    }
    node.push(a.elapsed);
    native.push(b.elapsed);
  }
  return [stats(node), stats(native)];
}

function table(nodeStats, nativeStats) {
  console.log('| Runtime    | min          | median       | mean         | max          |');
  console.log('|------------|--------------|--------------|--------------|--------------|');
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
}

// 1. Compile the CLI to a native binary.
fs.mkdirSync(cache, { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', exePath], { cwd: here, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
console.log(`Binary: ${(fs.statSync(exePath).size / (1024 * 1024)).toFixed(1)} MB`);

// 2. Warm the Node cache (run-node.mjs compiles main.ts to .cache/node once).
const warm = runOnce(process.execPath, ['run-node.mjs']);
if (warm.stdout.toString().startsWith('// compile error:')) {
  console.error(`the demo has errors:\n${warm.stdout.toString().slice(0, 2000)}`);
  process.exit(1);
}

// 3. Per-call latency on the demo.
console.log(`\n(a) \`react-compile\` (built-in demo), ${runs} runs each (full process: spawn -> exit):\n`);
const [nodeCall, nativeCall] = timeBoth([], runs);
table(nodeCall, nativeCall);
const ratio = nodeCall.median / nativeCall.median;
console.log(`\nTypeNative is ${(ratio >= 1 ? `${ratio.toFixed(1)}x faster` : `${(1 / ratio).toFixed(1)}x slower`)} per call (median).`);

// 4. Scaling on generated component files.
console.log(`\n(b) \`react-compile generated-screen.jsx\`, ${sizeRuns} runs per size (medians):\n`);
console.log('| Source            | Node.js      | TypeNative   | TypeNative vs Node |');
console.log('|-------------------|--------------|--------------|--------------------|');
for (const size of sizes) {
  seed = 42;
  const big = source(size * 1024);
  fs.writeFileSync(bigPath, big);
  const [nodeBig, nativeBig] = timeBoth([bigPath], sizeRuns);
  const ratioBig = nodeBig.median / nativeBig.median;
  const label = `${(big.length / 1024).toFixed(0)} KB, ${big.split('\n').length} lines`.padEnd(17);
  console.log(`| ${label} |${fmt(nodeBig.median)} |${fmt(nativeBig.median)} | ${(ratioBig >= 1 ? `${ratioBig.toFixed(1)}x faster` : `${(1 / ratioBig).toFixed(1)}x slower`).padEnd(18)} |`);
}
