// perf: number/string conversion: `String(n)`, `toFixed`, `Number(str)`, `parseInt`
import { performance } from 'node:perf_hooks';

const n = 1_000_000;

const start = performance.now();
let sum = 0;
for (let i = 0; i < n; i++) {
  const s = String(i * 3);
  const f = (i / 8).toFixed(2);
  sum += s.length + f.length + Number(s) + parseInt(f, 10);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${sum}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
