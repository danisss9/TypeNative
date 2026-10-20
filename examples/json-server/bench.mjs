// HTTP throughput benchmark: Node.js vs TypeNative for the JSON server.
//
// Compiles main.ts to a native binary with the TypeNative CLI from this repo
// checkout (../../bin/cli.js), then runs the full comparison:
//
//   1. starts the server under Node.js, seeds 50 todos, drives load, stops it
//   2. starts the compiled binary, seeds 50 todos, drives load, stops it
//
// Load is two phases per runtime, over keep-alive connections at concurrency
// 16, measuring req/s plus p50/p99 latency per request:
//   - GET  /todos   20,000 requests (a ~50-item JSON list per response)
//   - POST /todos   10,000 requests (create a todo)
//
// Usage:  node bench.mjs [gets=20000] [posts=10000]

import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const GET_REQUESTS = Number(process.argv[2] ?? '20000') || 20000;
const POST_REQUESTS = Number(process.argv[3] ?? '10000') || 10000;
const CONCURRENCY = 16;
const SEEDED = 50;
const exeName = process.platform === 'win32' ? 'server.exe' : 'server';
const exePath = path.join(here, 'dist', exeName);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Starts a server (node main.ts or the native binary) and resolves with its
// port once it prints its "listening on ..." banner and answers requests.
async function startServer(label, command, args) {
  const child = spawn(command, args, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: no port banner, output:\n${stdout}`)), 20000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const match = stdout.match(/listening on http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`${label}: server exited early (code ${code}):\n${stdout}`));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`${base}/todos`);
      if (res.ok) return { child, base };
    } catch {
      // not accepting connections yet
    }
    await sleep(100);
  }
  child.kill();
  throw new Error(`${label}: server never became ready`);
}

async function seed(base) {
  for (let i = 0; i < SEEDED; i++) {
    const res = await fetch(`${base}/todos`, { method: 'POST', body: JSON.stringify({ title: `task ${i + 1}` }) });
    if (res.status !== 201) throw new Error(`seed request failed with status ${res.status}`);
  }
}

// One load phase over keep-alive connections; returns req/s and latencies.
async function benchPhase(base, { method, reqPath, body, total }) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY });
  const latencies = new Float64Array(total);
  let dispatched = 0;
  const target = new URL(base);
  const headers = body
    ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
    : {};

  const request = () =>
    new Promise((resolve, reject) => {
      const req = http.request(
        { host: target.hostname, port: target.port, method, path: reqPath, agent, headers },
        (res) => {
          res.resume();
          res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) resolve();
            else reject(new Error(`${method} ${reqPath} -> ${res.statusCode}`));
          });
        }
      );
      req.on('error', reject);
      req.end(body);
    });

  const t0 = performance.now();
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const index = dispatched;
      dispatched += 1;
      if (index >= total) return;
      const start = performance.now();
      await request();
      latencies[index] = performance.now() - start;
    }
  });
  await Promise.all(workers);
  const elapsedSec = (performance.now() - t0) / 1000;
  agent.destroy();

  const sorted = Array.from(latencies).sort((a, b) => a - b);
  return {
    rps: total / elapsedSec,
    p50: sorted[Math.floor(total * 0.5)],
    p99: sorted[Math.min(total - 1, Math.floor(total * 0.99))],
  };
}

async function measure(label, command, args) {
  console.log(`\nBenchmarking ${label}...`);
  const { child, base } = await startServer(label, command, args);
  try {
    await seed(base);
    const get = await benchPhase(base, { method: 'GET', reqPath: '/todos', total: GET_REQUESTS });
    console.log(`  GET  /todos  ${GET_REQUESTS.toLocaleString()} req -> ${get.rps.toFixed(0)} req/s`);
    const post = await benchPhase(base, {
      method: 'POST',
      reqPath: '/todos',
      body: JSON.stringify({ title: 'bench item' }),
      total: POST_REQUESTS,
    });
    console.log(`  POST /todos  ${POST_REQUESTS.toLocaleString()} req -> ${post.rps.toFixed(0)} req/s`);
    return { get, post };
  } finally {
    child.kill();
  }
}

function row(label, phase, result) {
  return `| ${label.padEnd(10)} | ${phase.padEnd(13)} | ${result.rps.toFixed(0).padStart(9)} | ${result.p50.toFixed(2).padStart(8)} | ${result.p99.toFixed(2).padStart(8)} |`;
}

// 1. Compile the server to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Load-test both runtimes.
const nodeStats = await measure('Node.js', process.execPath, ['main.ts']);
const nativeStats = await measure('TypeNative', exePath, []);

// 3. Report.
console.log(`\nThroughput (keep-alive, concurrency ${CONCURRENCY}, ${SEEDED} todos seeded):\n`);
console.log('| Runtime    | Endpoint      |   req/s | p50 (ms) | p99 (ms) |');
console.log('|------------|---------------|---------|----------|----------|');
console.log(row('Node.js', 'GET /todos', nodeStats.get));
console.log(row('TypeNative', 'GET /todos', nativeStats.get));
console.log(row('Node.js', 'POST /todos', nodeStats.post));
console.log(row('TypeNative', 'POST /todos', nativeStats.post));
console.log(`\nTypeNative serves ${(nativeStats.get.rps / nodeStats.get.rps).toFixed(1)}x more GET and ${(nativeStats.post.rps / nodeStats.post.rps).toFixed(1)}x more POST requests per second.`);
