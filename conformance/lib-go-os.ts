import * as os from 'go:os';
import * as path from 'go:path/filepath';

const dir = os.TempDir();
assert(dir !== '', 'TempDir');

const joined = path.Join('a', 'b', 'c');
assert(joined === 'a/b/c' || joined === 'a\\b\\c', 'Join');

assert(path.Ext('file.txt') === '.txt', 'Ext');
assert(path.Base('/a/b/c.txt') === 'c.txt', 'Base');

const cwd = os.Getwd();
assert(cwd !== '', 'Getwd throw-on-error');

let threw = '';
try {
  os.Open('/nonexistent-dir-xyz/file.txt');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Open error throws');
