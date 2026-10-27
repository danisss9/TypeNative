// Launch + memory benchmark: Node.js vs TypeNative for the notes app.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then for each runtime, repeatedly:
//   1. starts the app headless (--no-open) on a free port, over a temp notes
//      folder holding 200 notes,
//   2. measures the time from spawn until GET / answers 200 (what the user
//      waits for before the window can paint),
//   3. lists the notes, opens 20 of them and saves one (warm-up), then reads
//      the app's own resident memory (RSS) from /api/info,
//   4. stops it.
//
// Usage:  node bench.mjs [runs=10]

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const runs = Number(process.argv[2] ?? '10') || 10;
const exeName = process.platform === 'win32' ? 'notes.exe' : 'notes';
const exePath = path.join(here, 'dist', exeName);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-bench-'));

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

const fmt = (n, unit) => `${n.toFixed(unit === 'ms' ? 2 : 1)} ${unit}`.padStart(11);

function freePort() {
  return new Promise((resolve) => {
    const server = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor200(url, deadline) {
  while (performance.now() < deadline) {
    try {
      const res = await fetch(url);
      await res.arrayBuffer();
      if (res.status === 200) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 2));
  }
  throw new Error(`no answer from ${url}`);
}

async function measure(command, args, notesDir) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const t0 = performance.now();
  const child = spawn(command, [...args, '--no-open', '--port', String(port), '--dir', notesDir], { cwd: here, stdio: 'ignore' });
  try {
    await waitFor200(`${base}/`, t0 + 10000);
    const ready = performance.now() - t0;
    const notes = await (await fetch(`${base}/api/notes`)).json();
    for (const note of notes.slice(0, 20)) await (await fetch(`${base}/api/notes/${encodeURIComponent(note.name)}`)).text();
    await fetch(`${base}/api/notes/Bench`, { method: 'PUT', body: 'saved by bench.mjs\n'.repeat(100) });
    const info = await (await fetch(`${base}/api/info`)).json();
    return { ready, rssMiB: info.rss / 1024 / 1024 };
  } finally {
    child.kill();
  }
}

// 1. Compile the app to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. A notes folder per runtime, 200 notes of a few KiB each.
const dirs = { node: path.join(tmpDir, 'node'), native: path.join(tmpDir, 'native') };
for (const dir of Object.values(dirs)) {
  fs.mkdirSync(dir);
  for (let i = 0; i < 200; i++) {
    fs.writeFileSync(path.join(dir, `Note ${i}.md`), `# Note ${i}\n\n` + `Line of text for note ${i}.\n`.repeat(100));
  }
}

// 3. Alternate runtimes so background load affects both alike.
console.log(`\nStarting each runtime ${runs} times...\n`);
const results = { node: [], native: [] };
for (let i = 0; i < runs; i++) {
  results.node.push(await measure(process.execPath, ['main.ts'], dirs.node));
  results.native.push(await measure(exePath, [], dirs.native));
}
fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

const table = (title, key, unit) => {
  console.log(`${title}, ${runs} runs:\n`);
  console.log('| Runtime    | min         | median      | mean        | max         |');
  console.log('|------------|-------------|-------------|-------------|-------------|');
  for (const [label, name] of [['Node.js   ', 'node'], ['TypeNative', 'native']]) {
    const s = stats(results[name].map((r) => r[key]));
    console.log(`| ${label} |${fmt(s.min, unit)} |${fmt(s.median, unit)} |${fmt(s.mean, unit)} |${fmt(s.max, unit)} |`);
  }
  const ratio = stats(results.node.map((r) => r[key])).median / stats(results.native.map((r) => r[key])).median;
  console.log(`\nTypeNative: ${ratio.toFixed(1)}x ${key === 'ready' ? 'faster' : 'less memory'} (median).\n`);
};
table('Spawn until GET / answers 200', 'ready', 'ms');
table('Resident memory after listing, opening 20 notes and saving one', 'rssMiB', 'MiB');
const size = fs.statSync(exePath).size / 1024 / 1024;
console.log(`Native binary: ${size.toFixed(1)} MiB, the whole app (UI included).`);
