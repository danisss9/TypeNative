// __filename / __dirname: a native binary has no script file, so they name the
// running executable and its directory
import path from 'node:path';

assert(__filename === process.execPath, '__filename is the executable');
assert(path.isAbsolute(__filename) && __filename.length > 0, '__filename is absolute');
assert(path.isAbsolute(__dirname) && __dirname === path.dirname(__filename), '__dirname is its directory');
assert(path.basename(__dirname).length > 0, '__dirname names a directory');
