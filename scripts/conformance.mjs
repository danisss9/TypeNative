// Conformance runner: runs every probe in conformance/ through TypeNative and
// prints the pass rate per category (syntax / semantics / lib) plus the failures.
// Usage: node scripts/conformance.mjs [--native] [filter]
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const native = process.argv.includes('--native');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';
const compiler = native
  ? [path.join(root, 'native', process.platform === 'win32' ? 'typenative.exe' : 'typenative')]
  : ['node', path.join(root, 'bin', 'cli.js')];

const probes = readdirSync(path.join(root, 'conformance'))
  .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.d.ts') && f.includes(filter))
  .sort();

// A probe whose first line reads `// conformance-skip: win32 (reason)` doesn't run on those platforms
function skipsHere(file) {
  const first = readFileSync(path.join(root, 'conformance', file), 'utf-8').split('\n', 1)[0];
  const match = /^\/\/ conformance-skip: ([\w, ]+)/.exec(first);
  return !!match && match[1].split(',').some((p) => p.trim() === process.platform);
}
const skipped = probes.filter(skipsHere);
for (const file of skipped) probes.splice(probes.indexOf(file), 1);

// Extra CLI flags from a first line reading `// conformance-flags: --cover`
function probeFlags(file) {
  const first = readFileSync(path.join(root, 'conformance', file), 'utf-8').split('\n', 1)[0];
  const match = /^\/\/ conformance-flags: (.+)/.exec(first);
  return match ? match[1].trim().split(/\s+/) : [];
}

const categories = new Map();
const failures = [];
for (const file of probes) {
  const name = file.replace(/\.tsx?$/, '');
  const category = name.split('-')[0];
  const [command, ...args] = compiler;
  const result = spawnSync(command, [...args, '--source', path.join('conformance', file), '--script', ...probeFlags(file)], {
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
if (skipped.length > 0) console.log(`  skipped on ${process.platform}: ${skipped.join(', ')}`);

if (passedTotal < probes.length) process.exit(1);
