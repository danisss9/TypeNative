// Math.f16round, RegExp.escape, Error.isError, Iterator.concat, Reflect.construct

// Math.f16round: nearest binary16, ties to even
console.log(Math.f16round(5.5), Math.f16round(5.05), Math.f16round(1.337));
assert(Math.f16round(5.5) === 5.5, 'f16round keeps a representable value');
assert(Math.f16round(5.05) === 5.05078125, 'f16round rounds to the nearest half');
assert(Math.f16round(65504) === 65504 && Math.f16round(65520) === Infinity, 'f16round overflows past 65504');
assert(Math.f16round(-0.00006103515625) === -0.00006103515625, 'f16round keeps the smallest normal');
assert(Math.f16round(2 ** -25) === 0 && Math.f16round(2 ** -24) === 2 ** -24, 'f16round subnormals');
assert(Number.isNaN(Math.f16round(NaN)), 'f16round NaN');

// RegExp.escape: matches its input literally
const escaped = RegExp.escape('a.b*c?(d)');
console.log(escaped);
assert(escaped === '\\x61\\.b\\*c\\?\\(d\\)', 'RegExp.escape escapes syntax and a leading letter');
assert(RegExp.escape('x-y,z') === '\\x78\\x2dy\\x2cz', 'RegExp.escape escapes punctuators');
assert(RegExp.escape('a b') === '\\x61\\x20b', 'RegExp.escape escapes spaces');
const literal = new RegExp(RegExp.escape('1+1=2'));
assert(literal.test('so 1+1=2 holds') && !literal.test('11=2'), 'an escaped pattern matches literally');

// Error.isError
class AppError extends Error {}
assert(Error.isError(new Error('x')) && Error.isError(new TypeError('t')) && Error.isError(new AppError('a')), 'Error.isError on errors');
assert(!Error.isError({ message: 'x', name: 'Error' }) && !Error.isError('Error') && !Error.isError(null), 'Error.isError on other values');

// Iterator.concat
function* gen(): Generator<number> {
  yield 3;
  yield 4;
}
const joined = Iterator.concat([1, 2], gen(), [5]).toArray();
console.log(joined.join(','));
assert(joined.join(',') === '1,2,3,4,5', 'Iterator.concat chains arrays and generators');
assert(Iterator.concat<number>().toArray().length === 0, 'Iterator.concat of nothing');

// Reflect.construct
class Point {
  constructor(public x: number, public y: number) {}
}
const p = Reflect.construct(Point, [1, 2]) as Point;
assert(p instanceof Point && p.x === 1 && p.y === 2, 'Reflect.construct builds an instance');
