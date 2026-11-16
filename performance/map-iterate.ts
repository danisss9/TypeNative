// perf: iterating a `Map` (`for…of` entries, `forEach`, `[...values()]`), also after deletes
import { performance } from 'node:perf_hooks';

const map = new Map<string, number>();
for (let i = 0; i < 4096; i++) map.set(`k${i}`, i);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 900; pass++) {
  for (const [k, v] of map) total += k.length + v;
  map.forEach((v, k) => {
    total += v & 7;
  });
  const values = [...map.values()];
  total += values.length + values[pass];
  for (const k of map.keys()) total += k.length;
  // churn a few keys so iteration sees dead slots
  const victim = `k${(pass * 37) & 4095}`;
  const v = map.get(victim) ?? 0;
  map.delete(victim);
  map.set(victim, v);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
