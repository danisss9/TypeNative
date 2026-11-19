// perf: `node:async_hooks` `AsyncLocalStorage` `run` and `getStore` across sync and `async` / `await` calls
import { performance } from 'node:perf_hooks';
import { AsyncLocalStorage } from 'node:async_hooks';

interface ReqCtx {
  id: number;
  depth: number;
}

const als = new AsyncLocalStorage<ReqCtx>();

function leafSync(x: number): number {
  const ctx = als.getStore();
  return (ctx ? ctx.id + ctx.depth : 0) + x;
}

async function leafAsync(x: number): Promise<number> {
  const ctx = als.getStore();
  const base = ctx ? ctx.id : 0;
  return base + leafSync(x);
}

async function main(): Promise<void> {
  const start = performance.now();
  let total = 0;
  for (let i = 0; i < 160_000; i++) {
    total += als.run({ id: i, depth: 1 }, () => leafSync(i & 255) + leafSync((i + 1) & 255));
  }
  for (let i = 0; i < 80_000; i++) {
    total += await als.run({ id: i, depth: 2 }, () => leafAsync(i & 255));
  }
  const elapsed = performance.now() - start;

  console.log(`checksum: ${total}`);
  console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
}

await main();
