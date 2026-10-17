import * as base64 from 'go:encoding/base64';
import * as hex from 'go:encoding/hex';

assert(base64.StdEncoding.EncodeToString([104, 105]) === 'aGk=', 'base64 encode');
assert(hex.EncodeToString([171, 205]) === 'abcd', 'hex encode');

const decoded = base64.StdEncoding.DecodeString('aGk=');
assert(base64.StdEncoding.EncodeToString(decoded) === 'aGk=', 'base64 decode round-trip');

const hexDecoded = hex.DecodeString('abcd');
assert(hex.EncodeToString(hexDecoded) === 'abcd', 'hex decode round-trip');

let threw = '';
try {
  base64.StdEncoding.DecodeString('!!!not-base64!!!');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'decode error throws');
