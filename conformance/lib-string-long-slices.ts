// Strings indexed by code point: long strings, their slices, and scans over them

// Non-ASCII text, long enough to be indexed, consumed from the front as a
// lexer does (each rest is a slice of the input)
let text = 'é日本語🙂a'.repeat(4000);
assert(text.length === 4000 * 6 + 0 || text.length === 4000 * 7, 'the length of a long string');
const unit = text.length / 4000;
let rest = text;
let steps = 0;
while (rest.length >= 5000) {
  const head = rest.substring(0, unit);
  assert(head === 'é日本語🙂a', 'a slice of a slice');
  assert(rest[0] === 'é' && rest.charCodeAt(1) === 0x65e5, 'characters of a slice');
  assert(rest.indexOf('a') === unit - 1, 'indexOf in a slice');
  rest = rest.substring(unit);
  steps++;
}
assert(steps === 3167 || steps > 3000, 'consumed');
const tail = text.slice(text.length - unit);
assert(tail === 'é日本語🙂a', 'the end of a long string');
assert(text.slice(unit, unit + 2) === 'é日', 'a slice from the middle');
const re = /a/g;
re.lastIndex = unit * 3000;
const hit = re.exec(text)!;
assert(hit.index === unit * 3000 + unit - 1, 'a /g match deep in a long string');
assert(re.lastIndex === hit.index + 1, 'its lastIndex');

// ASCII: every offset is a byte offset, however the string was built
let ascii = '';
for (let i = 0; i < 2000; i++) ascii += 'x' + (i % 10);
assert(ascii.length === 4000 && ascii[3999] === '9' && ascii.charCodeAt(0) === 120, 'an ASCII string');
assert(ascii.substring(10, 12) === 'x5' && ascii.slice(-2) === 'x9', 'its slices');
assert(ascii.substr(2, 2) === 'x1', 'substr');
assert(ascii.indexOf('x9') === 18 && ascii.indexOf('x9', 19) === 38, 'indexOf');
assert(ascii.indexOf('zz') === -1 && ascii.indexOf('x', 99999) === -1, 'indexOf misses');

// A character past a multi-byte one, in short strings
const mixed = 'aé';
assert(mixed.length === 2 && mixed[1] === 'é' && mixed.charCodeAt(1) === 0xe9, 'a short non-ASCII string');
assert(mixed.charAt(5) === '' && Number.isNaN(mixed.charCodeAt(5)), 'out of range');
assert('abc'.charAt(-1) === '' && Number.isNaN('abc'.charCodeAt(-1)), 'negative');
assert('abc'.charAt(1.9) === 'b' && 'abc'.charCodeAt(1.9) === 98, 'a fractional index');
assert('abc'.charAt(NaN) === 'a' && 'abc'.charCodeAt(NaN) === 97, 'NaN is 0');
const padded = 'é' + 'b'.repeat(600);
assert(padded.length === 601 && padded[600] === 'b' && padded.substring(1, 3) === 'bb', 'non-ASCII at the start of a long string');
const endsWide = 'b'.repeat(600) + 'é';
assert(endsWide.length === 601 && endsWide[600] === 'é', 'non-ASCII at the end of a long string');
assert(endsWide.charCodeAt(599) === 98 && endsWide.indexOf('é') === 600, 'offsets before it');

// Long strings grown by += on a dynamic value: every earlier value stays what it was
function grow(o: any, piece: string): void {
  o.text += piece;
}
const grown: any = { text: 'x'.repeat(2000) };
const other: any = { text: 'y'.repeat(2000) };
const snapshots: string[] = [];
for (let i = 0; i < 500; i++) {
  grow(grown, 'a');
  grow(other, 'bc');
  if (i % 100 === 0) snapshots.push(grown.text);
}
assert(grown.text.length === 2500 && other.text.length === 3000, 'grown in turn');
assert(snapshots[0].length === 2001 && snapshots[0].endsWith('xa'), 'an earlier value');
assert(snapshots[4].length === 2401 && grown.text.startsWith(snapshots[4]), 'a later prefix');
const base: any = { text: 'z'.repeat(2000) };
grow(base, '1');
const fork: any = { text: base.text };
grow(base, 'left');
grow(fork, 'right');
assert(base.text.endsWith('1left') && fork.text.endsWith('1right'), 'two strings grown from one');
