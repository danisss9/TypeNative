import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-perm-'));
const file = path.join(dir, 'data.txt');
fs.writeFileSync(file, 'hello');

fs.chmodSync(file, 0o600);
if (process.platform === 'win32') {
  // Windows only maps the write bit; the file stays readable and writable
  assert(fs.statSync(file).isFile(), 'chmodSync');
} else {
  assert((fs.statSync(file).mode & 0o777) === 0o600, 'chmodSync sets the mode');
}
fs.chmodSync(file, '644');
assert(fs.statSync(file).isFile(), 'chmodSync with a string mode');

const when = new Date('2024-05-06T07:08:09.000Z');
fs.utimesSync(file, when, when);
assert(Math.abs(fs.statSync(file).mtime.getTime() - when.getTime()) < 2000, 'utimesSync sets mtime');
fs.utimesSync(file, when, new Date(when.getTime() + 60000));
assert(Math.abs(fs.statSync(file).mtime.getTime() - when.getTime() - 60000) < 2000, 'utimesSync sets atime and mtime separately');

const hard = path.join(dir, 'hard.txt');
fs.linkSync(file, hard);
assert(fs.readFileSync(hard, 'utf8') === 'hello', 'linkSync creates a second name');
fs.writeFileSync(file, 'changed');
assert(fs.readFileSync(hard, 'utf8') === 'changed', 'a hard link shares the file');
assert(!fs.lstatSync(hard).isSymbolicLink(), 'a hard link is not a symlink');

fs.rmSync(dir, { recursive: true, force: true });
