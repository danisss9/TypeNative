// perf: `await` chains of async functions that resolve immediately
import { performance } from 'node:perf_hooks';

async function leaf(n: number): Promise<number> {
  return n & 15;
}

async function middle(n: number): Promise<number> {
  const a = await leaf(n);
  const b = await leaf(n + 1);
  return a + b;
}

async function main(): Promise<void> {
  const n = 1_000_000;
  const start = performance.now();
  let total = 0;
  for (let i = 0; i < n; i++) total += await middle(i);
  const elapsed = performance.now() - start;
  console.log(`checksum: ${total}`);
  console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
}

main();
