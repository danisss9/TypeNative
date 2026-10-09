// Conformance runner: runs every probe in conformance/ through TypeNative and
// prints the pass rate per category (syntax / semantics / lib) plus the failures.
// Usage: node scripts/conformance.mjs [--native] [filter]
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const native = process.argv.includes('--native');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';
const compiler = native
  ? [path.join(root, 'native', process.platform === 'win32' ? 'typenative.exe' : 'typenative')]
  : ['node', path.join(root, 'bin', 'cli.js')];

const probes = readdirSync(path.join(root, 'conformance'))
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && f.includes(filter))
  .sort();

const categories = new Map();
const failures = [];
for (const file of probes) {
  const name = file.replace(/\.ts$/, '');
  const category = name.split('-')[0];
  const [command, ...args] = compiler;
  const result = spawnSync(command, [...args, '--source', path.join('conformance', file), '--script'], {
    cwd: root,
    encoding: 'utf-8',
    timeout: 60000
  });
  const passed = result.status === 0;
  const stats = categories.get(category) ?? { passed: 0, total: 0 };
  stats.total++;
  if (passed) stats.passed++;
  categories.set(category, stats);
  if (!passed) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n');
    const reason =
      output.find((l) => /\.go:\d+|panic:|Unsupported syntax|Error/.test(l))?.trim() ??
      (result.error ? 'timeout' : 'failed');
    failures.push(`  ✘ ${name}: ${reason.slice(0, 120)}`);
  }
}

console.log(failures.join('\n'));
console.log('');
let passedTotal = 0;
for (const [category, { passed, total }] of categories) {
  passedTotal += passed;
  console.log(`  ${category.padEnd(10)} ${passed}/${total} (${Math.round((passed / total) * 100)}%)`);
}
console.log(`  ${'total'.padEnd(10)} ${passedTotal}/${probes.length} (${Math.round((passedTotal / probes.length) * 100)}%)`);

if (passedTotal < probes.length) process.exit(1);
