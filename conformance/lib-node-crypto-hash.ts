import { createHash, createHmac, hash, getHashes } from 'node:crypto';

assert(createHash('sha256').update('abc').digest('hex') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256');
assert(createHash('md5').update('abc').digest('hex') === '900150983cd24fb0d6963f7d28e17f72', 'md5');
assert(createHash('sha1').update('a').update('bc').digest('hex') === 'a9993e364706816aba3e25717850c26c9cd0d89d', 'chained update');
assert(createHash('sha512').update('').digest('base64').length === 88, 'sha512 base64');
assert(createHash('sha3-256').update('abc').digest('hex') === '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532', 'sha3-256');
assert(createHash('sha256').update(Buffer.from([1, 2, 3])).digest().length === 32, 'digest() returns a Buffer');

const partial = createHash('sha256').update('ab');
const copy = partial.copy();
assert(partial.update('c').digest('hex') === createHash('sha256').update('abc').digest('hex'), 'copy keeps the state');
assert(copy.update('x').digest('hex') === createHash('sha256').update('abx').digest('hex'), 'copy is independent');

assert(createHmac('sha256', 'key').update('The quick brown fox jumps over the lazy dog').digest('hex') === 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8', 'hmac');
assert(hash('sha1', 'abc') === 'a9993e364706816aba3e25717850c26c9cd0d89d', 'crypto.hash');
assert(getHashes().includes('sha256'), 'getHashes');

let reused = '';
try {
  const h = createHash('sha256');
  h.digest();
  h.digest();
} catch (e) {
  reused = (e as NodeJS.ErrnoException).code ?? '';
}
assert(reused === 'ERR_CRYPTO_HASH_FINALIZED', 'digest twice throws');
