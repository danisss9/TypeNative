import * as zip from 'go:archive/zip';
import * as bytes from 'go:bytes';
import * as io from 'go:io';

const buf = new bytes.Buffer();
const w = zip.NewWriter(buf);
const f = w.Create('hello.txt');
f.Write([104, 105]);
w.Close();

const r = zip.NewReader(bytes.NewReader(buf.Bytes()), buf.Len());
assert(r.File.length === 1, 'zip file count');

const rc = r.File[0].Open();
const content = io.ReadAll(rc);
assert(bytes.Equal(content, [104, 105]) === true, 'zip round-trip');
