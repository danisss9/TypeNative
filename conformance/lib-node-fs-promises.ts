import { readFile, writeFile, mkdir, readdir, stat, rm, appendFile, open, mkdtemp } from 'node:fs/promises';
import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'tn-promises-'));
  await mkdir(join(dir, 'sub'), { recursive: true });
  await writeFile(join(dir, 'sub', 'a.txt'), 'alpha');
  await appendFile(join(dir, 'sub', 'a.txt'), '!');
  assert((await readFile(join(dir, 'sub', 'a.txt'), 'utf8')) === 'alpha!', 'write / append / read');
  const bytes = await readFile(join(dir, 'sub', 'a.txt'));
  assert(bytes.length === 6, 'readFile without encoding is a Buffer');
  assert((await readdir(join(dir, 'sub'))).join() === 'a.txt', 'readdir');
  assert((await stat(join(dir, 'sub', 'a.txt'))).size === 6, 'stat');
  assert((await fsp.readFile(join(dir, 'sub', 'a.txt'), 'utf8')) === 'alpha!', 'fs.promises');

  let code = '';
  try {
    await readFile(join(dir, 'nope.txt'));
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code === 'ENOENT', 'rejections carry the error code');

  const handle = await open(join(dir, 'handle.txt'), 'w+');
  await handle.write('handle data');
  const info = await handle.stat();
  assert(info.size === 11 && handle.fd > 2, 'FileHandle write / stat / fd');
  await handle.close();
  assert((await readFile(join(dir, 'handle.txt'), 'utf8')) === 'handle data', 'FileHandle wrote the file');

  await rm(dir, { recursive: true, force: true });
}
main();
