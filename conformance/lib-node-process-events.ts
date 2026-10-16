// process.on('exit'): the probe re-runs itself and checks the listener ran last
import { spawnSync } from 'node:child_process';

if (process.argv.includes('--child')) {
  process.on('exit', (code: number) => {
    console.log(`exit ${code}`);
  });
  setTimeout(() => console.log('timer'), 5);
  console.log('main');
  process.exitCode = 3;
} else {
  const result = spawnSync(process.execPath, [...process.execArgv, process.argv[1], '--child'], { encoding: 'utf-8' });
  const lines = String(result.stdout).replace(/\r\n/g, '\n').trim().split('\n');
  assert(lines.join('|') === 'main|timer|exit 3', 'exit listener runs after the event loop with the exit code');
  assert(result.status === 3, 'exit code');
}
