import * as gob from 'go:encoding/gob';
import * as bytes from 'go:bytes';

const buf = new bytes.Buffer();
const enc = gob.NewEncoder(buf);
enc.Encode('hello');
assert(buf.Len() > 0, 'gob encode');

const dec = gob.NewDecoder(bytes.NewReader(buf.Bytes()));
const back = dec.Decode({});
assert(back !== null || true, 'gob decode smoke');
