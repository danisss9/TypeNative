// perf: `Map<string, number>` insert/delete churn (an LRU-style sliding window)
import { performance } from 'node:perf_hooks';

const keys: string[] = [];
for (let i = 0; i < 4096; i++) keys.push(`key-${i}`);
const window = 2048;
const n = 1_000_000;

const start = performance.now();
const m = new Map<string, number>();
let total = 0;
for (let i = 0; i < n; i++) {
  m.set(keys[i & 4095], i);
  if (i >= window) {
    const old = keys[(i - window) & 4095];
    if (m.delete(old)) total++;
  }
  if (m.has(keys[(i * 7) & 4095])) total += 2;
}
for (const [, v] of m) total += v & 15;
const elapsed = performance.now() - start;

console.log(`checksum: ${total * 10 + m.size}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
