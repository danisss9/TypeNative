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
// The client is built to stay out of the way, like wrk or autocannon: worker
// threads (8 x 2 connections) send prebuilt request bytes over raw keep-alive
// sockets and read each response only far enough to find its end. A plain
// node:http client tops out at ~8-11k req/s on its own here, which would
// measure the client rather than the servers.
//
// Usage:  node bench.mjs [gets=20000] [posts=10000]

import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const WORKERS = 8;
const CONNECTIONS_PER_WORKER = 2;
const CONCURRENCY = WORKERS * CONNECTIONS_PER_WORKER;

// The complete response at the start of buf: { status, length } (null while
// more bytes are needed). Bodies end by Content-Length or chunked encoding.
function parseResponse(buf) {
  const headEnd = buf.indexOf('\r\n\r\n');
  if (headEnd < 0) return null;
  const head = buf.toString('latin1', 0, headEnd);
  const status = Number(head.slice(9, 12));
  const bodyStart = headEnd + 4;
  const contentLength = /\r\ncontent-length:\s*(\d+)/i.exec(head);
  if (contentLength) {
    const end = bodyStart + Number(contentLength[1]);
    return buf.length >= end ? { status, length: end } : null;
  }
  if (/\r\ntransfer-encoding:\s*chunked/i.test(head)) {
    for (let at = bodyStart; ; ) {
      const lineEnd = buf.indexOf('\r\n', at);
      if (lineEnd < 0) return null;
      const size = parseInt(buf.toString('latin1', at, lineEnd), 16);
      const next = lineEnd + 2 + size + 2;
      if (buf.length < next) return null;
      if (size === 0) return { status, length: next };
      at = next;
    }
  }
  return { status, length: bodyStart };
}

// A keep-alive connection with one request in flight at a time;
// send(bytes) resolves with the response status
function connect(host, port) {
  return new Promise((resolve, reject) => {
    let buffered = Buffer.alloc(0);
    let pending = null;
    const socket = net.connect(port, host, () => resolve(connection));
    socket.setNoDelay(true);
    const connection = {
      send: (bytes) =>
        new Promise((onStatus, onError) => {
          pending = { onStatus, onError };
          socket.write(bytes);
        }),
      close: () => socket.destroy(),
    };
    socket.on('data', (chunk) => {
      buffered = buffered.length > 0 ? Buffer.concat([buffered, chunk]) : chunk;
      const response = parseResponse(buffered);
      if (response && pending) {
        buffered = buffered.subarray(response.length);
        const { onStatus } = pending;
        pending = null;
        onStatus(response.status);
      }
    });
    socket.on('error', (err) => (pending ? pending.onError(err) : reject(err)));
  });
}

// Worker thread: sends its share of one phase's requests over its own
// connections, then returns each request's latency
async function runWorker({ base, method, reqPath, body, total }) {
  const target = new URL(base);
  const request = Buffer.from(
    `${method} ${reqPath} HTTP/1.1\r\nHost: ${target.host}\r\n` +
      (body ? `Content-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n` : '') +
      `\r\n${body ?? ''}`
  );
  const latencies = new Float64Array(total);
  let dispatched = 0;
  const connections = await Promise.all(
    Array.from({ length: CONNECTIONS_PER_WORKER }, () => connect(target.hostname, Number(target.port)))
  );

  // Wait for the go signal so every worker starts at once
  await new Promise((resolve) => parentPort.once('message', resolve));
  await Promise.all(
    connections.map(async (connection) => {
      for (;;) {
        const index = dispatched;
        dispatched += 1;
        if (index >= total) return;
        const start = performance.now();
        const status = await connection.send(request);
        latencies[index] = performance.now() - start;
        if (status !== 200 && status !== 201) throw new Error(`${method} ${reqPath} -> ${status}`);
      }
    })
  );
  for (const connection of connections) connection.close();
  parentPort.postMessage(latencies, [latencies.buffer]);
}

if (!isMainThread) {
  parentPort.postMessage('ready');
  await runWorker(workerData);
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const GET_REQUESTS = Number(process.argv[2] ?? '20000') || 20000;
const POST_REQUESTS = Number(process.argv[3] ?? '10000') || 10000;
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

// One load phase spread over the worker threads; returns req/s and latencies.
async function benchPhase(base, { method, reqPath, body, total }) {
  const workers = Array.from({ length: WORKERS }, (_, i) => {
    const share = Math.floor(total / WORKERS) + (i < total % WORKERS ? 1 : 0);
    return new Worker(fileURLToPath(import.meta.url), {
      workerData: { base, method, reqPath, body, total: share },
    });
  });
  const finished = workers.map(
    (worker) =>
      new Promise((resolve, reject) => {
        worker.on('message', (message) => {
          if (message !== 'ready') resolve(message);
        });
        worker.on('error', reject);
      })
  );
  await Promise.all(
    workers.map((worker) => new Promise((resolve) => worker.once('message', resolve)))
  );

  const t0 = performance.now();
  for (const worker of workers) worker.postMessage('go');
  const results = await Promise.all(finished);
  const elapsedSec = (performance.now() - t0) / 1000;

  const sorted = results.flatMap((latencies) => Array.from(latencies)).sort((a, b) => a - b);
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
