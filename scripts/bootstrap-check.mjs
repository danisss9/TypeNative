// Bootstrap fixpoint: the self-hosted compiler (native/typenative, built by
// `npm run build:native`) must turn src/main.ts into the same Go as the Node
// CLI that built it. Both run from the repo root so their file names match.
// Usage: node scripts/bootstrap-check.mjs
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const exe = process.platform === 'win32' ? '.exe' : '';
const out = path.join(root, 'dist', `bootstrap${exe}`);

// Transpiles and builds src/main.ts, returning the generated Go files
function stage(command, args) {
  const result = spawnSync(command, [...args, '--source', 'src/main.ts', '--output', out], {
    cwd: root,
    encoding: 'utf-8'
  });
  if (result.status !== 0) {
    console.error(`${command} failed:\n${result.stdout}${result.stderr}`);
    process.exit(1);
  }
  const files = new Map();
  for (const name of readdirSync(path.join(root, 'dist')).filter((f) => f.endsWith('.go')).sort()) {
    files.set(name, readFileSync(path.join(root, 'dist', name), 'utf-8'));
  }
  return files;
}

const stage1 = stage('node', [path.join(root, 'bin', 'cli.js')]);
const stage2 = stage(path.join(root, 'native', `typenative${exe}`), []);

let differences = 0;
for (const name of new Set([...stage1.keys(), ...stage2.keys()])) {
  const a = stage1.get(name);
  const b = stage2.get(name);
  if (a === b) continue;
  differences++;
  if (a === undefined || b === undefined) {
    console.error(`✘ ${name}: only produced by stage ${a === undefined ? 2 : 1}`);
    continue;
  }
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const line = linesA.findIndex((l, i) => l !== linesB[i]);
  console.error(`✘ ${name}:${line + 1} differs\n  node:   ${linesA[line]?.slice(0, 160)}\n  native: ${linesB[line]?.slice(0, 160)}`);
}
if (differences > 0) process.exit(1);
console.log(`Bootstrap fixpoint holds: ${stage1.size} Go files identical`);
