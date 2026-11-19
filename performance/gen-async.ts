// perf: `async function*` generators consumed with `for await…of`
import { performance } from 'node:perf_hooks';

async function* range(n: number, offset: number): AsyncGenerator<number> {
  for (let i = 0; i < n; i++) {
    yield i + offset;
  }
}

async function* mapped(n: number, offset: number): AsyncGenerator<number> {
  for await (const v of range(n, offset)) {
    if ((v & 1) === 0) yield v * 3;
  }
}

async function main(): Promise<void> {
  const start = performance.now();
  let total = 0;
  for (let pass = 0; pass < 800; pass++) {
    for await (const x of mapped(512, pass)) {
      total += x;
    }
  }
  const elapsed = performance.now() - start;

  console.log(`checksum: ${total}`);
  console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
}

await main();
