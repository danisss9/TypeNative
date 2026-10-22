// Number / Math / String / Object.is / Array.of / Symbol.for / BigInt() additions
const n = 123456;
assert(n.toExponential() === '1.23456e+5' && n.toExponential(2) === '1.23e+5', 'toExponential');
assert((0.00015).toExponential(1) === '1.5e-4' && (0).toExponential() === '0e+0', 'toExponential small');
assert(!Number.isSafeInteger(2 ** 53) && Number.isSafeInteger(42), 'isSafeInteger');
assert(Number.parseInt('42px') === 42 && Number.parseFloat('3.5e1x') === 35, 'Number.parseInt / parseFloat');
assert(Number.MIN_VALUE > 0 && Number.NEGATIVE_INFINITY < 0, 'MIN_VALUE / NEGATIVE_INFINITY');
assert(Math.fround(5.5) === 5.5 && Math.fround(0.1) === 0.10000000149011612, 'fround');
assert(Math.imul(3, 4) === 12 && Math.imul(0xffffffff, 5) === -5 && Math.clz32(1) === 31, 'imul / clz32');
assert(Math.asinh(1).toFixed(6) === '0.881374' && Math.acosh(2).toFixed(6) === '1.316958' && Math.atanh(0.5).toFixed(6) === '0.549306', 'inverse hyperbolics');
assert(Math.sumPrecise([0.1, 0.2, 0.3]) === 0.6, 'sumPrecise');
assert(Object.is(NaN, NaN) && !Object.is(0, -0) && Object.is('a', 'a') && !Object.is({ a: 1 }, { a: 1 }), 'Object.is');
const arr = Array.of(1, 2, 3);
arr.push(4);
assert(arr.length === 4 && Array.of('a', 'b').join('-') === 'a-b', 'Array.of');
assert(String.fromCodePoint(72, 105, 128512) === 'Hi😀' && 'héllo'.codePointAt(1) === 233, 'code points');
assert('abcdef'.substr(1, 3) === 'bcd' && 'abcdef'.substr(-2) === 'ef', 'substr');
assert('  x '.trimLeft() === 'x ' && '  x '.trimRight() === '  x', 'trimLeft / trimRight');
assert('abc'.toLocaleUpperCase() === 'ABC' && 'ok'.isWellFormed() && 'ok'.toWellFormed() === 'ok', 'locale case, well-formed');
assert('a,b,c,d'.split(',', 2).join('|') === 'a|b', 'split limit');
assert('abcabc'.lastIndexOf('a', 2) === 0 && 'abcabc'.lastIndexOf('c', 1) === -1, 'lastIndexOf fromIndex');
const app = Symbol.for('app');
assert(app === Symbol.for('app') && Symbol.keyFor(app) === 'app' && Symbol.keyFor(Symbol('x')) === undefined, 'Symbol.for / keyFor');
assert(Symbol('desc').description === 'desc', 'description');
assert(BigInt(42) === 42n && BigInt('0x1f') === 31n && BigInt(true) === 1n, 'BigInt()');
assert(BigInt.asIntN(8, 255n) === -1n && BigInt.asUintN(8, -1n) === 255n, 'asIntN / asUintN');
let rangeError = '';
try { BigInt(1.5); } catch (e) { rangeError = (e as Error).name; }
assert(rangeError === 'RangeError', 'BigInt of a fraction');
