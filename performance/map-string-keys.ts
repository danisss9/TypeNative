// perf: `Map<string, number>` `set` / `get` / `has` word counting
import { performance } from 'node:perf_hooks';

const keys: string[] = [];
for (let i = 0; i < 50_000; i++) keys.push('word' + ((i * 7) % 20_000));

const start = performance.now();
let hits = 0;
for (let pass = 0; pass < 30; pass++) {
  const counts = new Map<string, number>();
  for (const k of keys) {
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (let i = 0; i < 25_000; i++) {
    if (counts.has('word' + i)) hits++;
  }
  hits += counts.size;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${hits}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
