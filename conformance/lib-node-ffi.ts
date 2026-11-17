// node:ffi (Node 26): dlopen / DynamicLibrary against the C runtime (msvcrt.dll, libc / libm, libSystem),
// argument checks and conversions, pointers and raw memory, strings and buffers, callbacks (qsort), close / using
import * as ffi from 'node:ffi';
import { DynamicLibrary, dlopen, dlsym, dlclose } from 'node:ffi';

const win = process.platform === 'win32';
const mac = process.platform === 'darwin';
const libc = win ? 'msvcrt.dll' : mac ? 'libSystem.dylib' : 'libc.so.6';
const libm = win ? 'msvcrt.dll' : mac ? 'libSystem.dylib' : 'libm.so.6';

function codeOf(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    return `${err.name} ${err.code} ${err.message}`;
  }
  return 'no error';
}

assert(ffi.suffix === (win ? 'dll' : mac ? 'dylib' : 'so'), 'suffix');
assert(ffi.types.INT_32 === 'int32' && ffi.types.ARRAY_BUFFER === 'arraybuffer' && ffi.types.FLOAT_64 === 'float64', 'types');

// --- dlopen with definitions
const { lib, functions } = dlopen(libc, {
  strlen: { arguments: ['string'], return: 'u64' },
  abs: { arguments: ['i32'], return: 'i32' },
  malloc: { arguments: ['u64'], return: 'pointer' },
  free: { arguments: ['pointer'] },
  qsort: { arguments: ['pointer', 'u64', 'u64', 'function'] }
});
console.log(functions.strlen('hello'), functions.abs(-7));
assert(functions.strlen('hello') === 5n, 'strlen of a string');
assert(functions.strlen('héllo') === 6n, 'strings are UTF-8');
assert(functions.abs(-7) === 7 && functions.abs(-(2 ** 31)) === -(2 ** 31), 'abs');
assert(lib.path === libc, 'path');
assert(typeof functions.abs.pointer === 'bigint' && functions.abs.pointer === lib.getSymbol('abs'), '.pointer');
assert(functions.qsort.pointer === lib.symbols.qsort, 'symbols');
assert(dlsym(lib, 'strlen') === lib.getSymbol('strlen'), 'dlsym');
const names = Object.keys(lib.getSymbols()).sort();
assert(names.join(',') === 'abs,free,malloc,qsort,strlen', `getSymbols: ${names}`);

// argument checks
assert(codeOf(() => functions.abs(3.9)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be an int32', 'non-integer');
assert(codeOf(() => functions.abs(2 ** 31)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be an int32', 'out of range');
assert(codeOf(() => (functions.abs as any)(1n)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be an int32', 'bigint for int32');
assert(codeOf(() => (functions.abs as any)()) === 'TypeError ERR_INVALID_ARG_VALUE Invalid argument count: expected 1, got 0', 'arg count');
assert(codeOf(() => (functions.strlen as any)(5)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be a buffer, an ArrayBuffer, a string, or a bigint', 'pointer arg');
assert(codeOf(() => (functions.malloc as any)(-1)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be a uint64', 'negative uint64');
assert(codeOf(() => (functions.malloc as any)(2 ** 53)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be a uint64', 'unsafe integer');
assert(codeOf(() => functions.malloc(2n ** 64n)) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be a uint64', 'uint64 overflow');

// --- raw memory
const p = (functions.malloc as any)(64) as bigint; // (a safe-integer number works for u64 too)
assert(typeof p === 'bigint' && p !== 0n, 'malloc');
ffi.setInt32(p, 0, -5);
ffi.setUint8(p, 4, 200);
ffi.setFloat64(p, 8, 1.5);
console.log(ffi.getInt32(p, 0), ffi.getUint8(p, 4), ffi.getInt8(p, 4), ffi.getFloat64(p, 8));
assert(ffi.getInt32(p, 0) === -5 && ffi.getInt32(p) === -5 && ffi.getUint32(p) === 4294967291, 'int32');
assert(ffi.getUint8(p, 4) === 200 && ffi.getInt8(p, 4) === -56, 'int8');
assert(ffi.getFloat64(p, 8) === 1.5, 'float64');
ffi.setInt16(p, 16, -2);
assert(ffi.getInt16(p, 16) === -2 && ffi.getUint16(p, 16) === 65534, 'int16');
ffi.setInt64(p, 24, -2n);
assert(ffi.getInt64(p, 24) === -2n && ffi.getUint64(p, 24) === 18446744073709551614n, 'int64');
ffi.setUint64(p, 24, 5);
assert(ffi.getInt64(p, 24) === 5n, 'setUint64 of a number');
ffi.setFloat32(p, 32, 1.1);
assert(ffi.getFloat32(p, 32) === 1.100000023841858, 'float32');
assert(codeOf(() => { ffi.setInt8(p, 0, 200); }) === 'TypeError ERR_INVALID_ARG_VALUE Value must be an int8', 'set range');
assert(codeOf(() => { ffi.setUint64(p, 0, -1n); }) === 'TypeError ERR_INVALID_ARG_VALUE Value must be a uint64', 'set uint64 range');
assert(codeOf(() => ffi.getInt32(p, 1.5)) === 'TypeError ERR_INVALID_ARG_VALUE The offset must be a non-negative integer', 'offset');
assert(codeOf(() => ffi.getInt32(0n)) === 'Error ERR_FFI_INVALID_POINTER Cannot dereference a null pointer', 'null deref');
assert(codeOf(() => ffi.getInt32(-1n)) === 'TypeError ERR_INVALID_ARG_VALUE The pointer must be a non-negative bigint', 'negative pointer');

// strings and buffers
ffi.exportString('hi', p, 16);
assert(ffi.toString(p) === 'hi', 'exportString / toString');
assert(ffi.toBuffer(p, 3).equals(Buffer.from([0x68, 0x69, 0])), 'toBuffer copies');
ffi.exportString('ab', p, 6, 'utf16le');
assert(ffi.toBuffer(p, 6).equals(Buffer.from([0x61, 0, 0x62, 0, 0, 0])), 'UTF-16 terminator');
assert(
  codeOf(() => { ffi.exportString('hello', p, 3); }) === 'RangeError ERR_OUT_OF_RANGE The value of "len" is out of range. It must be >= 6. Received 3',
  'exportString length'
);
ffi.exportBuffer(Buffer.from([1, 2, 3]), p, 16);
assert(Array.from(new Uint8Array(ffi.toArrayBuffer(p, 3))).join() === '1,2,3', 'exportBuffer / toArrayBuffer');
ffi.exportArrayBufferView(new Uint16Array([0x0201]), p, 16);
assert(ffi.getUint8(p, 0) === 1 && ffi.getUint8(p, 1) === 2, 'exportArrayBufferView');
ffi.exportArrayBuffer(new Uint8Array([9, 8]).buffer, p, 16);
assert(ffi.getUint8(p, 1) === 8, 'exportArrayBuffer');
const view = ffi.toBuffer(p, 4, false);
view[0] = 42;
assert(ffi.getUint8(p, 0) === 42, 'toBuffer(…, false) is a view');
assert(ffi.toString(0n) === null, 'toString(0n)');
assert(codeOf(() => ffi.toBuffer(0n, 3)) === 'Error ERR_FFI_INVALID_POINTER Cannot create a buffer from a null pointer', 'toBuffer(0n)');
assert(codeOf(() => ffi.toArrayBuffer(0n, 3)) === 'Error ERR_FFI_INVALID_POINTER Cannot create an ArrayBuffer from a null pointer', 'toArrayBuffer(0n)');
functions.free(p);

// buffers and typed arrays as pointers
assert(functions.strlen(Buffer.from('ab\0')) === 2n, 'a Buffer');
assert(functions.strlen(new Uint8Array([65, 66, 67, 0]).buffer) === 3n, 'an ArrayBuffer');
const raw = new Int32Array([7, 8]);
assert(ffi.getInt32(ffi.getRawPointer(raw), 4) === 8, 'getRawPointer');

// --- callbacks
const arr = new Int32Array([5, 3, 9, 1]);
let calls = 0;
const cmp = lib.registerCallback({ arguments: ['pointer', 'pointer'], return: 'i32' }, (a, b) => {
  calls++;
  return ffi.getInt32(a as bigint) - ffi.getInt32(b as bigint);
});
assert(typeof cmp === 'bigint', 'registerCallback');
functions.qsort(arr, 4n, 4n, cmp);
console.log(Array.from(arr));
assert(Array.from(arr).join() === '1,3,5,9' && calls > 0, 'qsort through a callback');
lib.refCallback(cmp);
lib.unrefCallback(cmp);
lib.unregisterCallback(cmp);
assert(codeOf(() => { lib.unregisterCallback(cmp); }) === 'TypeError ERR_INVALID_ARG_VALUE Callback not found', 'unregistered');
assert(typeof lib.registerCallback(() => {}) === 'bigint', 'void () callback');

// --- getFunction / getFunctions, signature errors
const labs = lib.getFunction('labs', { arguments: ['i32'], return: 'i32' });
assert(labs(-3) === 3, 'getFunction');
assert(lib.getFunctions().labs === labs, 'getFunctions() lists wrappers');
assert(
  codeOf(() => lib.getFunction('abs', { arguments: ['i64'], return: 'i32' })) ===
    'TypeError ERR_INVALID_ARG_VALUE Function abs was already requested with a different signature',
  'signature mismatch'
);
assert(lib.getFunction('strlen', { arguments: ['buffer'], return: 'u64' }) !== undefined, 'type aliases match');
assert(codeOf(() => lib.getFunction('abs', { arguments: ['nope' as 'i32'] })) === 'TypeError ERR_INVALID_ARG_VALUE Unsupported FFI type: nope', 'unknown type');
assert(codeOf(() => lib.getFunction('atoi', { arguments: ['void' as 'i32'] })).includes("must not be 'void'"), 'void argument');
assert(codeOf(() => lib.getSymbol('nope_xyz')).startsWith('Error ERR_FFI_CALL_FAILED dlsym failed: '), 'missing symbol');
assert(codeOf(() => dlopen('nope_xyz.' + ffi.suffix)).startsWith('Error ERR_FFI_CALL_FAILED dlopen failed: '), 'missing library');

// --- close: wrappers and lookups throw afterwards
lib.close();
lib.close();
assert(codeOf(() => lib.getSymbol('strlen')) === 'Error ERR_FFI_LIBRARY_CLOSED Library is closed', 'closed lookup');
assert(codeOf(() => functions.abs(1)) === 'Error ERR_FFI_LIBRARY_CLOSED Library is closed', 'closed call');

// DynamicLibrary, doubles, using
const m = new DynamicLibrary(libm);
const sqrt = m.getFunction('sqrt', { arguments: ['double'], return: 'double' });
const floor = m.getFunctions({ floor: { arguments: ['f64'], return: 'f64' } }).floor;
console.log(sqrt(2), floor(-1.5));
assert(sqrt(2) === Math.SQRT2 && floor(-1.5) === -2, 'doubles');
assert(codeOf(() => (sqrt as any)('1')) === 'TypeError ERR_INVALID_ARG_VALUE Argument 0 must be a double', 'double arg');
dlclose(m);
{
  using h = dlopen(libc, { abs: { arguments: ['i32'], return: 'i32' } });
  assert(h.functions.abs(-1) === 1, 'using');
}
let disposed: DynamicLibrary | undefined;
{
  using l2 = new DynamicLibrary(libc);
  disposed = l2;
}
assert(codeOf(() => disposed!.getSymbol('abs')) === 'Error ERR_FFI_LIBRARY_CLOSED Library is closed', 'disposed');
if (win) assert(codeOf(() => new DynamicLibrary(null)) === 'TypeError ERR_INVALID_ARG_TYPE Library path must be a string', 'null on Windows');
console.log('ffi ok');
