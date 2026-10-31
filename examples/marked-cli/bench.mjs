// Benchmark: Node.js vs TypeNative for the marked CLI, both rendering
// markdown to HTML (`marked < in.md`).
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then measures:
//   (a) per-call latency: complete process runs (spawn to exit) on marked's
//       own README.md, the kind of file a docs build or a hook renders once;
//   (b) throughput: one run on about 10 MB of generated markdown (headings,
//       paragraphs with emphasis, links and code spans, lists, tables, code
//       fences and block quotes).
// Runs alternate Node and native, so drift on the machine hits both alike.
// Both runtimes' HTML must be identical, or the benchmark stops.
//
// Usage:  node bench.mjs [runs=30] [throughputRuns=5] [megabytes=10]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const upstream = path.join(cache, 'marked-src');
const exePath = path.join(cache, process.platform === 'win32' ? 'marked.exe' : 'marked');
const runs = Number(process.argv[2] ?? '30') || 30;
const throughputRuns = Number(process.argv[3] ?? '5') || 5;
const megabytes = Number(process.argv[4] ?? '10') || 10;

// marked's README.md at the vendored tag (parity.mjs fetches the same checkout)
function readme() {
  const file = path.join(upstream, 'README.md');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(cache, { recursive: true });
    console.log('Fetching marked v18.1.2 ...');
    const clone = spawnSync('git', ['clone', '--quiet', '--depth', '1', '--branch', 'v18.1.2', '--filter=blob:none', '--sparse', 'https://github.com/markedjs/marked.git', upstream], { stdio: 'inherit' });
    if (clone.status !== 0) process.exit(1);
    spawnSync('git', ['-C', upstream, 'sparse-checkout', 'set', 'test/specs'], { stdio: 'inherit' });
  }
  return fs.readFileSync(file);
}

// Deterministic pseudo-random numbers (a fixed-seed LCG): the same document
// on every run and every machine
let seed = 42;
function rand(n) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return Math.floor(seed / 65536) % n;
}

const WORDS = ['markdown', 'parser', 'native', 'binary', 'token', 'lexer', 'render', 'inline', 'block', 'heading',
  'paragraph', 'emphasis', 'table', 'fence', 'quote', 'list', 'link', 'image', 'escape', 'entity', 'spec', 'html'];

function word() {
  return WORDS[rand(WORDS.length)];
}

function sentence() {
  const parts = [];
  const n = 6 + rand(14);
  for (let i = 0; i < n; i++) {
    const w = word();
    switch (rand(12)) {
      case 0: parts.push(`*${w}*`); break;
      case 1: parts.push(`**${w}**`); break;
      case 2: parts.push(`\`${w}()\``); break;
      case 3: parts.push(`[${w}](https://example.com/${w}/${rand(1000)} "${w}")`); break;
      case 4: parts.push(`_${w}_`); break;
      default: parts.push(w);
    }
  }
  return parts.join(' ') + '.';
}

function section(i) {
  const lines = [`${'#'.repeat(1 + rand(3))} ${word()} ${word()} ${i}`, ''];
  for (let p = 0; p < 2 + rand(3); p++) lines.push(`${sentence()} ${sentence()}\n${sentence()}`, '');
  switch (rand(5)) {
    case 0:
      for (let k = 0; k < 3 + rand(5); k++) lines.push(`- ${sentence()}`);
      lines.push('');
      break;
    case 1:
      for (let k = 1; k <= 3 + rand(4); k++) lines.push(`${k}. ${sentence()}`);
      lines.push('');
      break;
    case 2:
      lines.push(`| ${word()} | ${word()} | ${word()} |`, '| --- | :---: | ---: |');
      for (let k = 0; k < 3 + rand(6); k++) lines.push(`| ${word()} | ${rand(1000)} | *${word()}* |`);
      lines.push('');
      break;
    case 3:
      lines.push('```js', `function ${word()}(${word()}) {`, `  return ${rand(100)} < 3 && "${word()}";`, '}', '```', '');
      break;
    default:
      lines.push(`> ${sentence()}`, `> ${sentence()}`, '');
  }
  return lines.join('\n');
}

function document(bytes) {
  const out = [];
  let size = 0;
  for (let i = 0; size < bytes; i++) {
    const s = section(i);
    out.push(s);
    size += s.length + 1;
  }
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

function runOnce(command, args, input) {
  const t0 = performance.now();
  const result = spawnSync(command, args, { cwd: here, input, maxBuffer: 1 << 30 });
  const elapsed = performance.now() - t0;
  if (result.status !== 0) {
    console.error(`run failed: ${command} ${args.join(' ')}\n${result.stderr}`);
    process.exit(1);
  }
  return { elapsed, stdout: result.stdout };
}

// Alternating Node and native runs; the two outputs must match
function timeBoth(input, count) {
  const node = [];
  const native = [];
  for (let i = 0; i < count; i++) {
    const a = runOnce(process.execPath, ['main.ts'], input);
    const b = runOnce(exePath, [], input);
    if (!a.stdout.equals(b.stdout)) {
      console.error('Node and native HTML differ');
      process.exit(1);
    }
    node.push(a.elapsed);
    native.push(b.elapsed);
  }
  return [stats(node), stats(native)];
}

function table(nodeStats, nativeStats, extra = () => '') {
  console.log(`| Runtime    | min          | median       | mean         | max          |${extra('head')}`);
  console.log(`|------------|--------------|--------------|--------------|--------------|${extra('rule')}`);
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |${extra(nodeStats)}`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |${extra(nativeStats)}`);
}

// 1. Compile the CLI to a native binary.
fs.mkdirSync(cache, { recursive: true });
const small = readme();
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', exePath], { cwd: here, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Per-call latency on marked's README.md.
console.log(`\n(a) \`marked < README.md\` (${small.length} bytes), ${runs} runs each (full process: spawn -> exit):\n`);
const [nodeCall, nativeCall] = timeBoth(small, runs);
table(nodeCall, nativeCall);
console.log(`\nTypeNative is ${(nodeCall.median / nativeCall.median).toFixed(1)}x faster per call (median).`);

// 3. Throughput on generated markdown.
const big = Buffer.from(document(megabytes * 1024 * 1024));
const mb = big.length / (1024 * 1024);
console.log(`\n(b) \`marked < generated.md\` (${mb.toFixed(1)} MB, ${big.toString().split('\n').length} lines), ${throughputRuns} runs each:\n`);
const [nodeBig, nativeBig] = timeBoth(big, throughputRuns);
table(nodeBig, nativeBig, (s) => (s === 'head' ? ' MB/s (median) |' : s === 'rule' ? '---------------|' : ` ${(mb / (s.median / 1000)).toFixed(2).padStart(13)} |`));
const ratio = nodeBig.median / nativeBig.median;
console.log(`\nTypeNative is ${ratio >= 1 ? `${ratio.toFixed(1)}x faster` : `${(1 / ratio).toFixed(1)}x slower`} on throughput (median).`);
