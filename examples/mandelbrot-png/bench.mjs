// Render benchmark: Node.js vs TypeNative for the Mandelbrot PNG renderer.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then times complete process runs (spawn to
// exit) of both runtimes rendering the same image, and checks that the two
// PNGs decode to identical pixels. (The compressed bytes differ: Node uses
// zlib's deflate and TypeNative Go's compress/flate.)
//
// Usage:  node bench.mjs [width=1920] [height=1080] [runs=10]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const width = process.argv[2] ?? '1920';
const height = process.argv[3] ?? '1080';
const runs = Number(process.argv[4] ?? '10') || 10;
const exeName = process.platform === 'win32' ? 'mandelbrot.exe' : 'mandelbrot';
const exePath = path.join(here, 'dist', exeName);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mandelbrot-bench-'));

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(11);
}

// Inflated IDAT data (the raw scanlines), after checking every chunk's CRC
function decodePixels(file) {
  const png = fs.readFileSync(file);
  const idat = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    const typeAndData = png.subarray(offset + 4, offset + 8 + length);
    if (zlib.crc32(typeAndData) !== png.readUInt32BE(offset + 8 + length)) throw new Error(`bad CRC in ${file}`);
    if (typeAndData.toString('latin1', 0, 4) === 'IDAT') idat.push(typeAndData.subarray(4));
    offset += 12 + length;
  }
  return zlib.inflateSync(Buffer.concat(idat));
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

// 1. Compile the renderer to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Time full renders under both runtimes.
const nodePng = path.join(tmpDir, 'node.png');
const nativePng = path.join(tmpDir, 'native.png');
console.log(`\nTiming ${runs} full process runs of each runtime at ${width}x${height}...\n`);
const nodeStats = timeRuns(process.execPath, ['main.ts', width, height, nodePng]);
const nativeStats = timeRuns(exePath, [width, height, nativePng]);

const nodePixels = decodePixels(nodePng);
const same = nodePixels.equals(decodePixels(nativePng));
const sizes = [fs.statSync(nodePng).size, fs.statSync(nativePng).size];
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`Render + PNG encode + write, ${runs} runs (full process: spawn -> exit):\n`);
console.log('| Runtime    | min         | median      | mean        | max         |');
console.log('|------------|-------------|-------------|-------------|-------------|');
console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
console.log(`\nPNG sizes: Node ${sizes[0]} B, TypeNative ${sizes[1]} B; decoded pixels identical: ${same}`);
console.log(`TypeNative is ${(nodeStats.median / nativeStats.median).toFixed(1)}x faster (median).`);
if (!same) process.exit(1);
