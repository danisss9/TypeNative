import crypto from 'node:crypto';

// Known-answer scrypt vectors (Node's output)
const key = crypto.scryptSync('pw', 'salt', 16);
console.log('scryptSync', key.toString('hex'));
assert(key.toString('hex') === 'c0b515908e61334cae6d6003c00be60e', 'scrypt defaults (N=16384, r=8, p=1)');
const tuned = crypto.scryptSync('pw', 'salt', 16, { N: 1024, r: 4, p: 2 });
assert(tuned.toString('hex') === '8f9617fd1528a97ce91c337e5589e4aa', 'scrypt with N / r / p');
const aliased = crypto.scryptSync('pw', 'salt', 16, { cost: 1024, blockSize: 4, parallelization: 2 });
assert(aliased.equals(tuned), 'cost / blockSize / parallelization aliases');
try {
  crypto.scryptSync('pw', 'salt', 16, { N: 1000 });
  assert(false, 'N must be a power of two');
} catch (err) {
  assert((err as NodeJS.ErrnoException).code === 'ERR_CRYPTO_INVALID_SCRYPT_PARAMS', 'invalid params code');
}

let pending = 6;
const done = () => {
  pending--;
  if (pending === 0) console.log('all callbacks ran');
};

crypto.scrypt('pw', 'salt', 16, (err, derived) => {
  assert(err === null && derived.equals(key), 'scrypt callback');
  console.log('scrypt callback', derived.length);
  done();
});
crypto.scrypt('pw', 'salt', 16, { N: 1024, r: 4, p: 2 }, (err, derived) => {
  assert(err === null && derived.equals(tuned), 'scrypt callback with options');
  done();
});
crypto.pbkdf2('secret', 'salt', 1000, 32, 'sha256', (err, derived) => {
  assert(err === null && derived.equals(crypto.pbkdf2Sync('secret', 'salt', 1000, 32, 'sha256')), 'pbkdf2 callback');
  console.log('pbkdf2 callback', derived.toString('hex').slice(0, 16));
  done();
});
crypto.hkdf('sha256', 'key', 'salt', 'info', 42, (err, derived) => {
  assert(err === null && derived.byteLength === 42, 'hkdf callback');
  done();
});
crypto.randomBytes(12, (err, buf) => {
  assert(err === null && buf.length === 12, 'randomBytes callback');
  done();
});
const target = Buffer.alloc(8);
crypto.randomFill(target, 4, (err, buf) => {
  assert(err === null && buf.length === 8 && buf.readUInt32BE(0) === 0, 'randomFill from an offset');
  done();
});
const filled = crypto.randomFillSync(Buffer.alloc(16), 8, 4);
assert(filled.subarray(0, 8).equals(Buffer.alloc(8)) && filled.subarray(12).equals(Buffer.alloc(4)), 'randomFillSync range');
console.log('sync part done');
