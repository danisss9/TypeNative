import { Readable, duplexPair } from 'node:stream';

async function main(): Promise<void> {
  // duplexPair(): what one side writes, the other reads
  const [left, right] = duplexPair();
  const heard: string[] = [];
  right.on('data', (chunk) => heard.push(`right:${chunk}`));
  left.on('data', (chunk) => heard.push(`left:${chunk}`));
  const ended: string[] = [];
  left.on('finish', () => ended.push('left finish'));
  right.on('end', () => ended.push('right end'));
  await new Promise<void>((resolve) => {
    left.on('close', () => resolve());
    left.end('bye');
    right.end('back');
  });
  console.log(heard.join(' '), '|', ended.join(', '));
  assert(heard.join(' ') === 'right:bye left:back', 'each side reads the other');
  assert(ended.join(', ') === 'right end, left finish', 'end() ends the other side, then finishes');

  // A write completes once the other side reads it (object mode, highWaterMark 2)
  const [a, b] = duplexPair({ objectMode: true, highWaterMark: 2 });
  const writes = [a.write({ n: 1 }), a.write({ n: 2 }), a.write({ n: 3 })];
  console.log('writes:', writes.join(','), b.readableLength);
  assert(writes.join(',') === 'true,false,false' && b.readableLength === 1, 'held writes');
  const objects: number[] = [];
  b.on('data', (chunk) => objects.push(chunk.n));
  await new Promise<void>((resolve) => a.once('drain', () => resolve()));
  assert(objects.join(',') === '1,2,3', 'held writes complete as the other side reads');

  // destroy() ends the other side's readable; destroy(err) destroys it
  const [c, d] = duplexPair();
  d.resume();
  const dEnded = new Promise<void>((resolve) => d.on('end', () => resolve()));
  c.destroy();
  await dEnded;
  assert(c.destroyed && !d.destroyed, 'plain destroy leaves the other side open');
  const [e, f] = duplexPair();
  e.on('error', () => {});
  const fClosed = new Promise<void>((resolve) => f.on('close', () => resolve()));
  e.destroy(new Error('broken'));
  await fClosed;
  assert(e.destroyed && f.destroyed, 'destroy(err) destroys both');

  // readable[Symbol.for('Stream.toAsyncStreamable')](): batches of Uint8Arrays
  // (stream/iter; Node needs --experimental-stream-iter)
  const source = new Readable({ read() {} });
  source.push('ab');
  source.push(Buffer.from('cd'));
  source.push(null);
  const bytes: string[] = [];
  for await (const batch of source[Symbol.for('Stream.toAsyncStreamable')]()) {
    for (const chunk of batch) {
      assert(chunk instanceof Uint8Array, 'a batch holds Uint8Arrays');
      bytes.push(Buffer.from(chunk).toString());
    }
  }
  console.log('batches:', bytes.join(''));
  assert(bytes.join('') === 'abcd', 'toAsyncStreamable');
}

main();
