// perf: `node:stream` `Readable` → `Transform` → `Writable` and `stream/web` `ReadableStream` / `TransformStream` throughput
import { performance } from 'node:perf_hooks';
import { Readable, Transform, Writable } from 'node:stream';

const chunks: Buffer[] = [];
for (let i = 0; i < 256; i++) {
  const b = Buffer.alloc(1024);
  b.fill((i + 65) & 127);
  chunks.push(b);
}

function runNodeStream(): Promise<number> {
  return new Promise((resolve, reject) => {
    let sum = 0;
    const src = Readable.from(chunks, { objectMode: false });
    const xform = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        const out = Buffer.allocUnsafe(chunk.length);
        for (let i = 0; i < chunk.length; i++) out[i] = chunk[i] ^ 0x20;
        cb(null, out);
      }
    });
    const dst = new Writable({
      write(chunk: Buffer, _enc, cb) {
        sum += chunk.length + chunk[0];
        cb();
      }
    });
    dst.on('finish', () => resolve(sum));
    dst.on('error', reject);
    src.pipe(xform).pipe(dst);
  });
}

async function runWebStream(): Promise<number> {
  let idx = 0;
  const rs = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (idx < chunks.length) {
        controller.enqueue(chunks[idx++]);
      } else {
        controller.close();
      }
    }
  });
  const ts = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const out = new Uint8Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) out[i] = chunk[i] ^ 0x20;
      controller.enqueue(out);
    }
  });
  const reader = rs.pipeThrough(ts).getReader();
  let sum = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sum += value.length + value[0];
  }
  return sum;
}

async function main(): Promise<void> {
  const start = performance.now();
  let total = 0;
  for (let pass = 0; pass < 30; pass++) {
    total += await runNodeStream();
    total += await runWebStream();
  }
  const elapsed = performance.now() - start;

  console.log(`checksum: ${total}`);
  console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
}

await main();
