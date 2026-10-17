import * as flate from 'go:compress/flate';
import * as zlib from 'go:compress/zlib';
import * as lzw from 'go:compress/lzw';
import * as bzip2 from 'go:compress/bzip2';
import * as tar from 'go:archive/tar';
import * as bytes from 'go:bytes';
import * as io from 'go:io';

const text = 'hello hello hello compression';

// flate round-trip.
const fbuf = new bytes.Buffer();
const fw = flate.NewWriter(fbuf, flate.BestCompression);
fw.Write(bytes.NewBufferString(text).Bytes());
fw.Close();
const flated = io.ReadAll(flate.NewReader(bytes.NewReader(fbuf.Bytes())));
assert(bytes.NewBuffer(flated).String() === text, 'flate round-trip');

// zlib round-trip.
const zbuf = new bytes.Buffer();
const zw = zlib.NewWriter(zbuf);
zw.Write(bytes.NewBufferString(text).Bytes());
zw.Close();
const zr = zlib.NewReader(bytes.NewReader(zbuf.Bytes()));
assert(bytes.NewBuffer(io.ReadAll(zr)).String() === text, 'zlib round-trip');

let zthrew = '';
try {
  zlib.NewReader(bytes.NewReader([1, 2, 3, 4]));
} catch (e) {
  zthrew = (e as Error).message;
}
assert(zthrew !== '', 'zlib bad header throws');

// lzw round-trip (LSB, 8-bit literals).
const lbuf = new bytes.Buffer();
const lw = lzw.NewWriter(lbuf, lzw.LSB, 8);
lw.Write(bytes.NewBufferString(text).Bytes());
lw.Close();
const lzwOut = io.ReadAll(lzw.NewReader(bytes.NewReader(lbuf.Bytes()), lzw.LSB, 8));
assert(bytes.NewBuffer(lzwOut).String() === text, 'lzw round-trip');

// bzip2 is decode-only: 'hello bzip2' compressed by Python's bz2.
const bz = [
  66, 90, 104, 57, 49, 65, 89, 38, 83, 89, 85, 90, 68, 247, 0, 0, 2, 25, 128, 64, 0, 16, 0, 18,
  100, 192, 16, 32, 0, 34, 0, 105, 234, 16, 3, 5, 211, 182, 33, 131, 197, 220, 145, 78, 20, 36,
  21, 86, 145, 61, 192
];
const bzOut = io.ReadAll(bzip2.NewReader(bytes.NewReader(bz)));
assert(bytes.NewBuffer(bzOut).String() === 'hello bzip2', 'bzip2 decode');

// tar write + read.
const tbuf = new bytes.Buffer();
const tw = tar.NewWriter(tbuf);
const body = bytes.NewBufferString('tar body').Bytes();
tw.WriteHeader(new tar.Header({ Name: 'a.txt', Mode: 0o644, Size: body.length }));
tw.Write(body);
tw.Close();
const tr = tar.NewReader(bytes.NewReader(tbuf.Bytes()));
const hdr = tr.Next();
assert(hdr.Name === 'a.txt' && hdr.Size === 8, 'tar header');
assert(bytes.NewBuffer(io.ReadAll(tr)).String() === 'tar body', 'tar body');
