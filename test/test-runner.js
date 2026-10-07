#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

if (process.argv.length < 3) {
  console.error('Usage: node test-runner.js <test-folder>');
  process.exit(1);
}

let passed = 0;
let failed = 0;

for (const file of readdirSync(process.argv[2])) {
  if (!file.endsWith('.spec.ts')) continue;

  const name = file.replace('.spec.ts', '');
  const result = spawnSync(
    'node',
    ['./bin/cli.js', '--source', path.join(process.argv[2], file), '--script'],
    { timeout: 30000, stdio: 'ignore' }
  );
  if (result.status === 0) {
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    passed++;
  } else {
    console.log(`  \x1b[31m✘\x1b[0m ${name}`);
    failed++;
  }
}

console.log(`\n  ${passed} passing, ${failed} failing\n`);

if (failed > 0) {
  process.exit(1);
}
