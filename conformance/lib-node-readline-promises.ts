import { createInterface } from 'node:readline/promises';
import { PassThrough } from 'node:stream';

async function main() {
  const input = new PassThrough();
  const output = new PassThrough();
  const rl = createInterface({ input, output });
  const pendingFirst = rl.question('Color? ');
  input.write('blue\n');
  const first = await pendingFirst;
  const pendingSecond = rl.question('Another? ');
  input.write('green\n');
  const second = await pendingSecond;
  assert(first === 'blue' && second === 'green', 'question resolves with each answer');
  rl.close();
  input.end();
}
main();
