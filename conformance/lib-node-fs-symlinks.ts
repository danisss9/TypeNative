// conformance-skip: win32 (creating symlinks needs a privilege there)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-link-'));
const target = path.join(dir, 'target.txt');
const link = path.join(dir, 'link.txt');
fs.writeFileSync(target, 'linked');

fs.symlinkSync(target, link);
assert(fs.readlinkSync(link) === target, 'readlinkSync gives the target');
assert(fs.lstatSync(link).isSymbolicLink(), 'lstat sees the symlink');
assert(fs.statSync(link).isFile(), 'stat follows the symlink');
assert(fs.readFileSync(link, 'utf8') === 'linked', 'reading through the symlink');
fs.writeFileSync(link, 'through');
assert(fs.readFileSync(target, 'utf8') === 'through', 'writing through the symlink');

fs.rmSync(dir, { recursive: true, force: true });
