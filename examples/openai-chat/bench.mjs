// One-shot latency benchmark: Node.js vs TypeNative for the chat client.
//
// A chat request spends most of its time waiting on the model, so this bench
// measures what a client actually adds: process startup, opening the HTTPS
// connection, and parsing the SSE stream as it arrives. A local mock server
// (plain node:http) stands in for the API: it answers POST
// /v1/chat/completions with a deterministic event stream of ~45 chunks sent
// with pauses between them, exactly the shape OpenRouter and OpenAI return.
//
// First both runtimes answer the same question once and their stdout is
// compared byte for byte (parity). Then N full process runs (spawn to exit)
// of the one-shot client are timed against the mock.
//
// Usage:  node bench.mjs [runs=30]

import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const runs = Number(process.argv[2] ?? '30') || 30;
const exeName = process.platform === 'win32' ? 'openai-chat.exe' : 'openai-chat';
const exePath = path.join(here, 'dist', exeName);

// The deterministic answer the mock streams, one chunk per word
const words = [
  'Server-sent', 'events', 'are', 'just', 'a', 'long', 'HTTP', 'response:', 'the', 'server',
  'keeps', 'the', 'connection', 'open', 'and', 'writes', '"data:"', 'lines', 'separated', 'by',
  'blank', 'lines.', 'A', 'chat', 'client', 'reads', 'each', 'event', 'as', 'it', 'arrives,',
  'pulls', 'the', 'text', 'delta', 'out', 'of', 'its', 'JSON,', 'and', 'prints', 'it', 'immediately.',
];
const expectedAnswer = words.join(' ');
const expectedUsage = { prompt_tokens: 11, completion_tokens: words.length, total_tokens: 11 + words.length };

const chunkJson = (delta, extra = {}) =>
  JSON.stringify({
    id: 'chatcmpl-bench',
    object: 'chat.completion.chunk',
    created: 1700000000,
    model: 'bench-model',
    choices: [{ index: 0, delta, finish_reason: null }],
    ...extra,
  });

function startMockServer() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'not found' } }));
      return;
    }
    if (req.headers.authorization !== 'Bearer bench-key') {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid API key' } }));
      return;
    }
    req.resume();
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    // The keep-alive comment real providers send while the model warms up
    res.write(': OPENROUTER PROCESSING\n\n');
    const events = [
      `data: ${chunkJson({ role: 'assistant' })}\n\n`,
      ...words.map((word, i) => `data: ${chunkJson({ content: word + (i < words.length - 1 ? ' ' : '') })}\n\n`),
      `data: ${chunkJson({}, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: expectedUsage })}\n\n`,
      'data: [DONE]\n\n',
    ];
    let i = 0;
    const tick = () => {
      if (i < events.length) {
        res.write(events[i++]);
        setTimeout(tick, 4);
      } else {
        res.end();
      }
    };
    tick();
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], mean, max: sorted[sorted.length - 1] };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(11);
}

// Async spawn on purpose: the mock API lives in this process's event loop,
// and spawnSync would block the loop so the server could never answer.
function oneShot(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: here,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, OPENROUTER_API_KEY: '', OPENAI_API_KEY: '' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('exit', (code) => resolve({ status: code, stdout, stderr }));
  });
}

// 1. Compile the client to a native binary.
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
console.log('Compiling main.ts to a native binary with TypeNative...');
const build = spawnSync(process.execPath, [cli, '--source', 'main.ts', '--output', path.join('dist', exeName)], {
  cwd: here,
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);

// 2. Start the mock API and check both runtimes produce identical output.
const server = await startMockServer();
const port = server.address().port;
const mockBase = `http://127.0.0.1:${port}/v1`;
const question = 'What are server-sent events?';
const args = ['--api-key', 'bench-key', '--base-url', mockBase, question];

try {
  console.log('\nChecking parity (same question, byte-for-byte stdout)...');
  const nodeRun = await oneShot(process.execPath, ['main.ts', ...args]);
  const nativeRun = await oneShot(exePath, args);
  for (const [name, run] of [['Node.js', nodeRun], ['TypeNative', nativeRun]]) {
    if (run.status !== 0) {
      console.error(`${name} run failed (exit ${run.status}):\n${run.stderr}`);
      process.exit(1);
    }
    if (run.stdout !== `${expectedAnswer}\n`) {
      console.error(`${name} stdout does not match the expected answer:\n"${run.stdout}"`);
      process.exit(1);
    }
  }
  console.log('parity: Node.js and TypeNative stdout identical, matches the streamed answer.');

  // 3. Time full one-shot runs (spawn -> exit) under both runtimes.
  console.log(`\nTiming ${runs} full one-shot runs of each runtime...\n`);
  const timeRuns = async (command, argv) => {
    const samples = [];
    for (let i = 0; i < runs + 2; i++) {
      const t0 = performance.now();
      const result = await oneShot(command, argv);
      const elapsed = performance.now() - t0;
      if (result.status !== 0) {
        console.error(`run failed: ${command} ${argv.join(' ')}\n${result.stderr}`);
        process.exit(1);
      }
      if (i >= 2) samples.push(elapsed); // first two are warmup
    }
    return stats(samples);
  };
  const nodeStats = await timeRuns(process.execPath, ['main.ts', ...args]);
  const nativeStats = await timeRuns(exePath, args);

  console.log(`\`openai-chat "<question>"\` against a local SSE server, ${runs} runs (full process: spawn -> exit):\n`);
  console.log('| Runtime    | min         | median      | mean        | max         |');
  console.log('|------------|-------------|-------------|-------------|-------------|');
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |`);
  console.log(`\nTypeNative is ${(nodeStats.median / nativeStats.median).toFixed(1)}x faster per answer (median).\n`);
} finally {
  server.close();
}
