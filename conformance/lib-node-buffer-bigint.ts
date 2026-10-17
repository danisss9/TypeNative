import { isUtf8, isAscii, transcode, kMaxLength, constants } from 'node:buffer';

const buf = Buffer.alloc(16);
assert(buf.writeBigInt64LE(-2n, 0) === 8, 'writeBigInt64LE returns the next offset');
buf.writeBigUInt64BE(0xfedcba9876543210n, 8);
console.log(buf.toString('hex'));
assert(buf.toString('hex') === 'feffffffffffffff' + 'fedcba9876543210', 'bigint writes');
assert(buf.readBigInt64LE(0) === -2n && buf.readBigUInt64LE(0) === 18446744073709551614n, 'signed / unsigned reads');
assert(buf.readBigUInt64BE(8) === 0xfedcba9876543210n && buf.readBigUint64BE(8) === buf.readBigUInt64BE(8), 'aliases');
assert(buf.readBigInt64BE(8) === -81985529216486896n, 'signed big-endian');
try {
  buf.writeBigInt64LE(2n ** 63n);
  assert(false, 'out of range');
} catch (err) {
  console.log((err as NodeJS.ErrnoException).code);
}

const swap = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
assert(swap.swap16().toString('hex') === '0201040306050807', 'swap16');
assert(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]).swap32().toString('hex') === '0403020108070605', 'swap32');
assert(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]).swap64().toString('hex') === '0807060504030201', 'swap64');
try {
  Buffer.from([1, 2, 3]).swap16();
  assert(false, 'swap16 needs an even size');
} catch (err) {
  console.log((err as NodeJS.ErrnoException).code);
}

assert(isUtf8(Buffer.from('héllo')) && !isUtf8(Buffer.from([0xff, 0xfe])), 'isUtf8');
assert(isAscii(Buffer.from('plain')) && !isAscii(Buffer.from('é')), 'isAscii');
const latin1 = transcode(Buffer.from('é'), 'utf8', 'latin1');
assert(latin1.length === 1 && latin1[0] === 0xe9, 'transcode');
assert(kMaxLength === constants.MAX_LENGTH && kMaxLength > 2 ** 31, 'kMaxLength');
console.log('ok');
