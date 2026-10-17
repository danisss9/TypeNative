import * as json from 'go:encoding/json';
import * as base32 from 'go:encoding/base32';
import * as ascii85 from 'go:encoding/ascii85';
import * as asn1 from 'go:encoding/asn1';
import * as qp from 'go:mime/quotedprintable';
import * as utf16 from 'go:unicode/utf16';
import * as bytes from 'go:bytes';
import * as io from 'go:io';
import { ref } from 'go:builtin';

// encoding/json: Marshal / Unmarshal / Valid / Compact / Indent.
const rec: Record<string, number> = { a: 1, b: 2 };
const out = bytes.NewBuffer(json.Marshal(rec)).String();
assert(out === '{"a":1,"b":2}', `json.Marshal: ${out}`);
assert(bytes.NewBuffer(json.Marshal(['x', 'y'])).String() === '["x","y"]', 'json.Marshal array');
assert(json.Valid(bytes.NewBufferString('{"ok":true}').Bytes()) === true, 'json.Valid');
assert(json.Valid(bytes.NewBufferString('{nope').Bytes()) === false, 'json.Valid false');

const target = ref<Record<string, number>>();
json.Unmarshal(bytes.NewBufferString('{"n":42}').Bytes(), target);
assert(target.value['n'] === 42, 'json.Unmarshal into ref');

let jthrew = '';
try {
  json.Unmarshal(bytes.NewBufferString('{bad').Bytes(), target);
} catch (e) {
  jthrew = (e as Error).message;
}
assert(jthrew !== '', 'json.Unmarshal error throws');

const compact = new bytes.Buffer();
json.Compact(compact, bytes.NewBufferString('{ "a" : [1, 2] }').Bytes());
assert(compact.String() === '{"a":[1,2]}', 'json.Compact');
const pretty = bytes.NewBuffer(json.MarshalIndent(rec, '', '  ')).String();
assert(pretty.indexOf('\n  "a": 1') >= 0, 'json.MarshalIndent');

const enc = new bytes.Buffer();
json.NewEncoder(enc).Encode(['z']);
assert(enc.String() === '["z"]\n', 'json.Encoder');

// encoding/base32.
assert(base32.StdEncoding.EncodeToString(bytes.NewBufferString('hi').Bytes()) === 'NBUQ====', 'base32 encode');
const b32 = base32.StdEncoding.DecodeString('NBUQ====');
assert(bytes.NewBuffer(b32).String() === 'hi', 'base32 decode');
assert(base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString([104, 105]) === 'NBUQ', 'base32 NoPadding');

// encoding/ascii85 via the streaming encoder.
const a85 = new bytes.Buffer();
const a85w = ascii85.NewEncoder(a85);
a85w.Write(bytes.NewBufferString('test').Bytes());
a85w.Close();
assert(a85.String() === 'FCfN8', `ascii85: ${a85.String()}`);
const a85r = io.ReadAll(ascii85.NewDecoder(bytes.NewBufferString('FCfN8')));
assert(bytes.NewBuffer(a85r).String() === 'test', 'ascii85 decode');
assert(ascii85.MaxEncodedLen(4) === 5, 'ascii85 MaxEncodedLen');

// encoding/asn1: a PrintableString round-trip (TS numbers are float64,
// which ASN.1 has no encoding for).
const der = asn1.Marshal('hi');
assert(bytes.Equal(der, [19, 2, 104, 105]) === true, 'asn1 Marshal string');
const str = ref<string>();
const rest = asn1.Unmarshal(der, str);
assert(str.value === 'hi' && rest.length === 0, 'asn1 Unmarshal string');

// mime/quotedprintable.
const qbuf = new bytes.Buffer();
const qw = qp.NewWriter(qbuf);
qw.Write(bytes.NewBufferString('café=').Bytes());
qw.Close();
assert(qbuf.String() === 'caf=C3=A9=3D', `quotedprintable: ${qbuf.String()}`);
const qr = io.ReadAll(qp.NewReader(bytes.NewBufferString('caf=C3=A9=3D')));
assert(bytes.NewBuffer(qr).String() === 'café=', 'quotedprintable decode');

// unicode/utf16.
const units = utf16.Encode([0x1f600, 0x41]);
assert(units.length === 3 && units[2] === 0x41, 'utf16 Encode surrogate pair');
assert(utf16.IsSurrogate(units[0]) === true, 'utf16 IsSurrogate');
assert(utf16.Decode(units)[0] === 0x1f600, 'utf16 Decode');
assert(utf16.RuneLen(0x1f600) === 2, 'utf16 RuneLen');
