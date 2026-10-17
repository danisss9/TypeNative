import * as path from 'go:path';
import * as fs from 'go:io/fs';
import * as ioutil from 'go:io/ioutil';
import * as os from 'go:os';
import * as filepath from 'go:path/filepath';
import * as strings from 'go:strings';
import * as bytes from 'go:bytes';

// path: slash-separated, OS independent.
assert(path.Join('a', 'b', '../c') === 'a/c', 'path.Join');
assert(path.Base('/x/y.txt') === 'y.txt' && path.Ext('/x/y.txt') === '.txt', 'path.Base/Ext');
assert(path.Dir('/x/y.txt') === '/x' && path.Clean('a//b/./c') === 'a/b/c', 'path.Dir/Clean');
assert(path.IsAbs('/a') === true && path.IsAbs('a') === false, 'path.IsAbs');
assert(path.Match('*.go', 'main.go') === true, 'path.Match');
const [dir, file] = path.Split('static/app.js');
assert(dir === 'static/' && file === 'app.js', 'path.Split');

// io/fs over os.DirFS.
const root = os.MkdirTemp('', 'tnfs');
os.MkdirAll(filepath.Join(root, 'sub'), 0o755);
os.WriteFile(filepath.Join(root, 'a.txt'), bytes.NewBufferString('alpha').Bytes(), 0o644);
os.WriteFile(filepath.Join(root, 'sub', 'b.txt'), bytes.NewBufferString('beta').Bytes(), 0o644);
const fsys = os.DirFS(root);
assert(fs.ValidPath('sub/b.txt') === true && fs.ValidPath('../x') === false, 'fs.ValidPath');
assert(bytes.NewBuffer(fs.ReadFile(fsys, 'a.txt')).String() === 'alpha', 'fs.ReadFile');
assert(fs.Stat(fsys, 'sub').IsDir() === true, 'fs.Stat');
const entries = fs.ReadDir(fsys, '.');
assert(entries.length === 2 && entries[0].Name() === 'a.txt', 'fs.ReadDir');
assert(fs.Glob(fsys, '*.txt').length === 1, 'fs.Glob');

const walked: string[] = [];
fs.WalkDir(fsys, '.', (p: string, d: fs.DirEntry, err: any) => {
  if (!d.IsDir()) walked.push(p);
  return null;
});
assert(walked.length === 2 && walked[1] === 'sub/b.txt', `fs.WalkDir: ${walked.join(',')}`);

let threw = '';
try {
  fs.ReadFile(fsys, 'missing.txt');
} catch (e) {
  threw = (e as Error).message;
}
assert(strings.Contains(threw, 'missing.txt') === true, 'fs.ReadFile error throws');

// io/ioutil (deprecated wrappers).
const data = ioutil.ReadAll(ioutil.NopCloser(strings.NewReader('legacy')));
assert(bytes.NewBuffer(data).String() === 'legacy', 'ioutil.ReadAll');
assert(bytes.NewBuffer(ioutil.ReadFile(filepath.Join(root, 'a.txt'))).String() === 'alpha', 'ioutil.ReadFile');

os.RemoveAll(root);
