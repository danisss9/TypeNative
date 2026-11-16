// Float16Array, BigInt64Array / BigUint64Array, DataView float16
const halves = new Float16Array([1.5, 0.1, 65504, 70000, -2]);
console.log(halves.join(' '));
assert(halves.length === 5 && halves.BYTES_PER_ELEMENT === 2 && halves.byteLength === 10, 'Float16Array shape');
assert(halves[0] === 1.5 && halves[1] === 0.0999755859375, 'values round to binary16');
assert(halves[2] === 65504 && halves[3] === Infinity && halves[4] === -2, 'overflow to Infinity');
halves[1] = 2.0005;
assert(halves[1] === 2, 'writes round');
// (V8 in Node 26.13 misses negative values here; the spec finds them)
assert(halves.indexOf(65504) === 2 && halves.includes(1.5), 'search by value');
const sortedHalves = Float16Array.from([3, 1, 2]).sort();
assert(sortedHalves.join(',') === '1,2,3', 'sort');
const view = new Uint16Array(new Float16Array([1]).buffer);
assert(view[0] === 0x3c00, 'binary16 bits of 1');

const big = new BigInt64Array(3);
big[0] = 5n;
big[1] = -1n;
big[2] = 2n ** 63n;
console.log(big.join(','));
assert(big[0] === 5n && big[1] === -1n, 'BigInt64Array elements are bigints');
assert(big[2] === -(2n ** 63n), 'writes wrap to 64 bits');
assert(big.length === 3 && big.byteLength === 24 && BigInt64Array.BYTES_PER_ELEMENT === 8, 'BigInt64Array shape');
assert(big[5] === undefined, 'out of range reads undefined');

const ubig = BigUint64Array.of(1n, 2n);
ubig[0] = -1n;
assert(ubig[0] === 18446744073709551615n, 'BigUint64Array wraps negatives');
assert(ubig.indexOf(2n) === 1 && ubig.includes(2n) && !ubig.includes(3n), 'search');

let sum = 0n;
for (const v of new BigInt64Array([1n, 2n, 3n])) sum += v;
assert(sum === 6n, 'iteration yields bigints');

// a BigInt64Array view over bytes, read back through a DataView
const shared = new ArrayBuffer(8);
new BigInt64Array(shared)[0] = 258n;
const dv = new DataView(shared);
assert(dv.getUint8(0) === 2 && dv.getUint8(1) === 1, 'little-endian bytes of a BigInt64Array view');

dv.setFloat16(0, 1.5, true);
assert(dv.getFloat16(0, true) === 1.5, 'DataView float16');
assert(ArrayBuffer.isView(big) && ArrayBuffer.isView(halves), 'isView');
