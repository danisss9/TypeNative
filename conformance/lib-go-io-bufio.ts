// go:io + go:bufio + go:bytes.Buffer — readers, writers, buffered scanning
import { ReadAll } from 'go:io';
import * as os from 'go:os';
import { NewBufferString } from 'go:bytes';
import { NewScanner } from 'go:bufio';

// A small file this probe writes itself, then reads back three ways
const file = 'tn-go-io-sample.txt';
os.WriteFile(file, 'first line\nsecond line\nthird', 0o644);

// io.ReadAll over an open file
const f = os.Open(file);
const content = ReadAll(f);
f.Close();
assert(content.length === 28, `ReadAll length: ${content.length}`);
assert(content[0] === 102, `first byte is 'f': ${content[0]}`);

// bytes.Buffer built from a string, written through WriteString
const buf = NewBufferString('start');
const n = buf.WriteString(' +more');
assert(n === 6, `WriteString returns count: ${n}`);
assert(buf.String() === 'start +more', `Buffer.String: ${buf.String()}`);
assert(buf.Len() === 11, `Buffer.Len: ${buf.Len()}`);
buf.Reset();
assert(buf.Len() === 0, 'Buffer.Reset');

// bufio.Scanner over an empty reader: Scan returns false, Err is nil
const scanner = NewScanner(NewBufferString(''));
let lines = 0;
while (scanner.Scan()) lines++;
assert(lines === 0, `Scan over empty buffer: ${lines}`);
assert(scanner.Err() === null, `Scanner.Err: ${scanner.Err()}`);

// bufio.Scanner line scanning
const f2 = os.Open(file);
const sc2 = NewScanner(f2);
sc2.Scan();
assert(sc2.Text() === 'first line', `Scanner.Text: ${sc2.Text()}`);
sc2.Scan();
assert(sc2.Text() === 'second line', 'Scanner second line');
f2.Close();
os.Remove(file);
console.log('go-io-bufio ok');
