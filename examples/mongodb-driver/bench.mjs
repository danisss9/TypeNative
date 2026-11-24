// Benchmark: Node.js vs TypeNative for the official MongoDB driver CLI
// (`mongodb` 7.9.1 + `bson` 7.3.4).
//
// Builds the Node.js runnable cache via `run-node.mjs --build` and compiles
// `main.ts` to a single native binary with TypeNative (`../../bin/cli.js`),
// then measures four workloads with alternating Node.js and TypeNative runs
// (asserting byte-for-byte identical stdout on every run):
//
//   1. Cold-start CLI `ping <uri>` (process spawn -> TCP connect -> OP_QUERY
//      handshake -> OP_MSG ping -> close -> exit)
//   2. End-to-end CLI `crud <uri>` (full insert/find+sort/update/aggregate/
//      count/delete lifecycle over TCP OP_MSG)
//   3. Warm OP_MSG wire-protocol throughput `bench-wire <uri> [ops=500]`
//      (N iterations x 4 OP_MSG round-trips = 4N commands over a pooled socket)
//   4. BSON serialize + deserialize throughput `bson-bench [docs=5000]`
//      (pure CPU BSON encode/decode of nested documents)
//
// Usage:  node bench.mjs [coldRuns=20] [warmRuns=5] [wireOps=500] [bsonDocs=5000]

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNode } from './run-node.mjs';
import { startMockMongoServer } from './mock/server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exeName = process.platform === 'win32' ? 'mongodb-driver.exe' : 'mongodb-driver';
const exePath = path.join(cache, exeName);
const nodeRunner = path.join(here, 'run-node.mjs');

const coldRuns = Number(process.argv[2] ?? '20') || 20;
const warmRuns = Number(process.argv[3] ?? '5') || 5;
const wireOps = Number(process.argv[4] ?? '500') || 500;
const bsonDocs = Number(process.argv[5] ?? '5000') || 5000;

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    mean,
    max: sorted[sorted.length - 1],
  };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`.padStart(12);
}

function runAsync(command, args) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const child = spawn(command, args, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (d) => stdout.push(d));
    child.stderr.on('data', (d) => stderr.push(d));
    child.on('close', (code) => {
      const elapsed = performance.now() - t0;
      if (code !== 0) {
        console.error(`run failed (exit ${code}): ${command} ${args.join(' ')}\n${Buffer.concat(stderr).toString()}`);
        process.exit(1);
      }
      resolve({ elapsed, stdout: Buffer.concat(stdout) });
    });
  });
}

async function timeBoth(nodeArgs, nativeArgs, count, warmup = 2) {
  const node = [];
  const native = [];
  for (let i = 0; i < count + warmup; i++) {
    const a = await runAsync(process.execPath, [nodeRunner, ...nodeArgs]);
    const b = await runAsync(exePath, nativeArgs);
    if (!a.stdout.equals(b.stdout)) {
      console.error('Parity mismatch during benchmark!');
      console.error('Node:  ', a.stdout.toString());
      console.error('Native:', b.stdout.toString());
      process.exit(1);
    }
    if (i >= warmup) {
      node.push(a.elapsed);
      native.push(b.elapsed);
    }
  }
  return [stats(node), stats(native), (await runAsync(exePath, nativeArgs)).stdout.toString().trim()];
}

function printTable(title, nodeStats, nativeStats, extraCol) {
  console.log(`\n=== ${title} ===`);
  const ratio = nodeStats.median / nativeStats.median;
  const extraHead = extraCol ? ` ${extraCol.head.padEnd(14)} |` : '';
  const extraRule = extraCol ? '----------------|' : '';
  const extraVal = (st) => (extraCol ? ` ${extraCol.fmt(st).padStart(14)} |` : '');
  console.log(`| Runtime    | min          | median       | mean         | max          |${extraHead}`);
  console.log(`|------------|--------------|--------------|--------------|--------------|${extraRule}`);
  console.log(`| Node.js    |${fmt(nodeStats.min)} |${fmt(nodeStats.median)} |${fmt(nodeStats.mean)} |${fmt(nodeStats.max)} |${extraVal(nodeStats)}`);
  console.log(`| TypeNative |${fmt(nativeStats.min)} |${fmt(nativeStats.median)} |${fmt(nativeStats.mean)} |${fmt(nativeStats.max)} |${extraVal(nativeStats)}`);
  console.log(`Median ratio (Node / TypeNative): ${ratio.toFixed(2)}x`);
}

// 1. Build both targets
fs.mkdirSync(cache, { recursive: true });
console.log('Building Node.js driver cache...');
buildNode();

console.log('Compiling main.ts to a native binary with TypeNative...');
const buildT0 = performance.now();
const build = spawnSync(
  process.execPath,
  [cli, '--source', path.join(here, 'main.ts'), '--output', exePath],
  { cwd: here, stdio: 'inherit' }
);
if (build.status !== 0) process.exit(build.status ?? 1);
const buildSec = (performance.now() - buildT0) / 1000;
const binSizeMB = fs.statSync(exePath).size / (1024 * 1024);

const goVer = spawnSync('go', ['version'], { encoding: 'utf8' }).stdout?.trim() ?? 'unknown';
const cpu = os.cpus()[0]?.model ?? 'unknown';
console.log(`\nEnvironment: ${os.platform()} ${os.arch()} | ${cpu} (${os.cpus().length} threads)`);
console.log(`Runtimes:    Node.js ${process.version} | ${goVer}`);
console.log(`Binary:      ${exeName} (${binSizeMB.toFixed(2)} MB, compiled in ${buildSec.toFixed(1)} s)`);

// 2. Start local TCP OP_MSG mock server
const server = await startMockMongoServer();

try {
  // Workload 1: Cold-start CLI `ping`
  const [pingNode, pingNative] = await timeBoth(
    ['ping', server.uri],
    ['ping', server.uri],
    coldRuns
  );
  printTable(`Cold-start CLI: ping (${coldRuns} runs, live TCP OP_MSG)`, pingNode, pingNative);

  // Workload 2: End-to-end CLI `crud`
  const [crudNode, crudNative] = await timeBoth(
    ['crud', server.uri, 'bench_node', 'users'],
    ['crud', server.uri, 'bench_native', 'users'],
    coldRuns
  );
  printTable(`End-to-end CLI: crud (${coldRuns} runs, 10 OP_MSG ops/run)`, crudNode, crudNative);

  // Workload 3: Warm OP_MSG wire-protocol throughput (`bench-wire`)
  const totalCmds = wireOps * 4; // insertOne + findOne + updateOne + deleteOne per iteration
  const [wireNode, wireNative] = await timeBoth(
    ['bench-wire', server.uri, String(wireOps)],
    ['bench-wire', server.uri, String(wireOps)],
    warmRuns,
    1
  );
  printTable(
    `Warm OP_MSG throughput: bench-wire ${wireOps} (${totalCmds} commands/run, ${warmRuns} runs)`,
    wireNode,
    wireNative,
    {
      head: 'cmds/s',
      fmt: (st) => `${Math.round(totalCmds / (st.median / 1000)).toLocaleString('en-US')} /s`,
    }
  );

  // Workload 4: Pure CPU BSON serialize + deserialize (`bson-bench`)
  const [bsonNode, bsonNative, bsonOut] = await timeBoth(
    ['bson-bench', String(bsonDocs)],
    ['bson-bench', String(bsonDocs)],
    warmRuns,
    1
  );
  const bsonMeta = JSON.parse(bsonOut);
  const totalMB = bsonMeta.totalBytes / (1024 * 1024);
  printTable(
    `BSON serialize + deserialize: bson-bench ${bsonDocs} (${totalMB.toFixed(2)} MB/run, ${warmRuns} runs)`,
    bsonNode,
    bsonNative,
    {
      head: 'docs/s',
      fmt: (st) => `${Math.round(bsonDocs / (st.median / 1000)).toLocaleString('en-US')} /s`,
    }
  );
} finally {
  await server.close();
}
