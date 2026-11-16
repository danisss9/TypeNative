// Resizable ArrayBuffers (ES2024), detached buffers, growable SharedArrayBuffers

function throws(f: () => void): string {
  try {
    f();
  } catch (e) {
    if (e instanceof TypeError) return 'TypeError';
    if (e instanceof RangeError) return 'RangeError';
    return 'Error';
  }
  return 'none';
}

// new ArrayBuffer(n, { maxByteLength })
const rab = new ArrayBuffer(4, { maxByteLength: 16 });
assert(rab.resizable && rab.maxByteLength === 16 && rab.byteLength === 4, 'a resizable buffer');
const plain = new ArrayBuffer(3);
assert(!plain.resizable && plain.maxByteLength === 3 && !plain.detached, 'a fixed-length buffer');
assert(!new ArrayBuffer(5, {}).resizable, 'no maxByteLength: fixed length');
assert(throws(() => new ArrayBuffer(5, { maxByteLength: 4 })) === 'RangeError', 'length above maxByteLength');

// Length-tracking views follow resize; fixed-length ones go out of bounds
const track = new Int32Array(rab);
const fixed = new Int32Array(rab, 0, 1);
const dv = new DataView(rab);
const fixedDv = new DataView(rab, 0, 4);
track[0] = 7;
rab.resize(12);
console.log('grown', rab.byteLength, track.length, fixed.length, dv.byteLength);
assert(rab.byteLength === 12 && track.length === 3 && fixed.length === 1 && dv.byteLength === 12, 'views after growing');
assert(track[0] === 7 && track[2] === 0, 'grown bytes read 0');
track[2] = 9;
assert(dv.getInt32(8, true) === 9 || dv.getInt32(8, false) === 9, 'a DataView sees the grown bytes');

rab.resize(2);
console.log('shrunk', rab.byteLength, track.length, fixed.length, fixed.byteOffset, dv.byteLength);
assert(track.length === 0 && fixed.length === 0 && fixed.byteOffset === 0 && dv.byteLength === 2, 'views after shrinking');
assert(fixed[0] !== 7, 'an out-of-bounds view reads nothing');
assert(throws(() => fixed.fill(1)) === 'TypeError', 'methods of an out-of-bounds view throw');
assert(throws(() => fixed.join()) === 'TypeError', 'join of an out-of-bounds view throws');
assert(throws(() => track.fill(1)) === 'none', 'a tracking view at the end is in bounds');
assert(throws(() => fixedDv.byteLength) === 'TypeError' && throws(() => fixedDv.getInt8(0)) === 'TypeError', 'an out-of-bounds DataView throws');

// Growing again brings the fixed-length view back; the bytes in between are 0
rab.resize(16);
assert(fixed.length === 1 && fixed[0] === 7 && track.length === 4 && track[2] === 0, 'back in bounds, regrown bytes zeroed');
assert(throws(() => rab.resize(17)) === 'RangeError', 'resize above maxByteLength');
assert(throws(() => plain.resize(1)) === 'TypeError', 'resize of a fixed-length buffer');

// Growing past the first allocation keeps the bytes
const big = new ArrayBuffer(8, { maxByteLength: 1 << 20 });
const bigView = new Float64Array(big);
bigView[0] = 1.5;
big.resize(1 << 16);
assert(bigView.length === 8192 && bigView[0] === 1.5, 'a large resize keeps the bytes');
const bigInts = new BigInt64Array(big, 8);
bigInts[0] = -3n;
assert(bigInts.length === 8191 && bigInts.byteOffset === 8 && bigView[1] !== 0, 'a BigInt64Array tracks the buffer');
assert(new Int32Array(new ArrayBuffer(6, { maxByteLength: 16 })).length === 1, 'tracking views round down');
assert(throws(() => new Int32Array(new ArrayBuffer(6))) === 'RangeError', 'fixed buffers must fit whole elements');

// A view's buffer and byteOffset
const offsetView = new Int32Array(big, 8);
assert(offsetView.byteOffset === 8 && offsetView.subarray(1).byteOffset === 12, 'byteOffset of views');
assert(offsetView.buffer.byteLength === big.byteLength, 'buffer is the ArrayBuffer');
const sub = offsetView.subarray(1);
big.resize(64);
assert(sub.length === 13, 'a subarray of a tracking view tracks');

// transfer() detaches the source
const src = new ArrayBuffer(8);
const srcView = new Int32Array(src);
const srcDv = new DataView(src);
srcView[1] = 42;
const moved = src.transfer();
console.log('transferred', src.detached, src.byteLength, srcView.length, moved.byteLength);
assert(src.detached && src.byteLength === 0 && src.maxByteLength === 0, 'the source is detached');
assert(srcView.length === 0 && srcView.byteLength === 0 && srcView[1] !== 42, 'views of a detached buffer are empty');
assert(new Int32Array(moved)[1] === 42 && !moved.resizable && !moved.detached, 'the bytes moved');
assert(throws(() => src.slice()) === 'TypeError', 'slice of a detached buffer');
assert(throws(() => src.transfer()) === 'TypeError', 'transfer of a detached buffer');
assert(throws(() => new Int32Array(src)) === 'TypeError', 'a typed array on a detached buffer');
assert(throws(() => new Uint8Array(src)) === 'TypeError', 'a Uint8Array on a detached buffer');
assert(throws(() => new DataView(src)) === 'TypeError', 'a DataView on a detached buffer');
assert(throws(() => srcDv.getInt8(0)) === 'TypeError' && throws(() => srcDv.byteLength) === 'TypeError', 'a DataView of a detached buffer');
assert(throws(() => srcView.at(0)) === 'TypeError' && throws(() => srcView.set([1])) === 'TypeError', 'typed array methods throw');
assert(throws(() => console.log([...srcView].length)) === 'TypeError', 'iteration throws');

// transfer keeps a buffer resizable; transferToFixedLength doesn't
const r2 = new ArrayBuffer(4, { maxByteLength: 8 });
const r3 = r2.transfer();
assert(r3.resizable && r3.maxByteLength === 8 && r2.resizable && r2.maxByteLength === 0, 'transfer keeps resizability');
const r4 = r3.transferToFixedLength(6);
assert(!r4.resizable && r4.byteLength === 6 && r3.detached, 'transferToFixedLength');
const resized = new Uint8Array([1, 2, 3]).buffer.transfer(5);
assert(resized.byteLength === 5 && new Uint8Array(resized)[2] === 3 && new Uint8Array(resized)[4] === 0, 'transfer(newLength)');

// Buffers passed to Node APIs are read as they are now
const text = new ArrayBuffer(2, { maxByteLength: 8 });
const head = new Uint8Array(text);
head[0] = 104;
head[1] = 105;
text.resize(3);
const whole = new Uint8Array(text);
whole[2] = 33;
assert(whole.length === 3 && head[1] === 105, 'a Uint8Array on a resizable buffer');
assert(new TextDecoder().decode(text) === 'hi!', 'a resized buffer decodes whole');

// Growable SharedArrayBuffer
const sab = new SharedArrayBuffer(2, { maxByteLength: 8 });
assert(sab.growable && sab.maxByteLength === 8, 'a growable SharedArrayBuffer');
sab.grow(6);
assert(sab.byteLength === 6 && new Uint8Array(sab).length === 6, 'grow');
assert(throws(() => sab.grow(1)) === 'RangeError', 'grow cannot shrink');
assert(throws(() => new SharedArrayBuffer(2).grow(4)) === 'TypeError', 'grow of a fixed-length SharedArrayBuffer');

console.log('ok');
