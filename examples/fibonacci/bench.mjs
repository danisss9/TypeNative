// CPU benchmark: Node.js vs TypeNative for the fibonacci program.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then runs the same program under both runtimes.
// Each run reports two numbers:
//   - compute time: parsed from the program's own `computed in X ms` output
//     (measured inside the program with process.hrtime.bigint)
//   - total wall time: process spawn to exit, measured here
//
// Usage:  node bench.mjs [n=35] [runs=15]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const n = Number(process.argv[2] ?? '35') || 35;
const runs = Number(process.argv[3] ?? '15') || 15;
const exeName = process.platform === 'win32' ? 'fib.exe' : 'fib';
const exePath = path.join(here, 'dist', exeName);

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(12);
}

function runOnce(command, args) {
  const t0 = performance.now();
  const result = spawnSync(command, args, { cwd: here, encoding: 'utf8' });
  const wall = performance.now() - t0;
  if (result.status !== 0) {
    console.error(`run failed: ${command} ${args.join(' ')}\n${result.stderr}`);
    process.exit(1);
  }
  const match = result.stdout.match(/computed in ([\d.]+) ms/);
  if (!match) {
    console.error(`unexpected output:\n${result.stdout}`);
    process.exit(1);
  }
  return { wall, compute: Number(match[1]) };
}

function measure(command, args) {
  const walls = [];
  const computes = [];
  for (let i = 0; i < runs; i++) {
    const sample = runOnce(command, args);
    walls.push(sample.wall);
    computes.push(sample.compute);
  }
  return { wall: stats(walls), compute: stats(computes) };
}

// 1. Compile fibonacci to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Run fib(n) under both runtimes.
console.log(`\nComputing fib(${n}) ${runs} times per runtime...\n`);
const nodeStats = measure(process.execPath, ['main.ts', String(n)]);
const nativeStats = measure(exePath, [String(n)]);

console.log(`Compute time, fib(${n}) over ${runs} runs (measured in-program):\n`);
console.log('| Runtime    | min          | median       | mean         | max          |');
console.log('|------------|--------------|--------------|--------------|--------------|');
console.log(`| Node.js    |${fmt(nodeStats.compute.min)} |${fmt(nodeStats.compute.median)} |${fmt(nodeStats.compute.mean)} |${fmt(nodeStats.compute.max)} |`);
console.log(`| TypeNative |${fmt(nativeStats.compute.min)} |${fmt(nativeStats.compute.median)} |${fmt(nativeStats.compute.mean)} |${fmt(nativeStats.compute.max)} |`);
console.log(`\nTypeNative computes ${(nodeStats.compute.median / nativeStats.compute.median).toFixed(1)}x faster (median).\n`);

console.log(`Total wall time per run incl. startup (spawn -> exit):\n`);
console.log('| Runtime    | min          | median       | mean         | max          |');
console.log('|------------|--------------|--------------|--------------|--------------|');
console.log(`| Node.js    |${fmt(nodeStats.wall.min)} |${fmt(nodeStats.wall.median)} |${fmt(nodeStats.wall.mean)} |${fmt(nodeStats.wall.max)} |`);
console.log(`| TypeNative |${fmt(nativeStats.wall.min)} |${fmt(nativeStats.wall.median)} |${fmt(nativeStats.wall.mean)} |${fmt(nativeStats.wall.max)} |`);
