import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-stat-'));
const file = path.join(dir, 'data.txt');
fs.writeFileSync(file, 'hello');
fs.appendFileSync(file, Buffer.from(' world'));

const text = fs.readFileSync(file, 'utf8');
const bytes = fs.readFileSync(file);
assert(text === 'hello world' && bytes.length === 11 && bytes[0] === 104, 'read as string / Buffer');
assert(fs.readFileSync(file, { encoding: 'base64' }) === Buffer.from('hello world').toString('base64'), 'read with encoding option');

const stats = fs.statSync(file);
assert(stats.isFile() && !stats.isDirectory() && stats.size === 11, 'stat file');
assert(stats.mtimeMs > 0 && stats.mtime.getTime() > 0, 'stat times');
assert(fs.statSync(dir).isDirectory(), 'stat directory');
assert(fs.statSync(path.join(dir, 'missing'), { throwIfNoEntry: false }) === undefined, 'throwIfNoEntry: false');

fs.writeFileSync(file, 'replaced', { flag: 'w' });
fs.writeFileSync(file, '!', { flag: 'a' });
assert(fs.readFileSync(file, 'utf-8') === 'replaced!', 'write flags');

const renamed = path.join(dir, 'renamed.txt');
fs.renameSync(file, renamed);
assert(!fs.existsSync(file) && fs.existsSync(renamed), 'renameSync');
fs.copyFileSync(renamed, file);
assert(fs.readFileSync(file, 'utf8') === 'replaced!', 'copyFileSync');
fs.truncateSync(file, 3);
assert(fs.readFileSync(file, 'utf8') === 'rep', 'truncateSync');
assert(fs.realpathSync(dir).length > 0, 'realpathSync');
fs.accessSync(file, fs.constants.R_OK);
fs.unlinkSync(file);
assert(!fs.existsSync(file), 'unlinkSync');
fs.rmSync(dir, { recursive: true, force: true });
assert(!fs.existsSync(dir), 'rmSync recursive');
