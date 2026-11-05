// perf: `map` / `filter` / `reduce` / `some` chains with closure callbacks
import { performance } from 'node:perf_hooks';

const data: number[] = [];
for (let i = 0; i < 100_000; i++) data.push((i * 7919) % 10007);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 50; pass++) {
  const limit = 5000 + pass;
  const result = data
    .map((x) => x * 2)
    .filter((x) => x > limit)
    .reduce((acc, x) => acc + (x & 127), 0);
  total += result;
  if (data.some((x) => x === limit)) total++;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
