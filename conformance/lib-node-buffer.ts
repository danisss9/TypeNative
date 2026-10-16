import { Buffer } from 'node:buffer';

const hello = Buffer.from('hello');
assert(hello.length === 5 && hello[0] === 104, 'from string');
assert(hello.toString() === 'hello', 'toString');
assert(Buffer.from([104, 105]).toString() === 'hi', 'from array');

const view = hello.subarray(1, 3);
assert(view.toString() === 'el', 'subarray');
view[0] = 69;
assert(hello.toString() === 'hEllo', 'subarray shares memory');
assert(hello.slice(-2).toString() === 'lo', 'negative slice');

const zeros = Buffer.alloc(4);
assert(zeros.length === 4 && zeros[3] === 0, 'alloc');
assert(Buffer.alloc(3, 'ab').toString() === 'aba', 'alloc fill');
zeros[1] = 300;
assert(zeros[1] === 44, 'bytes wrap');

const joined = Buffer.concat([Buffer.from('ab'), Buffer.from('cd')]);
assert(joined.toString() === 'abcd' && joined.length === 4, 'concat');
assert(joined.equals(Buffer.from('abcd')) && !joined.equals(hello), 'equals');
assert(Buffer.compare(Buffer.from('a'), Buffer.from('b')) === -1, 'compare');
assert(joined.indexOf('c') === 2 && joined.includes('bc') && joined.indexOf('z') === -1, 'indexOf');

assert(Buffer.byteLength('héllo') === 6, 'byteLength');
assert(Buffer.isBuffer(hello) && Buffer.isEncoding('hex') && !Buffer.isEncoding('nope'), 'predicates');

const copy = Buffer.alloc(2);
assert(Buffer.from('xyz').copy(copy) === 2 && copy.toString() === 'xy', 'copy');
const written = Buffer.alloc(5);
assert(written.write('hey') === 3 && written.toString('utf8', 0, 3) === 'hey', 'write');
assert(Buffer.alloc(4).fill('z').toString() === 'zzzz', 'fill');
assert(`${Buffer.from('tpl')}` === 'tpl', 'template string');
