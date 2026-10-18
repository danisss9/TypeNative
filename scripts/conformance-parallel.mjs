// Fast parallel conformance runner: each probe runs in its own temp cwd
// (the CLI writes dist/ relative to cwd) so Go builds don't clash.
// Usage: node scripts/conformance-parallel.mjs [--native] [filter]
import { spawn } from 'node:child_process';
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const native = process.argv.includes('--native');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '';
const compiler = native
  ? [path.join(root, 'native', process.platform === 'win32' ? 'typenative.exe' : 'typenative')]
  : ['node', path.join(root, 'bin', 'cli.js')];
const probes = readdirSync(path.join(root, 'conformance'))
  .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.d.ts') && f.includes(filter))
  .sort();

// Each probe is a Go build; two per core keeps them busy while others type-check or run
const N = Math.min(8, Math.max(2, os.availableParallelism() * 2));
let idx = 0;
let done = 0;
const failures = [];

function runOne(file) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'conf-'));
  const name = file.replace(/\.tsx?$/, '');
  return new Promise((resolve) => {
    const [command, ...args] = compiler;
    const p = spawn(command, [...args, '--source', path.join(root, 'conformance', file), '--script'], { cwd: dir });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    const t = setTimeout(() => p.kill(), 90000);
    p.on('close', (code) => {
      clearTimeout(t);
      if (code !== 0) {
        const line =
          out
            .split('\n')
            .find((l) => /\.go:\d+|panic:|Unsupported syntax|Error|assert/.test(l))
            ?.trim() ?? `exit ${code}`;
        failures.push({ name, reason: line.slice(0, 160) });
      }
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch { /* Windows may briefly lock native.exe; leave tmp dir */ }
      done++;
      if (done % 10 === 0 || done === probes.length) process.stdout.write(`\r${done}/${probes.length}`);
      resolve();
    });
  });
}

async function worker() {
  while (idx < probes.length) {
    const f = probes[idx++];
    await runOne(f);
  }
}

await Promise.all(Array.from({ length: N }, worker));
console.log('');
failures.sort((a, b) => (a.name < b.name ? -1 : 1));
for (const f of failures) console.log(`  ✘ ${f.name}: ${f.reason}`);
const failed = new Set(failures.map((f) => f.name));
const cats = new Map();
for (const file of probes) {
  const name = file.replace(/\.tsx?$/, '');
  const cat = name.split('-')[0];
  const s = cats.get(cat) ?? { passed: 0, total: 0 };
  s.total++;
  if (!failed.has(name)) s.passed++;
  cats.set(cat, s);
}
let tot = 0;
for (const [c, s] of cats) {
  tot += s.passed;
  console.log(`  ${c.padEnd(10)} ${s.passed}/${s.total} (${Math.round((s.passed / s.total) * 100)}%)`);
}
console.log(`  ${'total'.padEnd(10)} ${tot}/${probes.length} (${Math.round((tot / probes.length) * 100)}%)`);
if (tot < probes.length) process.exit(1);
