// Import from node fs/os libs
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, platform, homedir } from 'node:os';

const dir = join(tmpdir(), 'typenative-test31');
if (!existsSync(dir)) mkdirSync(dir);

const filePath = join(dir, 'hello.txt');
writeFileSync(filePath, 'Hello, TypeNative!');
assert(existsSync(filePath), 'file should exist after writeFileSync');

const content = readFileSync(filePath);
assert(content === 'Hello, TypeNative!', `readFileSync mismatch: ${content}`);

const names: string[] = readdirSync(dir);
assert(names.includes('hello.txt'), `readdirSync missing file: ${names.join(', ')}`);

unlinkSync(filePath);
assert(!existsSync(filePath), 'file should not exist after unlinkSync');

rmSync(dir);
assert(!existsSync(dir), 'dir should not exist after rmSync');

assert(platform().length > 0, 'platform() should return a value');
assert(homedir().length > 0, 'homedir() should return a value');

// process.env access
const pathEnv = process.env.PATH!;
assert(pathEnv.length > 0, 'process.env.PATH should return a value');
const pathEnv2 = process.env['PATH']!;
assert(pathEnv2.length > 0, "process.env['PATH'] should return a value");
