import path from 'node:path';
import posix from 'node:path/posix';

assert(path.posix.join('/a', 'b', '../c') === '/a/c', 'posix join');
assert(posix.normalize('/x//y/../z/') === '/x/z/', 'posix normalize');
assert(posix.resolve('/a/b', './c', '../d') === '/a/b/d', 'posix resolve');
assert(posix.resolve('/a', '/b', 'c') === '/b/c', 'posix resolve restarts at absolute');
assert(posix.relative('/data/a/b', '/data/c') === '../../c', 'posix relative');
assert(posix.dirname('/a/b/c') === '/a/b' && posix.dirname('/a') === '/', 'posix dirname');
assert(posix.basename('/a/b.js', '.js') === 'b' && posix.basename('/a/b.js', 'b.js') === 'b.js', 'posix basename suffix');
assert(posix.isAbsolute('/x') && !posix.isAbsolute('x'), 'posix isAbsolute');
const p = posix.parse('/home/user/dir/file.txt');
assert(p.root === '/' && p.dir === '/home/user/dir' && p.base === 'file.txt' && p.name === 'file', 'posix parse');
assert(posix.format({ root: '/', base: 'f.txt' }) === '/f.txt', 'posix format root');
assert(posix.sep === '/' && posix.delimiter === ':', 'posix sep');

const win = path.win32;
assert(win.join('C:\\a', 'b', '..', 'c') === 'C:\\a\\c', 'win32 join');
assert(win.normalize('C:/x//y/') === 'C:\\x\\y\\', 'win32 normalize');
assert(win.isAbsolute('C:\\x') && win.isAbsolute('\\x') && !win.isAbsolute('C:x'), 'win32 isAbsolute');
assert(win.dirname('C:\\a\\b') === 'C:\\a' && win.dirname('C:\\a') === 'C:\\', 'win32 dirname');
assert(win.basename('C:\\a\\b.txt') === 'b.txt' && win.extname('C:\\a\\b.txt') === '.txt', 'win32 basename / extname');
assert(win.resolve('C:\\a', 'b', '..\\c') === 'C:\\a\\c', 'win32 resolve');
assert(win.relative('C:\\a\\b', 'C:\\a\\c\\d') === '..\\c\\d', 'win32 relative');
const w = win.parse('C:\\path\\dir\\file.txt');
assert(w.root === 'C:\\' && w.dir === 'C:\\path\\dir' && w.base === 'file.txt' && w.ext === '.txt', 'win32 parse');
assert(win.normalize('\\\\server\\share\\x\\..\\y') === '\\\\server\\share\\y', 'win32 UNC');
assert(win.toNamespacedPath('C:\\x') === '\\\\?\\C:\\x', 'win32 toNamespacedPath');
assert(win.sep === '\\' && win.delimiter === ';', 'win32 sep');
