import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-errors-'));
const missing = path.join(dir, 'missing.txt');

function errorOf(fn: () => void): NodeJS.ErrnoException | undefined {
  try {
    fn();
  } catch (e) {
    return e as NodeJS.ErrnoException;
  }
  return undefined;
}

const notFound = errorOf(() => fs.readFileSync(missing, 'utf8'));
assert(notFound !== undefined && notFound.code === 'ENOENT', 'ENOENT code');
assert(notFound!.syscall === 'open' && notFound!.path === missing, 'syscall / path');
assert(notFound!.message === `ENOENT: no such file or directory, open '${missing}'`, 'Node message format');

const exists = errorOf(() => fs.mkdirSync(dir));
assert(exists?.code === 'EEXIST' && exists.syscall === 'mkdir', 'EEXIST');

fs.mkdirSync(path.join(dir, 'full'));
fs.writeFileSync(path.join(dir, 'full', 'x'), 'x');
assert(errorOf(() => fs.rmdirSync(path.join(dir, 'full')))?.code === 'ENOTEMPTY', 'ENOTEMPTY');
assert(errorOf(() => fs.rmSync(path.join(dir, 'full')))?.code === 'ERR_FS_EISDIR', 'rm of a directory');
assert(errorOf(() => fs.unlinkSync(missing))?.code === 'ENOENT', 'unlink ENOENT');
assert(errorOf(() => fs.rmSync(missing, { force: true })) === undefined, 'rm force ignores ENOENT');
assert(errorOf(() => fs.readdirSync(missing))?.syscall === 'scandir', 'scandir');
assert(errorOf(() => fs.statSync(missing))?.code === 'ENOENT', 'stat ENOENT');
const exclusive = errorOf(() => fs.copyFileSync(path.join(dir, 'full', 'x'), path.join(dir, 'full', 'x'), fs.constants.COPYFILE_EXCL));
assert(exclusive?.code === 'EEXIST', 'COPYFILE_EXCL');
fs.rmSync(dir, { recursive: true, force: true });
