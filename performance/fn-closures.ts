// perf: creating closures over mutable state and calling them indirectly
import { performance } from 'node:perf_hooks';

function makeCounter(step: number): () => number {
  let count = 0;
  return () => {
    count += step;
    return count;
  };
}

function apply(f: (x: number) => number, x: number): number {
  return f(x);
}

const n = 12_000_000;

const start = performance.now();
let total = 0;
for (let i = 0; i < n; i++) {
  const next = makeCounter(i & 3);
  next();
  total += next();
  total += apply((x) => x + (i & 1), 1);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
