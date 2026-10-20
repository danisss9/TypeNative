// Startup benchmark: Node.js vs TypeNative for the hello-world program.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then times complete process runs (spawn to
// exit) of the same program under both runtimes. Because the program itself
// does almost no work, this mostly measures runtime startup cost.
//
// Usage:  node bench.mjs [runs=30]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const runs = Number(process.argv[2] ?? '30') || 30;
const exeName = process.platform === 'win32' ? 'hello.exe' : 'hello';
const exePath = path.join(here, 'dist', exeName);

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(11);
}

function timeRuns(command, args) {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const result = spawnSync(command, args, { cwd: here, encoding: 'utf8' });
    const elapsed = performance.now() - t0;
    if (result.status !== 0) {
      console.error(`run failed: ${command} ${args.join(' ')}\n${result.stderr}`);
      process.exit(1);
    }
    samples.push(elapsed);
  }
  return stats(samples);
}

// 1. Compile hello-world to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Time full process runs under both runtimes.
console.log(`\nTiming ${runs} full process runs of each runtime...\n`);
const nodeStats = timeRuns(process.execPath, ['main.ts']);
const nativeStats = timeRuns(exePath, []);

console.log(`Startup time, ${runs} runs (full process: spawn -> exit):\n`);
console.log('| Runtime    | min         | median      | mean        | max         |');
console.log('|------------|-------------|-------------|-------------|-------------|');
console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
console.log(`\nTypeNative starts ${(nodeStats.median / nativeStats.median).toFixed(1)}x faster (median).`);
