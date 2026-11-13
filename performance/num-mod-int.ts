// perf: `%` on integer operands (hash buckets, cycling indexes)
import { performance } from 'node:perf_hooks';

const n = 20_000_000;

const start = performance.now();
let sum = 0;
let k = 7;
for (let i = 0; i < n; i++) {
  sum += (i * 31 + k) % 1009;
  k = (k + i) % 97;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${sum}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
