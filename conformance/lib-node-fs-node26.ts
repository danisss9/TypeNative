// node:fs in Node 25/26: glob, statfs, openAsBlob, readFile into a buffer, stat signals
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-fs26-'));
fs.mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
fs.mkdirSync(path.join(root, 'skip'));
for (const file of ['x.txt', 'a/y.txt', 'a/b/z.txt', 'skip/w.txt', 'a/note.md']) fs.writeFileSync(path.join(root, file), file);

const norm = (list: string[]) => list.map((p) => p.split(path.sep).join('/')).sort().join(',');
const all = fs.globSync('**/*.txt', { cwd: root });
console.log(norm(all));
assert(norm(all) === 'a/b/z.txt,a/y.txt,skip/w.txt,x.txt', 'globSync **');
assert(norm(fs.globSync('**/*.txt', { cwd: root, exclude: ['skip/**'] })) === 'a/b/z.txt,a/y.txt,x.txt', 'exclude patterns');
assert(norm(fs.globSync('**/*.txt', { cwd: root, exclude: (p: string) => p === 'skip' })) === 'a/b/z.txt,a/y.txt,x.txt', 'exclude function');
assert(norm(fs.globSync('**/*.txt', { cwd: root, maxDepth: 2 })) === 'a/y.txt,skip/w.txt,x.txt', 'maxDepth');
assert(norm(fs.globSync(['*.txt', 'a/*.{md,txt}'], { cwd: root })) === 'a/note.md,a/y.txt,x.txt', 'several patterns and braces');
const dirents = fs.globSync('a/*.txt', { cwd: root, withFileTypes: true });
assert(dirents.length === 1 && dirents[0].name === 'y.txt' && dirents[0].isFile(), 'withFileTypes');

// statfs
const st = fs.statfsSync(root);
assert(st.bsize > 0 && st.blocks > 0 && st.bavail <= st.blocks && typeof st.type === 'number', 'statfsSync');

// readFileSync into a buffer: a view of its leading bytes
const target = Buffer.alloc(64);
const read = fs.readFileSync(path.join(root, 'x.txt'), { buffer: target });
assert(read.length === 5 && read.toString() === 'x.txt' && target[0] === 120, 'readFile buffer option');

// openAsBlobSync / openAsBlob
const blob = fs.openAsBlobSync(path.join(root, 'a', 'y.txt'), { type: 'text/plain' });
assert(blob.size === 7 && blob.type === 'text/plain', 'openAsBlobSync');

// removed in Node 25: fs.F_OK (fs.constants.F_OK stays)
assert(fs.constants.F_OK === 0 && fs.constants.R_OK === 4, 'fs.constants');

async function main() {
  const text = await (await fs.openAsBlob(path.join(root, 'x.txt'))).text();
  assert(text === 'x.txt', 'openAsBlob');

  const found: string[] = [];
  for await (const p of fsp.glob('a/**/*.txt', { cwd: root })) found.push(p);
  assert(norm(found) === 'a/b/z.txt,a/y.txt', 'fs/promises glob');

  const fsInfo = await fsp.statfs(root);
  assert(fsInfo.bsize === st.bsize, 'fs/promises statfs');

  const ac = new AbortController();
  ac.abort();
  let name = '';
  try {
    await fsp.stat(root, { signal: ac.signal });
  } catch (e) {
    name = (e as Error).name;
  }
  assert(name === 'AbortError', 'an aborted signal rejects stat');

  await new Promise<void>((resolve) => {
    fs.glob('*.txt', { cwd: root }, (err, matches) => {
      assert(err === null && matches.join() === 'x.txt', 'fs.glob callback');
      resolve();
    });
  });
  fs.rmSync(root, { recursive: true, force: true });
}
main();
