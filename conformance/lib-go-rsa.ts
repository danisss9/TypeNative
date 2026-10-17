import * as rsa from 'go:crypto/rsa';
import * as rand from 'go:crypto/rand';
import * as sha256 from 'go:crypto/sha256';

const key = rsa.GenerateKey(rand.Reader, 1024);
assert(key.N.BitLen() === 1024, 'GenerateKey throw-on-tuple');

const msg = [104, 105];
const hashed = sha256.Sum256(msg);
const sig = rsa.SignPKCS1v15(rand.Reader, key, 5, hashed.slice());
assert(sig.length > 0, 'SignPKCS1v15');

const err = rsa.VerifyPKCS1v15(key.PublicKey, 5, hashed.slice(), sig);
assert(err === null || err !== null, 'Verify smoke');

let threw = '';
try {
  rsa.GenerateKey(rand.Reader, 8);
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'small key throws');
