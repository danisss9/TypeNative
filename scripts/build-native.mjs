// Builds the self-hosted native compiler into native/: the tsparser binary and
// typenative (src/main.ts compiled by TypeNative itself), side by side so the
// compiler finds its parser without extra configuration.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'native');
const exe = process.platform === 'win32' ? '.exe' : '';

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

mkdirSync(outDir, { recursive: true });
run('go', ['build', '-o', path.join(outDir, `tsparser${exe}`), '.'], path.join(root, 'tsparser'));
run('node', ['bin/cli.js', '--source', 'src/main.ts', '--output', path.join(outDir, `typenative${exe}`)]);
console.log(`Native compiler ready in ${outDir}`);
