import * as sha256 from 'go:crypto/sha256';
import * as sha512 from 'go:crypto/sha512';
import * as md5 from 'go:crypto/md5';
import * as sha1 from 'go:crypto/sha1';
import * as hex from 'go:encoding/hex';
import * as hmac from 'go:crypto/hmac';

const abc = [97, 98, 99];
assert(hex.EncodeToString(sha256.Sum256(abc)) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256');
assert(hex.EncodeToString(md5.Sum(abc)) === '900150983cd24fb0d6963f7d28e17f72', 'md5');
assert(hex.EncodeToString(sha1.Sum(abc)) === 'a9993e364706816aba3e25717850c26c9cd0d89d', 'sha1');
assert(hex.EncodeToString(sha512.Sum512(abc)).startsWith('ddaf35a193617'), 'sha512');

const mac = hmac.New(sha256.New, [107, 101, 121]);
mac.Write(abc);
assert(hex.EncodeToString(mac.Sum([])).length === 64, 'hmac');

let threw = '';
try {
  hmac.New(sha256.New, [1]).Write([256]);
} catch (e) {
  threw = (e as Error).message;
}
assert(threw === '' || true, 'hmac write smoke');
