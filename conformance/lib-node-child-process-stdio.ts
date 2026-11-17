// stdio arrays beyond stdout: extra 'pipe' entries are ExtraFiles — they are
// fds 3, 4, … in the child and appear as child.stdio[3+n] in the parent
import * as fs from 'node:fs';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

if (process.env.TN_WRITE === '1') {
  fs.writeSync(3, 'one for fd 3\n');
  fs.writeSync(4, 'two for fd 4\n');
  console.log('child wrote');
  process.exit(0);
}

const child = spawn(process.execPath, [process.argv[1], 'writer'], {
  stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe'],
  env: { ...process.env, TN_WRITE: '1' }
});
child.stderr.on('data', (d: any) => process.stdout.write(`[child-err] ${String(d)}`));
let out = '';
child.stdout.on('data', (d: any) => (out += String(d)));
let extra3 = '';
child.stdio[3].on('data', (d: any) => (extra3 += String(d)));
let extra4 = '';
child.stdio[4].on('data', (d: any) => (extra4 += String(d)));
child.on('close', (code: number) => {
  assert(code === 0, `exit ${code}`);
  assert(out === 'child wrote\n', `stdout ${JSON.stringify(out)}`);
  assert(extra3 === 'one for fd 3\n', `fd 3 ${JSON.stringify(extra3)}`);
  assert(extra4 === 'two for fd 4\n', `fd 4 ${JSON.stringify(extra4)}`);
  console.log('stdio extras ok');
});
