import { openSync, writeSync, readSync, closeSync, fstatSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dir = mkdtempSync(join(tmpdir(), 'tn-fd-'));
const file = join(dir, 'fd.txt');

const fd = openSync(file, 'w');
assert(fd > 2, 'openSync returns a descriptor');
assert(writeSync(fd, 'abc') === 3, 'writeSync string');
assert(writeSync(fd, Buffer.from('def')) === 3, 'writeSync Buffer');
assert(fstatSync(fd).size === 6, 'fstatSync');
closeSync(fd);
assert(readFileSync(file, 'utf8') === 'abcdef', 'written content');

const rfd = openSync(file, 'r');
const buf = Buffer.alloc(4);
assert(readSync(rfd, buf, 0, 4, 0) === 4 && buf.toString() === 'abcd', 'readSync');
assert(readSync(rfd, buf, 0, 4, 4) === 2 && buf.toString('utf8', 0, 2) === 'ef', 'readSync at position');
closeSync(rfd);

const afd = openSync(file, 'a');
writeSync(afd, '!');
closeSync(afd);
assert(readFileSync(file, 'utf8') === 'abcdef!', 'append flag');
rmSync(dir, { recursive: true });
