import * as sha256 from 'go:crypto/sha256';
import * as hex from 'go:encoding/hex';
import * as crc32 from 'go:hash/crc32';
import * as fnv from 'go:hash/fnv';

const sum = sha256.Sum256([97, 98, 99]);
assert(hex.EncodeToString(sum) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 of abc');

assert(crc32.ChecksumIEEE([104, 105]) !== 0, 'crc32 nonzero');

const h = fnv.New32a();
h.Write([104, 105]);
assert(h.Sum32() !== 0, 'fnv Sum32 nonzero');
