import path, { sep, delimiter } from 'node:path';

// Platform-independent checks: results are compared through path.sep
const joined = path.join('a', 'b', '..', 'c', 'd.txt');
assert(joined === ['a', 'c', 'd.txt'].join(sep), 'join normalizes');
assert(path.join() === '.' && path.join('', '') === '.', 'join of nothing');
assert(path.normalize('a//b/./c/') === ['a', 'b', 'c', ''].join(sep), 'normalize keeps trailing separator');
assert(path.isAbsolute(path.resolve('x')) && !path.isAbsolute('x/y'), 'isAbsolute / resolve');
assert(path.resolve('a', 'b') === path.join(process.cwd(), 'a', 'b'), 'resolve against cwd');
assert(path.relative(path.join('base', 'x'), path.join('base', 'y', 'z')) === ['..', 'y', 'z'].join(sep), 'relative');
assert(path.relative('same', 'same') === '', 'relative to itself');
assert(path.extname('.bashrc') === '' && path.extname('a.tar.gz') === '.gz' && path.extname('a.') === '.', 'extname edge cases');
assert(path.basename('dir/file.txt', '.txt') === 'file' && path.basename('dir/') === 'dir', 'basename');
assert(path.dirname('a/b/') === 'a' && path.dirname('a') === '.', 'dirname');

const parsed = path.parse(path.join('home', 'user', 'notes.md'));
assert(parsed.base === 'notes.md' && parsed.name === 'notes' && parsed.ext === '.md', 'parse');
assert(parsed.dir === path.join('home', 'user') && parsed.root === '', 'parse dir / root');
assert(path.format({ dir: 'out', name: 'x', ext: '.js' }) === `out${sep}x.js`, 'format');
assert(path.format(parsed) === path.join('home', 'user', 'notes.md'), 'format(parse(p))');
assert((sep === '/' && delimiter === ':') || (sep === '\\' && delimiter === ';'), 'sep / delimiter');
