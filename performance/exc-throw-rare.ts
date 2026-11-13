// perf: `try`/`catch`/`finally` in a hot loop where nothing throws
import { performance } from 'node:perf_hooks';

function step(i: number): number {
  if (i < 0) throw new Error('negative');
  return i & 255;
}

const n = 50_000_000;
const start = performance.now();
let total = 0;
let cleanups = 0;
for (let i = 0; i < n; i++) {
  try {
    total += step(i);
  } catch (e) {
    total -= 1;
  } finally {
    cleanups++;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total + cleanups}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
