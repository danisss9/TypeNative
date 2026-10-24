import * as embed from 'go:embed';
import { files } from 'go:embed';
import * as fs from 'go:io/fs';
import * as strings from 'go:strings';

// Paths are relative to this file; embed.FS names are relative to it too.
const hello = embed.string('./embed-fixture/hello.txt');
const raw = embed.bytes('./embed-fixture/hello.txt');
const site = embed.files('./embed-fixture/static');
const styles = files('./embed-fixture/static/*.css');

assert(hello.trim() === 'hello, embed', 'embed.string');
assert(hello.startsWith('hello') && hello.length >= 13, 'embed.string methods');
assert(raw.length === hello.length && raw[0] === 104, 'embed.bytes');

// A directory: every file in it, under its path.
const html = new TextDecoder().decode(site.ReadFile('embed-fixture/static/index.html'));
assert(html.includes('<h1>embedded</h1>'), 'FS.ReadFile');
const entries = site.ReadDir('embed-fixture/static');
assert(entries.length === 2 && entries[0].Name() === 'app.css', 'FS.ReadDir');

// embed.FS is an fs.FS.
assert(fs.ReadFile(site, 'embed-fixture/static/app.css').length > 0, 'fs.ReadFile');
const names: string[] = [];
fs.WalkDir(site, '.', (p: string, d: fs.DirEntry, err: any) => {
  if (!d.IsDir()) names.push(p);
  return null;
});
assert(names.length === 2 && names[1] === 'embed-fixture/static/index.html', 'fs.WalkDir');

// A glob embeds only what it matches.
assert(strings.Contains(new TextDecoder().decode(styles.ReadFile('embed-fixture/static/app.css')), 'teal'), 'glob match');
let missing = false;
try {
  styles.ReadFile('embed-fixture/static/index.html');
} catch (e) {
  missing = true;
}
assert(missing, 'glob excludes non-matching files');
