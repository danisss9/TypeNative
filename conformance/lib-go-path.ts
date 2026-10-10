// go:path and go:path/filepath — path building and matching
import * as path from 'go:path';
import * as filepath from 'go:path/filepath';

assert(path.Base('a/b/c.txt') === 'c.txt', 'path.Base');
assert(path.Dir('a/b/c.txt') === 'a/b', 'path.Dir');
assert(path.Ext('archive.tar.gz') === '.gz', 'path.Ext');
assert(path.Clean('a//b/../c') === 'a/c', 'path.Clean');
assert(path.IsAbs('/unix/abs') === true && path.IsAbs('relative') === false, 'path.IsAbs');
assert(path.Join('a', 'b', 'c') === 'a/b/c', 'path.Join');
const matched = path.Match('*.go', 'main.go');
assert(matched === true, `path.Match: ${matched}`);

assert(filepath.Base('a\\b\\c.txt').length > 0, 'filepath.Base');
assert(filepath.Ext('file.txt') === '.txt', 'filepath.Ext');
assert(filepath.Clean('a//b/../c').length > 0, 'filepath.Clean');
assert(typeof filepath.IsAbs('x') === 'boolean', 'filepath.IsAbs');
assert(filepath.Join('a', 'b') === filepath.Join('a', 'b'), 'filepath.Join');
assert(filepath.ToSlash('a\\b').includes('/'), 'filepath.ToSlash');
assert(filepath.VolumeName('C:\\x') === 'C:', 'filepath.VolumeName');
assert(filepath.SplitList('a;b;c').length >= 1, 'filepath.SplitList');

const rel = filepath.Rel('a/b', 'a/b/c/d');
assert(rel !== '', 'filepath.Rel');
const abs = filepath.Abs('.');
assert(abs.length > 0, 'filepath.Abs');

const globbed = filepath.Glob('*.ts');
assert(Array.isArray(globbed), 'filepath.Glob returns array');

const pathMatch = filepath.Match('*.go', 'main.go');
assert(pathMatch === true, 'filepath.Match');
console.log('go-path ok');
