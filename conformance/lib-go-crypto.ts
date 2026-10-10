// go:crypto/* — hashes, hmac, subtle, crypto/rand.Text, pem
import { Sum256, Sum224 } from 'go:crypto/sha256';
import { Sum as Sha1Sum } from 'go:crypto/sha1';
import { Sum as Md5Sum } from 'go:crypto/md5';
import { Sum512 as Sha512Sum } from 'go:crypto/sha512';
import { New as HmacNew, Equal as HmacEqual } from 'go:crypto/hmac';
import { ConstantTimeCompare } from 'go:crypto/subtle';
import { Text as RandText } from 'go:crypto/rand';
import * as sha256pkg from 'go:crypto/sha256';

// Known digests of "abc"
const d256 = Sum256('abc');
assert(d256.length === 32, 'Sum256 length');
assert(d256[0] === 186 && d256[1] === 120, `Sum256 bytes: ${d256[0]} ${d256[1]}`);
assert(Sum224('abc').length === 28, 'Sum224 length');
assert(Sha512Sum('abc').length === 64, 'sha512 Sum512 length');
assert(Sha512Sum('abc').length === 64, 'sha512 length');
assert(Sha1Sum('abc').length === 20, 'sha1 length');
assert(Md5Sum('abc').length === 16, 'md5 length');
assert(sha256pkg.Size === 32, 'sha256.Size');
assert(sha256pkg.BlockSize === 64, 'sha256.BlockSize');

// Streaming hash through hash.Hash methods
const h = sha256pkg.New();
assert(h.Size() === 32, 'Hash.Size');
assert(h.BlockSize() === 64, 'Hash.BlockSize');
const digest = h.Sum(nil);
assert(digest.length === 32, 'Hash.Sum length');

// HMAC: same key+data → same MAC, and Equality works
const mac1 = HmacNew(sha256pkg.New, 'key').Sum(nil);
const mac2 = HmacNew(sha256pkg.New, 'key').Sum(nil);
assert(mac1.length === 32, 'hmac length');
assert(HmacEqual(mac1, mac2), 'hmac.Equal same');
assert(!HmacEqual(mac1, HmacNew(sha256pkg.New, 'key2').Sum(nil)), 'hmac.Equal different');

// Constant-time compare: 1 equal, negative/positive for unequal
assert(ConstantTimeCompare('abc', 'abc') === 1, 'ConstantTimeCompare equal');
assert(ConstantTimeCompare('abc', 'abd') === 0, 'ConstantTimeCompare unequal');

// crypto/rand.Text: 26 lowercase letters, two draws differ
const t1 = RandText();
const t2 = RandText();
assert(t1.length === 26 && t2.length === 26, `Text length: ${t1.length} ${t2.length}`);
assert(t1 !== t2, 'Text is random');

console.log('go-crypto ok');
