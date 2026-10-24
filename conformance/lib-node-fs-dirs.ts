import { mkdirSync, mkdtempSync, readdirSync, writeFileSync, rmSync, rmdirSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'tn-dirs-'));
mkdirSync(join(root, 'a', 'b', 'c'), { recursive: true });
writeFileSync(join(root, 'a', 'one.txt'), '1');
writeFileSync(join(root, 'a', 'b', 'two.txt'), '2');

const names = readdirSync(join(root, 'a')).sort();
assert(names.length === 2 && names[0] === 'b' && names[1] === 'one.txt', 'readdirSync names');

const entries = readdirSync(join(root, 'a'), { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
const files = entries.filter((e) => e.isFile()).map((e) => e.name);
assert(dirs.length === 1 && dirs[0] === 'b' && files[0] === 'one.txt', 'withFileTypes Dirents');

const all = readdirSync(join(root, 'a'), { recursive: true }).sort();
assert(all.includes(join('b', 'two.txt')) && all.includes(join('b', 'c')), 'recursive readdir');

cpSync(join(root, 'a'), join(root, 'copy'), { recursive: true });
assert(readFileSync(join(root, 'copy', 'b', 'two.txt'), 'utf8') === '2', 'cpSync recursive');
cpSync(join(root, 'a', 'b', 'two.txt'), join(root, 'new', 'dir', 'two.txt'));
assert(readFileSync(join(root, 'new', 'dir', 'two.txt'), 'utf8') === '2', 'cpSync creates parent dirs');

rmdirSync(join(root, 'a', 'b', 'c'));
assert(!existsSync(join(root, 'a', 'b', 'c')), 'rmdirSync');
rmSync(root, { recursive: true });
assert(!existsSync(root), 'rmSync');
