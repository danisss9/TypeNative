// Byte-for-byte parity check: Node.js vs the TypeNative build of the
// MongoDB driver CLI (`mongodb` 7.9.1 + `bson` 7.3.4).
//
// Builds the Node.js runnable cache via `run-node.mjs --build`, compiles
// `main.ts` to a single native binary via TypeNative (`../../bin/cli.js`),
// launches the local TCP OP_MSG / OP_QUERY mock server (`mock/server.mjs`),
// and asserts that stdout, stderr, and exit codes match byte-for-byte across
// BSON/EJSON round-trips, live wire-protocol operations, and error paths.
//
// Usage:  node parity.mjs [filter]

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNode } from './run-node.mjs';
import { startMockMongoServer } from './mock/server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cli = path.join(repoRoot, 'bin', 'cli.js');
const cache = path.join(here, '.cache');
const exePath = path.join(cache, process.platform === 'win32' ? 'mongodb-driver.exe' : 'mongodb-driver');
const nodeRunner = path.join(here, 'run-node.mjs');
const filter = process.argv[2] ?? '';

function execAsync(command, args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: here, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (d) => stdout.push(d));
    child.stderr.on('data', (d) => stderr.push(d));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code: timedOut ? 'TIMEOUT' : (signal ?? code),
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
}

// 1. Build Node cache & compile native binary
fs.mkdirSync(cache, { recursive: true });
console.log('Building Node.js driver cache...');
buildNode();

console.log('Compiling main.ts with TypeNative...');
const build = spawnSync(
  process.execPath,
  [cli, '--source', path.join(here, 'main.ts'), '--output', exePath],
  { cwd: here, stdio: 'inherit' }
);
if (build.status !== 0) {
  console.error('TypeNative compilation failed');
  process.exit(build.status ?? 1);
}

// 2. Start local TCP OP_MSG / OP_QUERY mock server
const server = await startMockMongoServer();

try {
  const cases = [
    {
      name: 'help',
      nodeArgs: ['--help'],
      nativeArgs: ['--help'],
      checkStderrExact: true,
    },
    {
      name: 'bson-roundtrip',
      nodeArgs: ['bson-roundtrip'],
      nativeArgs: ['bson-roundtrip'],
      checkStderrExact: true,
    },
    {
      name: 'bson-bench-500',
      nodeArgs: ['bson-bench', '500'],
      nativeArgs: ['bson-bench', '500'],
      checkStderrExact: true,
    },
    {
      name: 'wire-ping',
      nodeArgs: ['ping', server.uri],
      nativeArgs: ['ping', server.uri],
      checkStderrExact: true,
    },
    {
      name: 'wire-crud',
      nodeArgs: ['crud', server.uri, 'parity_node', 'users'],
      nativeArgs: ['crud', server.uri, 'parity_native', 'users'],
      checkStderrExact: true,
    },
    {
      name: 'wire-insert-ejson',
      nodeArgs: [
        'insert', server.uri, 'parity_node', 'orders',
        '{"_id":{"$oid":"65f0a1b2c3d4e5f600000101"},"sku":"widget-a","qty":5,"createdAt":{"$date":"2025-03-15T12:34:56.789Z"},"meta":{"tier":"gold","tags":["fast","native"]}}'
      ],
      nativeArgs: [
        'insert', server.uri, 'parity_native', 'orders',
        '{"_id":{"$oid":"65f0a1b2c3d4e5f600000101"},"sku":"widget-a","qty":5,"createdAt":{"$date":"2025-03-15T12:34:56.789Z"},"meta":{"tier":"gold","tags":["fast","native"]}}'
      ],
      checkStderrExact: true,
    },
    {
      name: 'wire-insert-second',
      nodeArgs: [
        'insert', server.uri, 'parity_node', 'orders',
        '{"_id":{"$oid":"65f0a1b2c3d4e5f600000102"},"sku":"widget-b","qty":12,"meta":{"tier":"silver"}}'
      ],
      nativeArgs: [
        'insert', server.uri, 'parity_native', 'orders',
        '{"_id":{"$oid":"65f0a1b2c3d4e5f600000102"},"sku":"widget-b","qty":12,"meta":{"tier":"silver"}}'
      ],
      checkStderrExact: true,
    },
    {
      name: 'wire-query-filtered',
      nodeArgs: ['query', server.uri, 'parity_node', 'orders', '{"sku":"widget-a"}'],
      nativeArgs: ['query', server.uri, 'parity_native', 'orders', '{"sku":"widget-a"}'],
      checkStderrExact: true,
    },
    {
      name: 'wire-query-all',
      nodeArgs: ['query', server.uri, 'parity_node', 'orders', '{}'],
      nativeArgs: ['query', server.uri, 'parity_native', 'orders', '{}'],
      checkStderrExact: true,
    },
    {
      name: 'wire-query-empty',
      nodeArgs: ['query', server.uri, 'parity_node', 'nonexistent', '{}'],
      nativeArgs: ['query', server.uri, 'parity_native', 'nonexistent', '{}'],
      checkStderrExact: true,
    },
    {
      name: 'wire-bench-50',
      nodeArgs: ['bench-wire', server.uri, '50'],
      nativeArgs: ['bench-wire', server.uri, '50'],
      checkStderrExact: true,
    },
    {
      name: 'error-unknown-command',
      nodeArgs: ['not-a-command'],
      nativeArgs: ['not-a-command'],
      checkStderrExact: true,
    },
    {
      name: 'error-missing-uri',
      nodeArgs: ['ping'],
      nativeArgs: ['ping'],
      expectNonZero: true,
    },
  ].filter((c) => !filter || c.name.includes(filter));

  let passed = 0;
  const failed = [];

  for (const c of cases) {
    const nodeRes = await execAsync(process.execPath, [nodeRunner, ...c.nodeArgs]);
    const nativeRes = await execAsync(exePath, c.nativeArgs);

    let ok;
    if (c.expectNonZero) {
      ok = nodeRes.code !== 0 && nativeRes.code !== 0 && nodeRes.stdout.equals(nativeRes.stdout);
    } else {
      ok =
        nodeRes.code === nativeRes.code &&
        nodeRes.stdout.equals(nativeRes.stdout) &&
        (!c.checkStderrExact || nodeRes.stderr.equals(nativeRes.stderr));
    }

    if (ok) {
      passed++;
      console.log(`  PASS  ${c.name} (${nativeRes.stdout.length} bytes stdout, exit ${nativeRes.code})`);
    } else {
      failed.push({ c, nodeRes, nativeRes });
      console.error(`  FAIL  ${c.name}`);
      console.error(`    node   exit=${nodeRes.code} stdout=${JSON.stringify(nodeRes.stdout.toString())} stderr=${JSON.stringify(nodeRes.stderr.toString())}`);
      console.error(`    native exit=${nativeRes.code} stdout=${JSON.stringify(nativeRes.stdout.toString())} stderr=${JSON.stringify(nativeRes.stderr.toString())}`);
    }
  }

  console.log(`\n${passed}/${cases.length} parity cases matched byte-for-byte.`);
  if (failed.length > 0) process.exit(1);
} finally {
  await server.close();
}
