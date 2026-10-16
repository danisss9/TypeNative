import { execSync, execFileSync, spawnSync } from 'node:child_process';

const self = [...process.execArgv, process.argv[1]];

if (process.argv.includes('--child')) {
  process.stdout.write(`child:${process.argv[process.argv.length - 1]}`);
  if (process.argv.includes('--fail')) process.exit(4);
} else {
  const node = process.execPath;
  const text = execFileSync(node, [...self, '--child', 'x'], { encoding: 'utf8' });
  assert(text === 'child:x', 'execFileSync with encoding returns a string');
  const bytes = execFileSync(node, [...self, '--child', 'y']);
  assert(bytes.length === 7 && bytes.toString() === 'child:y', 'execFileSync without encoding returns a Buffer');

  const result = spawnSync(node, [...self, '--child', 'z'], { encoding: 'utf8' });
  assert(result.status === 0 && result.stdout === 'child:z' && result.stderr === '', 'spawnSync result');
  const failed = spawnSync(node, [...self, '--child', '--fail']);
  assert(failed.status === 4 && failed.stdout.toString().startsWith('child:'), 'spawnSync exit status');

  let status = 0;
  try {
    execFileSync(node, [...self, '--child', '--fail'], { stdio: 'pipe' });
  } catch (e) {
    status = (e as { status: number }).status;
  }
  assert(status === 4, 'execFileSync throws on a non-zero exit');

  const echoed = execSync('echo hello', { encoding: 'utf8' });
  assert(echoed.trim() === 'hello', 'execSync runs through the shell');
  const piped = spawnSync(node, [...self, '--child', 'input'], { input: 'ignored', encoding: 'utf8' });
  assert(piped.stdout === 'child:input', 'spawnSync with input');
}
