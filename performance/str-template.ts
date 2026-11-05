// perf: template literals mixing strings, integers, floats and booleans
import { performance } from 'node:perf_hooks';

const n = 1_000_000;
const names = ['ada', 'grace', 'linus', 'ken'];

const start = performance.now();
let total = 0;
for (let i = 0; i < n; i++) {
  const s = `${names[i & 3]}#${i}: ${i / 4} items, ok=${(i & 1) === 0}`;
  total += s.length;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
