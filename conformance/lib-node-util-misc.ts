import util, { isDeepStrictEqual, types, stripVTControlCharacters, styleText } from 'node:util';
import * as utilTypes from 'node:util/types';

assert(isDeepStrictEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), 'deep equal objects');
assert(!isDeepStrictEqual({ a: 1 }, { a: '1' }), 'strict: no coercion');
assert(isDeepStrictEqual([NaN], [NaN]) && !isDeepStrictEqual(0, -0), 'NaN / -0');
assert(isDeepStrictEqual(new Map([['x', 1]]), new Map([['x', 1]])), 'Maps');
assert(isDeepStrictEqual(new Set([1, 2]), new Set([2, 1])), 'Sets ignore order');
assert(!isDeepStrictEqual([1, 2], [1, 2, 3]), 'length differs');

assert(types.isDate(new Date()) && !types.isDate('2020'), 'types.isDate');
assert(types.isRegExp(/x/) && utilTypes.isRegExp(new RegExp('y')), 'types.isRegExp');
assert(types.isMap(new Map()) && !types.isMap(new Set()) && types.isSet(new Set()), 'types.isMap / isSet');
assert(types.isNativeError(new Error('e')) && !types.isNativeError({}), 'types.isNativeError');
assert(types.isPromise(Promise.resolve(1)), 'types.isPromise');

assert(stripVTControlCharacters('\u001b[31mred\u001b[39m') === 'red', 'stripVTControlCharacters');
assert(styleText('red', 'plain', { validateStream: false }) === '\u001b[31mplain\u001b[39m', 'styleText');

const add = util.deprecate((a: number, b: number) => a + b, 'add() is deprecated');
assert(add(1, 2) === 3 && add(2, 2) === 4, 'deprecate wraps the function');
