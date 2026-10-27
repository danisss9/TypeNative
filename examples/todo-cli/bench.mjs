// Per-command latency benchmark: Node.js vs TypeNative for the todo CLI.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then times complete process runs (spawn to
// exit) of `todo list` and `todo add` against a 50-item list in a temp file.
// Each command does a little file I/O and JSON work, so this measures what a
// user waits for on every invocation: startup plus a small amount of real work.
//
// Usage:  node bench.mjs [runs=30]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const runs = Number(process.argv[2] ?? '30') || 30;
const exeName = process.platform === 'win32' ? 'todo.exe' : 'todo';
const exePath = path.join(here, 'dist', exeName);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-bench-'));

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(11);
}

// A fresh 50-item list for each runtime, so `add` runs grow both the same way
function seed(file) {
  const items = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    text: `Task number ${i + 1}`,
    done: i % 3 === 0,
    created: new Date(0).toISOString(),
  }));
  fs.writeFileSync(file, JSON.stringify({ nextId: 51, items }, null, 2));
}

function timeRuns(command, args, file) {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const result = spawnSync(command, args, { cwd: here, encoding: 'utf8', env: { ...process.env, TODO_FILE: file } });
    const elapsed = performance.now() - t0;
    if (result.status !== 0) {
      console.error(`run failed: ${command} ${args.join(' ')}\n${result.stderr}`);
      process.exit(1);
    }
    samples.push(elapsed);
  }
  return stats(samples);
}

// 1. Compile the CLI to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Time `list` and `add` under both runtimes, each on its own list file.
const nodeFile = path.join(tmpDir, 'node.json');
const nativeFile = path.join(tmpDir, 'native.json');
seed(nodeFile);
seed(nativeFile);
console.log(`\nTiming ${runs} full process runs of each command...\n`);
const results = [
  ['list', timeRuns(process.execPath, ['main.ts', 'list'], nodeFile), timeRuns(exePath, ['list'], nativeFile)],
  ['add', timeRuns(process.execPath, ['main.ts', 'add', 'Bench item'], nodeFile), timeRuns(exePath, ['add', 'Bench item'], nativeFile)],
];
fs.rmSync(tmpDir, { recursive: true, force: true });

for (const [command, nodeStats, nativeStats] of results) {
  console.log(`\`todo ${command}\`, ${runs} runs (full process: spawn -> exit):\n`);
  console.log('| Runtime    | min         | median      | mean        | max         |');
  console.log('|------------|-------------|-------------|-------------|-------------|');
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
  console.log(`\nTypeNative is ${(nodeStats.median / nativeStats.median).toFixed(1)}x faster per call (median).\n`);
}
