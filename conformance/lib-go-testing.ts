import * as testing from 'go:testing';
import * as fstest from 'go:testing/fstest';
import * as iotest from 'go:testing/iotest';
import * as quick from 'go:testing/quick';
import * as errors from 'go:errors';
import * as os from 'go:os';
import * as path from 'go:path/filepath';
import * as strings from 'go:strings';
import * as bytes from 'go:bytes';
import * as io from 'go:io';

// testing: helpers usable outside `go test`.
assert(testing.Testing() === false, 'testing.Testing');
assert(testing.AllocsPerRun(5, () => {}) === 0, 'testing.AllocsPerRun');

// testing/fstest: validate an fs.FS implementation.
const dir = os.MkdirTemp('', 'tnfstest');
os.WriteFile(path.Join(dir, 'a.txt'), bytes.NewBufferString('alpha').Bytes(), 0o644);
fstest.TestFS(os.DirFS(dir), 'a.txt');
let fsErr = '';
try {
  fstest.TestFS(os.DirFS(dir), 'missing.txt');
} catch (e) {
  fsErr = (e as Error).message;
}
assert(strings.Contains(fsErr, 'missing.txt') === true, 'fstest.TestFS reports missing files');
os.RemoveAll(dir);

// testing/iotest: reader wrappers.
iotest.TestReader(strings.NewReader('hello'), bytes.NewBufferString('hello').Bytes());
const oneByte = io.ReadAll(iotest.OneByteReader(strings.NewReader('abc')));
assert(bytes.NewBuffer(oneByte).String() === 'abc', 'iotest.OneByteReader');
let readErr = '';
try {
  io.ReadAll(iotest.ErrReader(errors.New('boom')));
} catch (e) {
  readErr = (e as Error).message;
}
assert(readErr === 'boom', 'iotest.ErrReader');

// testing/quick: property checks over random inputs.
quick.Check((x: number) => x + 0 === x, null);
quick.CheckEqual((s: string) => s.length, (s: string) => s.length, null);
let quickErr = '';
try {
  quick.Check((s: string) => s.length < 0, null);
} catch (e) {
  quickErr = (e as Error).message;
}
assert(quickErr !== '', 'quick.Check failure throws');
