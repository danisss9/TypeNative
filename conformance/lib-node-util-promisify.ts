import { promisify, callbackify } from 'node:util';
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function addLater(a: number, b: number, callback: (err: Error | null, sum?: number) => void): void {
  setTimeout(() => {
    if (a < 0) callback(new Error('negative'));
    else callback(null, a + b);
  }, 1);
}

async function double(n: number): Promise<number> {
  return n * 2;
}

async function main() {
  const addAsync = promisify(addLater);
  assert((await addAsync(2, 3)) === 5, 'promisify(user function)');
  let rejected = '';
  try {
    await addAsync(-1, 1);
  } catch (e) {
    rejected = (e as Error).message;
  }
  assert(rejected === 'negative', 'promisify rejects on error');

  const sleep = promisify(setTimeout);
  await sleep(1);
  const file = join(tmpdir(), `tn-promisify-${process.pid}.txt`);
  const writeFileAsync = promisify(fs.writeFile);
  const readFileAsync = promisify(fs.readFile);
  await writeFileAsync(file, 'promised');
  assert((await readFileAsync(file, 'utf8')) === 'promised', 'promisify(fs.readFile)');
  fs.unlinkSync(file);

  const doubleCb = callbackify(double);
  doubleCb(21, (err: unknown, value: unknown) => {
    assert(err === null && value === 42, 'callbackify');
  });
}
main();
