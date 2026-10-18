import fs from 'node:fs';
import { watch as watchIterator } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-watch-'));
const target = path.join(dir, 'a.txt');

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resolves with the first event whose filename matches, then closes the watcher
function nextEvent(watcher: fs.FSWatcher, name: string): Promise<string> {
  return new Promise((resolve) => {
    watcher.on('change', (eventType: string, filename: string) => {
      if (filename === name) {
        watcher.close();
        resolve(eventType);
      }
    });
  });
}

async function main() {
  // A directory: new entries are 'rename', named relative to it
  const dirWatcher = fs.watch(dir);
  let closed = false;
  dirWatcher.on('close', () => {
    closed = true;
  });
  const created = nextEvent(dirWatcher, 'a.txt');
  await delay(50);
  fs.writeFileSync(target, 'one');
  const createdType = await created;
  assert(createdType === 'rename' || createdType === 'change', 'fs.watch(dir) reports a new file');
  await delay(10);
  assert(closed, "close() emits 'close'");

  // A file, with the listener argument: writes are 'change'
  let fileEvents = 0;
  const fileWatcher = fs.watch(target, (eventType, filename) => {
    if (eventType === 'change' && filename === 'a.txt') fileEvents++;
  });
  await delay(50);
  fs.appendFileSync(target, ' two');
  for (let i = 0; i < 100 && fileEvents === 0; i++) await delay(20);
  fileWatcher.close();
  assert(fileEvents > 0, 'fs.watch(file, listener) reports writes');

  // Recursive: files in subdirectories, named by their relative path
  fs.mkdirSync(path.join(dir, 'sub'));
  const deepWatcher = fs.watch(dir, { recursive: true });
  const deep = nextEvent(deepWatcher, path.join('sub', 'b.txt'));
  await delay(50);
  fs.writeFileSync(path.join(dir, 'sub', 'b.txt'), 'deep');
  await deep;

  // watchFile polls: listener(curr, prev) after the file changes
  const sizes: number[] = [];
  fs.watchFile(target, { interval: 20 }, (curr, prev) => {
    sizes.push(curr.size, prev.size);
    fs.unwatchFile(target);
  });
  await delay(60);
  fs.writeFileSync(target, 'a longer body than before');
  for (let i = 0; i < 100 && sizes.length === 0; i++) await delay(20);
  assert(sizes.length === 2 && sizes[0] === 25 && sizes[1] === 7, 'watchFile reports curr and prev stats');

  // fs/promises watch: an async iterator, ended by an AbortSignal
  const controller = new AbortController();
  setTimeout(() => fs.writeFileSync(path.join(dir, 'c.txt'), 'c'), 50);
  let seen = '';
  let aborted = '';
  try {
    for await (const event of watchIterator(dir, { signal: controller.signal })) {
      if (event.filename === 'c.txt') {
        seen = event.eventType;
        controller.abort();
      }
    }
  } catch (e) {
    aborted = (e as Error).name;
  }
  assert(seen !== '' && aborted === 'AbortError', 'fs/promises watch yields events until aborted');

  let code = '';
  try {
    fs.watch(path.join(dir, 'missing'));
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code === 'ENOENT', 'watching a missing path throws ENOENT');

  // An unref'd watcher does not keep the process alive
  fs.watch(dir).unref();
  fs.rmSync(dir, { recursive: true, force: true });
}
main();
