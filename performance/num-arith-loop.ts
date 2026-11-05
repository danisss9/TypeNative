// perf: tight float64 loop with `%`, `*` and `Math.floor`
import { performance } from 'node:perf_hooks';

const n = 50_000_000;

const start = performance.now();
let sum = 0;
for (let i = 0; i < n; i++) {
  sum += Math.floor((i * 31) / 7) % 13;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${sum}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
