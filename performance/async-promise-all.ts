// perf: `Promise.all` fan-out, `new Promise` + `.then` chains and `queueMicrotask` (the general async path)
import { performance } from 'node:perf_hooks';

function delayed(n: number): Promise<number> {
  return new Promise<number>((resolve) => {
    queueMicrotask(() => resolve(n & 15));
  });
}

async function fanOut(base: number): Promise<number> {
  const parts = await Promise.all([delayed(base), delayed(base + 1), delayed(base + 2), delayed(base + 3)]);
  let s = 0;
  for (const p of parts) s += p;
  return s;
}

// Nested `.then` callbacks (TypeNative types `then` as returning void, so no chaining)
function chain(n: number): Promise<number> {
  return new Promise<number>((resolve) => {
    Promise.resolve(n).then((x) => {
      Promise.resolve(x + 1).then((y) => resolve((y * 2) & 31));
    });
  });
}

async function main(): Promise<void> {
  const start = performance.now();
  let total = 0;
  for (let i = 0; i < 100_000; i++) {
    total += await fanOut(i);
    total += await chain(i);
  }
  const elapsed = performance.now() - start;
  console.log(`checksum: ${total}`);
  console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
}

main();
