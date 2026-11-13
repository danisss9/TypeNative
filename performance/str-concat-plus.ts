// perf: growing strings with `s = s + x` (not `+=`), each pass starting empty
import { performance } from 'node:perf_hooks';

const passes = 1000;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < passes; pass++) {
  let lines = '';
  for (let i = 0; i < 3000; i++) {
    lines = lines + 'line ' + i + '\n';
  }
  total += lines.length;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
