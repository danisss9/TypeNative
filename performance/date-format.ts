// perf: `new Date(ms)`, UTC getters, `toISOString` and `Date.parse` (timestamps in log lines)
import { performance } from 'node:perf_hooks';

const BASE = Date.UTC(2024, 0, 1);

const start = performance.now();
let total = 0;
for (let i = 0; i < 150_000; i++) {
  const d = new Date(BASE + i * 37_000_123);
  total += d.getUTCFullYear() + d.getUTCMonth() + d.getUTCDate() + d.getUTCHours() + d.getUTCDay();
  const iso = d.toISOString();
  total += iso.charCodeAt(9) + iso.charCodeAt(15);
  if ((i & 7) === 0) total += (Date.parse(iso) - BASE) & 1023;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
