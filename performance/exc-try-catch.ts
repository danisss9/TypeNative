// perf: `try`/`catch`/`finally` in a hot loop where one call in 1,024 throws
import { performance } from 'node:perf_hooks';

function risky(i: number): number {
  if ((i & 1023) === 0) throw new Error('bad ' + i);
  return i & 7;
}

const n = 10_000_000;

const start = performance.now();
let total = 0;
let caught = 0;
for (let i = 0; i < n; i++) {
  try {
    total += risky(i);
  } catch (e) {
    caught++;
  } finally {
    total++;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total + caught}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
