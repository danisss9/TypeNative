// Disk-scan benchmark: Node.js vs TypeNative for the duplicate finder.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), generates a fixture tree in a temp directory
// (2,000 files in 40 folders, 1 KiB - 256 KiB, a quarter of them duplicates,
// plus same-size files with different content), then times complete process
// runs of both runtimes over it and checks that the two reports match.
//
// Usage:  node bench.mjs [runs=10]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const runs = Number(process.argv[2] ?? '10') || 10;
const exeName = process.platform === 'win32' ? 'dupes.exe' : 'dupes';
const exePath = path.join(here, 'dist', exeName);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dupes-bench-'));
const fixture = path.join(tmpDir, 'tree');

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(11);
}

// Deterministic pseudo-random bytes, so every run scans the same tree
function makeFixture() {
  let seed = 42;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  const originals = [];
  let bytes = 0;
  for (let i = 0; i < 2000; i++) {
    const dir = path.join(fixture, `dir-${i % 40}`, `sub-${i % 7}`);
    fs.mkdirSync(dir, { recursive: true });
    let content;
    if (i % 4 === 3 && originals.length > 0) {
      // An exact copy of an earlier file
      content = originals[Math.floor(rand() * originals.length)];
    } else if (i % 4 === 2 && originals.length > 0) {
      // Same size as an earlier file, different bytes: hashed, but not a duplicate
      const twin = originals[Math.floor(rand() * originals.length)];
      content = Buffer.from(twin);
      content[content.length - 1] ^= 0xff;
    } else {
      content = Buffer.alloc(1024 + 4 * Math.floor(rand() * 255 * 256));
      for (let j = 0; j < content.length; j += 4) content.writeUInt32LE(Math.floor(rand() * 0xffffffff), j);
      originals.push(content);
    }
    fs.writeFileSync(path.join(dir, `file-${i}.bin`), content);
    bytes += content.length;
  }
  return bytes;
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

// 1. Compile the finder to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Build the fixture tree.
const fixtureBytes = makeFixture();
console.log(`\nFixture: 2000 files, ${(fixtureBytes / 1024 / 1024).toFixed(1)} MiB in ${fixture}`);

// 3. Time full runs of both runtimes (the first run of each also warms the OS file cache).
const nodeReport = path.join(tmpDir, 'node.json');
const nativeReport = path.join(tmpDir, 'native.json');
timeRuns(process.execPath, ['main.ts', fixture, nodeReport]);
console.log(`\nTiming ${runs} full process runs of each runtime...\n`);
const nodeStats = timeRuns(process.execPath, ['main.ts', fixture, nodeReport]);
const nativeStats = timeRuns(exePath, [fixture, nativeReport]);

const same = fs.readFileSync(nodeReport, 'utf8') === fs.readFileSync(nativeReport, 'utf8');
const report = JSON.parse(fs.readFileSync(nativeReport, 'utf8'));
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`Scan + hash + report, ${runs} runs (full process: spawn -> exit):\n`);
console.log('| Runtime    | min         | median      | mean        | max         |');
console.log('|------------|-------------|-------------|-------------|-------------|');
console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
console.log(
  `\nBoth found ${report.groups.length} duplicate groups (${report.hashedFiles} files hashed, ` +
    `${(report.wastedBytes / 1024 / 1024).toFixed(1)} MiB wasted); reports identical: ${same}`
);
console.log(`TypeNative is ${(nodeStats.median / nativeStats.median).toFixed(1)}x faster (median).`);
if (!same) process.exit(1);
