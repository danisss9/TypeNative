// go:bytes + go:encoding/base64 + go:encoding/hex — byte slices, encodings
import * as bytes from 'go:bytes';
import { StdEncoding, URLEncoding, RawStdEncoding } from 'go:encoding/base64';
import { EncodeToString, DecodeString, Dump } from 'go:encoding/hex';

assert(bytes.Contains('hello world', 'lo w'), 'bytes.Contains');
assert(bytes.Equal('abc', 'abc') && !bytes.Equal('abc', 'abd'), 'bytes.Equal');
assert(bytes.HasPrefix('index.ts', 'index.') && bytes.HasSuffix('x.go', '.go'), 'bytes.HasPrefix/Suffix');
assert(bytes.Index('banana', 'na') === 2 && bytes.LastIndex('banana', 'na') === 4, 'bytes.Index');
assert(bytes.Count('aaaa', 'aa') === 2, 'bytes.Count');
assert(bytes.Compare('a', 'b') === -1, 'bytes.Compare');
assert(bytes.ToUpper('hi') .length === 2, 'bytes.ToUpper');
assert(bytes.Repeat('ab', 3).length === 6, 'bytes.Repeat');
const fields = bytes.Fields('a b c');
assert(fields.length === 3, 'bytes.Fields');

const b64 = StdEncoding.EncodeToString('hello');
assert(b64 === 'aGVsbG8=', `StdEncoding.EncodeToString: ${b64}`);
assert(StdEncoding.EncodeToString('hi') === 'aGk=', 'EncodeToString padding');
assert(StdEncoding.EncodeToString(StdEncoding.DecodeString('aGVsbG8=')) === 'aGVsbG8=', 'DecodeString/EncodeToString roundtrip');
assert(URLEncoding.EncodeToString('a?b>c') === 'YT9iPmM=', 'URLEncoding encode');
assert(RawStdEncoding.EncodeToString('hi') === 'aGk', 'RawStdEncoding no padding');

// bad input throws (TnTry) and is catchable
let caught = false;
try {
  StdEncoding.DecodeString('not!base64');
} catch (e) {
  caught = true;
}
assert(caught, 'DecodeString error not caught');

const hexed = EncodeToString('ABC');
assert(hexed === '414243', `EncodeToString: ${hexed}`);
assert(Dump('A').includes('41'), `Dump: ${Dump('A')}`);
const roundtrip = EncodeToString(DecodeString('deadbeef'));
assert(roundtrip === 'deadbeef', 'hex roundtrip');
let hexCaught = false;
try {
  DecodeString('xyz');
} catch (e) {
  hexCaught = true;
}
assert(hexCaught, 'hex DecodeString error not caught');
console.log('go-bytes-base64-hex ok');
