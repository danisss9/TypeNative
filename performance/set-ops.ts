// perf: `Set<number>` `add` / `has` / `delete` on a 16,384-entry set
import { performance } from 'node:perf_hooks';

const passes = 10;
const n = 100_000;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < passes; pass++) {
  const s = new Set<number>();
  for (let i = 0; i < n; i++) s.add((i * 13 + pass) & 16383);
  let hits = 0;
  for (let i = 0; i < n; i++) if (s.has(i)) hits++;
  for (let i = 0; i < n; i += 2) s.delete(i);
  total += hits * 10 + s.size;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
