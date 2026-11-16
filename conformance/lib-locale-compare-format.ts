// localeCompare (root collation and its options) and Number toLocaleString (en-US)
assert('a'.localeCompare('B') < 0 && 'B'.localeCompare('a') > 0, 'letters compare case-insensitively first');
assert('a'.localeCompare('A') < 0, 'lowercase sorts first on a case tie');
assert('a'.localeCompare('A', undefined, { caseFirst: 'upper' }) > 0, 'caseFirst upper');
assert('résumé'.localeCompare('resume') > 0, 'an accent breaks a tie');
assert('résumé'.localeCompare('resume', 'en', { sensitivity: 'base' }) === 0, 'sensitivity base ignores accents');
assert('a'.localeCompare('A', 'en', { sensitivity: 'accent' }) === 0, 'sensitivity accent ignores case');
assert('a'.localeCompare('á', 'en', { sensitivity: 'case' }) === 0, 'sensitivity case ignores accents');
assert('item10'.localeCompare('item9') < 0, 'digits compare as text by default');
assert('item10'.localeCompare('item9', undefined, { numeric: true }) > 0, 'numeric collation');
assert('a-b'.localeCompare('ab', 'en', { ignorePunctuation: true }) === 0, 'ignorePunctuation');
assert(' x'.localeCompare('1') < 0 && '1'.localeCompare('a') < 0, 'spaces, then digits, then letters');

const words = ['banana', 'Apple', 'cherry', 'apple', 'Éclair', 'eclair'];
const sorted = [...words].sort((a, b) => a.localeCompare(b)).join(' ');
console.log(sorted);
assert(sorted === 'apple Apple banana cherry eclair Éclair', 'a localeCompare sort');

// toLocaleString in en-US (Node formats with the system locale by default)
const n = 1234567.891;
console.log(n.toLocaleString('en-US'));
assert(n.toLocaleString('en-US') === '1,234,567.891', 'grouping and three fraction digits');
assert((1.23456).toLocaleString('en-US') === '1.235', 'rounds to three digits');
assert((5).toLocaleString('en-US', { minimumFractionDigits: 2 }) === '5.00', 'minimumFractionDigits');
assert((0.256).toLocaleString('en-US', { style: 'percent' }) === '26%', 'percent');
assert((-1234.5).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) === '-$1,234.50', 'currency');
assert((1234.5).toLocaleString('en-US', { useGrouping: false }) === '1234.5', 'useGrouping false');
const notANumber = Number('x');
assert(notANumber.toLocaleString('en-US') === 'NaN', 'NaN');

// concat on an any value spreads typed array arguments
const o: any = { list: [1, 2] };
const joined = o.list.concat(['z'], [true]);
assert(joined.length === 4 && joined[2] === 'z' && joined[3] === true, 'dynamic concat spreads arrays');
const xs: any[] = [1];
const ys = xs.concat(['x'], 'y');
assert(ys.length === 3 && ys[1] === 'x' && ys[2] === 'y', 'any[] concat of another element type');
