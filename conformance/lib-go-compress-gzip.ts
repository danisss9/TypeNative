import * as gzip from 'go:compress/gzip';
import * as bytes from 'go:bytes';
import * as io from 'go:io';

const data = [104, 101, 108, 108, 111];
const buf = new bytes.Buffer();
const w = gzip.NewWriter(buf);
w.Write(data);
w.Close();

const r = gzip.NewReader(buf);
const out = io.ReadAll(r);
assert(bytes.Equal(out, data) === true, 'gzip round-trip');

let threw = '';
try {
  gzip.NewReader(bytes.NewReader([1, 2, 3]));
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'gzip bad header throws');
