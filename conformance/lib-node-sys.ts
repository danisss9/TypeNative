// node:sys is the deprecated alias of node:util: the same module
import sys from 'node:sys';
import util from 'node:util';

assert(sys.format('%s:%d', 'n', 7) === 'n:7', 'sys.format');
assert(sys.inspect({ a: [1, 2] }) === util.inspect({ a: [1, 2] }), 'sys.inspect is util.inspect');
assert(sys.isDeepStrictEqual({ a: 1 }, { a: 1 }) && !sys.isDeepStrictEqual({ a: 1 }, { a: 2 }), 'sys helpers');
assert(typeof sys.promisify === 'function' && typeof sys.callbackify === 'function', 'promisify / callbackify');
assert(sys.stripVTControlCharacters('\u001b[31mred\u001b[39m') === 'red', 'stripVTControlCharacters');
