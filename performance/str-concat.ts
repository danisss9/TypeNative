// perf: growing ~20 KB strings with `s += x` and `s = s + …` (each pass starts empty)
import { performance } from 'node:perf_hooks';

const passes = 400;
const words = ['alpha', 'beta', 'gamma', 'delta'];

const start = performance.now();
let total = 0;
for (let pass = 0; pass < passes; pass++) {
  let out = '';
  for (let i = 0; i < 3000; i++) {
    out += words[i & 3];
    out += ' ';
  }
  let lines = '';
  for (let i = 0; i < 300; i++) {
    lines = lines + 'line ' + i + '\n';
  }
  total += out.length + lines.length;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
