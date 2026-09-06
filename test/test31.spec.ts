// node:fs, node:url, node:os, node:child_process mappings

import { join, dirname, basename, extname } from 'node:path';
import fs from 'node:fs';
import { platform } from 'node:os';
import { exec } from 'node:child_process';

// node:path (existing mapping)
const p: string = join('a', 'b', 'c.txt');
assert(p === join('a', join('b', 'c.txt')), `path join: ${p}`);
assert(basename(p) === 'c.txt', `path basename: ${basename(p)}`);
assert(extname(p) === '.txt', `path extname: ${extname(p)}`);
assert(dirname(p) === join('a', 'b'), `path dirname: ${dirname(p)}`);

// node:fs round-trip through the real filesystem
const tmpDir: string = join('.', 'tmp-test31');
fs.mkdirSync(tmpDir);
fs.writeFileSync(join(tmpDir, 'hello.txt'), 'hello fs');
assert(fs.existsSync(join(tmpDir, 'hello.txt')), 'fs existsSync after write');
const content: string = fs.readFileSync(join(tmpDir, 'hello.txt'));
assert(content === 'hello fs', `fs readFileSync: ${content}`);
fs.appendFileSync(join(tmpDir, 'hello.txt'), '!');
assert(fs.readFileSync(join(tmpDir, 'hello.txt')) === 'hello fs!', 'fs appendFileSync');
fs.copyFileSync(join(tmpDir, 'hello.txt'), join(tmpDir, 'copy.txt'));
assert(fs.readFileSync(join(tmpDir, 'copy.txt')) === 'hello fs!', 'fs copyFileSync');
const names: string[] = fs.readdirSync(tmpDir);
assert(names.length === 2, `fs readdirSync length: ${names.length}`);
assert(names.includes('hello.txt'), 'fs readdirSync contains hello.txt');
fs.rmSync(tmpDir);
assert(!fs.existsSync(tmpDir), 'fs rmSync removed dir');

// node:os
const plat: string = platform();
assert(plat.length > 0, `os platform: ${plat}`);

// node:child_process — echo through the platform shell
const res = exec('echo tn-exec-works');
assert(res.status === 0, `exec status: ${res.status}`);
assert(res.stdout.includes('tn-exec-works'), `exec stdout: ${res.stdout}`);
