import * as aes from 'go:crypto/aes';
import * as cipher from 'go:crypto/cipher';
import * as rand from 'go:crypto/rand';
import * as subtle from 'go:crypto/subtle';
import * as bytes from 'go:bytes';

const key = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const block = aes.NewCipher(key);
assert(block.BlockSize() === 16, 'AES block size');

const gcm = cipher.NewGCM(block);
assert(gcm.NonceSize() > 0, 'GCM nonce size');

const nonce = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
const sealed = gcm.Seal([], nonce, [104, 105], []);
const opened = gcm.Open([], nonce, sealed, []);
assert(bytes.Equal(opened, [104, 105]) === true, 'GCM round-trip');

const rb = rand.Reader;
assert(rb !== null, 'rand.Reader var');

assert(subtle.ConstantTimeCompare([1, 2], [1, 2]) === 1, 'ConstantTimeCompare');

let threw = '';
try {
  aes.NewCipher([1, 2, 3]);
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'bad key size throws');
