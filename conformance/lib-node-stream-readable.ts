import { Readable } from 'node:stream';

const chunks: string[] = [];
const fromArray = Readable.from(['a', 'b', 'c']);
fromArray.on('data', (chunk) => chunks.push(String(chunk)));
fromArray.on('end', () => chunks.push('end'));

const pushed = new Readable({ read() {} });
const received: string[] = [];
pushed.setEncoding('utf8');
pushed.on('data', (chunk) => received.push(chunk as string));
pushed.push('hello ');
pushed.push(Buffer.from('world'));
pushed.push(null);

let closed = false;
pushed.on('close', () => {
  closed = true;
});

async function* generate() {
  yield 1;
  yield 2;
  yield 3;
}

async function iterate() {
  const parts: string[] = [];
  for await (const part of Readable.from(['x', 'y'])) parts.push(part as string);
  assert(parts.join('') === 'xy', 'async iteration');

  let sum = 0;
  for await (const n of Readable.from(generate())) sum += n as number;
  assert(sum === 6, 'Readable.from(async generator)');
}
iterate();

setTimeout(() => {
  assert(chunks.join(',') === 'a,b,c,end', 'Readable.from(array) emits data then end');
  assert(received.join('') === 'hello world', 'push + setEncoding');
  assert(closed && pushed.readableEnded, 'close after end');
}, 100);
