import { inspect } from 'node:util';

// Construction: length, array-likes, other typed arrays, from / of
const zeros = new Int32Array(4);
assert(zeros.length === 4 && zeros[3] === 0 && zeros.byteLength === 16, 'new Int32Array(length)');
const floats = new Float64Array([1.5, 2.5, 3.5]);
assert(floats[1] === 2.5 && Float64Array.BYTES_PER_ELEMENT === 8 && floats.BYTES_PER_ELEMENT === 8, 'new Float64Array(array)');
const copied = new Int16Array(floats);
assert(copied[0] === 1 && copied[2] === 3, 'new Int16Array(typedArray) truncates');
assert(Uint16Array.from([1, 2, 3], (v) => v * 10)[2] === 30, 'from(array, mapFn)');
assert(Uint32Array.of(7, 8, 9).length === 3, 'of(...items)');

// Writes convert like JS: integers wrap, Uint8ClampedArray rounds and clamps, Float32 rounds
const bytes = new Int8Array(3);
bytes[0] = 200;
bytes[1] = -129;
bytes[2] = 3.9;
assert(bytes[0] === -56 && bytes[1] === 127 && bytes[2] === 3, 'Int8Array wraps');
const u32 = new Uint32Array(1);
u32[0] = -1;
assert(u32[0] === 4294967295, 'Uint32Array wraps negatives');
const clamped = new Uint8ClampedArray(4);
clamped[0] = 300;
clamped[1] = -5;
clamped[2] = 1.5;
clamped[3] = 2.5;
assert(clamped[0] === 255 && clamped[1] === 0 && clamped[2] === 2 && clamped[3] === 2, 'Uint8ClampedArray clamps, rounds half to even');
const f32 = new Float32Array(1);
f32[0] = 0.1;
assert(f32[0] !== 0.1 && Math.abs(f32[0] - 0.1) < 1e-7, 'Float32Array rounds to single precision');

// Compound assignment and ++ / -- go through the element type
const counters = new Uint8ClampedArray(2);
counters[0] += 250;
counters[0] += 10;
counters[1]--;
const counts = new Int32Array(2);
counts[1]++;
const before = counts[1]++;
assert(counters[0] === 255 && counters[1] === 0 && counts[1] === 2 && before === 1, 'op= and ++ / --');

// Views on an ArrayBuffer share memory (platform byte order: little-endian)
const buffer = new ArrayBuffer(8);
const asInts = new Int32Array(buffer);
const asBytes = new Uint8Array(buffer);
asInts[0] = 258;
assert(asBytes[0] === 2 && asBytes[1] === 1 && buffer.byteLength === 8, 'views share an ArrayBuffer');
const second = new Uint16Array(buffer, 4, 2);
second[1] = 0xffff;
assert(asBytes[6] === 255 && asBytes[7] === 255 && asInts[1] === -65536, 'byteOffset / length views');
const overFloat = new Float32Array(asInts.buffer);
assert(overFloat.length === 2, '.buffer of a typed array');
const copyOfBuffer = buffer.slice(0, 4);
new Uint8Array(copyOfBuffer)[0] = 99;
assert(asBytes[0] === 2 && copyOfBuffer.byteLength === 4, 'ArrayBuffer#slice copies');
assert(ArrayBuffer.isView(asInts) && !ArrayBuffer.isView(buffer), 'ArrayBuffer.isView');

let rangeError = '';
try {
  new Int32Array(new ArrayBuffer(6));
} catch (e) {
  rangeError = (e as Error).name;
}
assert(rangeError === 'RangeError', 'a buffer that is not a multiple of the element size throws');

// subarray shares, slice copies
const base = Float64Array.of(1, 2, 3, 4, 5);
const middle = base.subarray(1, -1);
middle[0] = 20;
const tail = base.slice(-2);
tail[0] = 40;
assert(base[1] === 20 && base[3] === 4 && middle.length === 3 && tail.length === 2, 'subarray / slice');

// Methods
const nums = Int32Array.of(5, 1, 4, 2, 3);
const doubled = nums.map((v) => v * 2);
assert(doubled instanceof Int32Array && doubled[0] === 10, 'map keeps the kind');
const evens = nums.filter((v) => v % 2 === 0);
assert(evens.length === 2 && evens[1] === 2, 'filter');
assert(nums.reduce((sum, v) => sum + v, 0) === 15, 'reduce');
assert(nums.reduce((acc, v) => acc + String(v), '') === '51423', 'reduce to a string');
let visited = 0;
nums.forEach((v, i) => {
  visited += v * i;
});
assert(visited === 1 + 8 + 6 + 12, 'forEach with index');
assert(nums.some((v) => v > 4) && nums.every((v) => v > 0), 'some / every');
assert(nums.find((v) => v < 3) === 1 && nums.findIndex((v) => v === 4) === 2, 'find / findIndex');
assert(nums.indexOf(4) === 2 && nums.includes(3) && !nums.includes(9), 'indexOf / includes');
assert(Float64Array.of(1, NaN).includes(NaN) && Float64Array.of(NaN).indexOf(NaN) === -1, 'includes finds NaN');
assert(nums.join('-') === '5-1-4-2-3' && `${nums}` === '5,1,4,2,3', 'join / toString');
assert(nums.toSorted().join() === '1,2,3,4,5' && nums[0] === 5, 'toSorted copies');
nums.sort((a, b) => b - a);
assert(nums.join() === '5,4,3,2,1', 'sort with a comparator');
assert(Float64Array.of(10, 9, 1).sort().join() === '1,9,10', 'default sort is numeric');
assert(nums.reverse()[0] === 1 && nums.at(-1) === 5, 'reverse / at');
assert(new Float64Array(3).fill(7, 1)[1] === 7 && new Float64Array(3).fill(7, 1)[0] === 0, 'fill(value, start)');
const target = new Int16Array(5);
target.set([1, 2], 3);
target.set(Int8Array.of(9));
assert(target.join() === '9,0,0,1,2', 'set(array, offset)');

// Iteration
let total = 0;
for (const v of Float32Array.of(0.5, 1.5)) total += v;
assert(total === 2, 'for...of');
const spread = [...Uint16Array.of(3, 4)];
assert(spread.length === 2 && spread[1] === 4, 'spread');
assert(Array.from(Int8Array.of(-1, 1)).join() === '-1,1', 'Array.from');
let keySum = 0;
for (const k of Int8Array.of(9, 9, 9).keys()) keySum += k;
assert(keySum === 3, 'keys()');

assert(inspect(Int32Array.of(1, 2, 3)) === 'Int32Array(3) [ 1, 2, 3 ]', 'util.inspect');

// DataView: explicit byte order
const view = new DataView(new ArrayBuffer(16), 2);
view.setUint16(0, 0x1234);
view.setUint16(2, 0x1234, true);
assert(view.getUint8(0) === 0x12 && view.getUint8(2) === 0x34, 'big-endian by default, little on request');
view.setInt32(4, -2, true);
assert(view.getInt32(4, true) === -2 && view.getUint32(4, true) === 4294967294, 'getInt32 / getUint32');
view.setFloat64(0, Math.PI);
assert(view.getFloat64(0) === Math.PI && view.byteOffset === 2 && view.byteLength === 14, 'getFloat64');
view.setFloat32(8, 1.5, true);
assert(view.getFloat32(8, true) === 1.5, 'getFloat32');
view.setBigInt64(0, -5n);
assert(view.getBigInt64(0) === -5n && view.getBigUint64(0) === 18446744073709551611n, 'BigInt64');
let outside = '';
try {
  view.getUint32(12);
} catch (e) {
  outside = (e as Error).name;
}
assert(outside === 'RangeError', 'reads past the end throw a RangeError');
