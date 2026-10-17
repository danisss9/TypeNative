import * as crypto from 'go:crypto';
import * as sha3 from 'go:crypto/sha3';
import * as sha256 from 'go:crypto/sha256';
import * as sha1 from 'go:crypto/sha1';
import * as hkdf from 'go:crypto/hkdf';
import * as pbkdf2 from 'go:crypto/pbkdf2';
import * as des from 'go:crypto/des';
import * as rc4 from 'go:crypto/rc4';
import * as fips140 from 'go:crypto/fips140';
import * as hex from 'go:encoding/hex';
import * as bytes from 'go:bytes';

const abc = [97, 98, 99];

// crypto: hash identifiers.
assert(crypto.SHA256.Size() === 32, 'crypto.SHA256.Size');
assert(crypto.SHA256.String() === 'SHA-256', 'crypto.SHA256.String');
assert(crypto.SHA256.Available() === true, 'crypto.SHA256.Available');

// crypto/sha3.
assert(
  hex.EncodeToString(sha3.Sum256(abc)) === '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
  'sha3.Sum256'
);
const s3 = sha3.New256();
s3.Write(abc);
assert(hex.EncodeToString(s3.Sum([])) === hex.EncodeToString(sha3.Sum256(abc)), 'sha3 streaming');
assert(sha3.SumSHAKE128(abc, 16).length === 16, 'sha3.SumSHAKE128');

// crypto/pbkdf2: RFC 6070 test vector (HMAC-SHA1, 1 iteration).
const dk = pbkdf2.Key(sha1.New, 'password', bytes.NewBufferString('salt').Bytes(), 1, 20);
assert(hex.EncodeToString(dk) === '0c60c80f961f0e71f3a9b524af6012062fe037a6', 'pbkdf2.Key');

// crypto/hkdf: Key == Expand(Extract(...)).
const secret = bytes.NewBufferString('input key material').Bytes();
const salt = bytes.NewBufferString('salt').Bytes();
const okm = hkdf.Key(sha256.New, secret, salt, 'ctx', 42);
const prk = hkdf.Extract(sha256.New, secret, salt);
assert(okm.length === 42 && bytes.Equal(okm, hkdf.Expand(sha256.New, prk, 'ctx', 42)) === true, 'hkdf');

// crypto/des: the classic FIPS 81 example.
const block = des.NewCipher(hex.DecodeString('0123456789abcdef'));
const dst = new Uint8Array(8);
block.Encrypt(dst, bytes.NewBufferString('Now is t').Bytes());
assert(hex.EncodeToString(dst) === '3fa40e8a984d4815', 'des Encrypt');
assert(block.BlockSize() === des.BlockSize, 'des BlockSize');

let desThrew = '';
try {
  des.NewCipher([1, 2, 3]);
} catch (e) {
  desThrew = (e as Error).message;
}
assert(desThrew !== '', 'des bad key size throws');

// crypto/rc4: the Wikipedia test vector.
const stream = rc4.NewCipher(bytes.NewBufferString('Key').Bytes());
const plain = bytes.NewBufferString('Plaintext').Bytes();
const enc = new Uint8Array(plain.length);
stream.XORKeyStream(enc, plain);
assert(hex.EncodeToString(enc) === 'bbf316e8d940af0ad3', 'rc4 XORKeyStream');

// crypto/fips140: not in FIPS mode by default.
assert(fips140.Enabled() === false, 'fips140.Enabled');
assert(fips140.Version().length > 0, 'fips140.Version');
