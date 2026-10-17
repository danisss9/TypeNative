import * as adler32 from 'go:hash/adler32';
import * as crc64 from 'go:hash/crc64';
import * as maphash from 'go:hash/maphash';
import * as bytes from 'go:bytes';

const data = bytes.NewBufferString('Wikipedia').Bytes();

// hash/adler32: the Wikipedia example checksum.
assert(adler32.Checksum(data) === 0x11e60398, 'adler32 Checksum');
const ah = adler32.New();
ah.Write(data);
assert(ah.Sum32() === 0x11e60398, 'adler32 streaming');
assert(adler32.Size === 4, 'adler32 Size');

// hash/crc64: streaming matches one-shot.
const table = crc64.MakeTable(crc64.ISO);
const sum = crc64.Checksum(data, table);
const ch = crc64.New(table);
ch.Write(data);
assert(ch.Sum64() === sum && sum !== 0, 'crc64 streaming == Checksum');
assert(crc64.Size === 8, 'crc64 Size');

// hash/maphash: same seed + input → same hash.
const seed = maphash.MakeSeed();
assert(maphash.String(seed, 'abc') === maphash.String(seed, 'abc'), 'maphash deterministic');
assert(maphash.Bytes(seed, [97, 98, 99]) === maphash.String(seed, 'abc'), 'maphash Bytes == String');
const h = new maphash.Hash();
h.SetSeed(seed);
h.WriteString('abc');
assert(h.Sum64() === maphash.String(seed, 'abc'), 'maphash Hash');
