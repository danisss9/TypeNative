import path from 'node:path';

const cases: [string, string][] = [
  ['/foo/bar', '/foo/*'],
  ['/foo/bar/baz', '/foo/*'],
  ['foo/bar/baz.ts', 'foo/**/*.ts'],
  ['foo/baz.ts', 'foo/**/*.ts'],
  ['foo/a/b/c', 'foo/**'],
  ['foo/.hidden', 'foo/*'],
  ['foo/.hidden', 'foo/.*'],
  ['src/index.js', 'src/*.{js,ts}'],
  ['src/index.ts', 'src/*.{js,ts}'],
  ['src/index.md', 'src/*.{js,ts}'],
  ['a1.txt', 'a?.txt'],
  ['a12.txt', 'a?.txt'],
  ['file-b.log', 'file-[abc].log'],
  ['file-d.log', 'file-[!abc].log'],
  ['x/y', 'x/y'],
  ['x/y', 'x'],
  ['lib/deep/nested/mod.js', '**/*.js'],
  ['mod.js', '**/*.js'],
  ['/home/a/x.ts', '**/x.ts'],
  ['/x.ts', '**/x.ts'],
  ['/home/a/x.ts', '**'],
  ['/home/a/x.ts', '*/a/x.ts'],
  ['../a/x.ts', '**/x.ts']
];
const expected = [true, false, true, true, true, false, true, true, true, false, true, false, true, true, true, false, true, true, true, true, true, false, false];
for (let i = 0; i < cases.length; i++) {
  const p = cases[i][0];
  const g = cases[i][1];
  const matched = path.matchesGlob(p, g);
  console.log(`${p} ~ ${g}: ${matched}`);
  assert(matched === expected[i], `${p} ~ ${g}`);
}
assert(path.win32.matchesGlob('src\\lib\\a.js', 'src/**/*.js'), 'win32 separators');
