// perf: bitwise and, or, xor and shifts (`<<`, `>>`, `>>>`) on integers, and flag tests
import { performance } from 'node:perf_hooks';

const F_A = 1 << 0;
const F_B = 1 << 3;
const F_C = 1 << 7;
const n = 20_000_000;

const start = performance.now();
let acc = 0;
let hits = 0;
for (let i = 0; i < n; i++) {
  const flags = (i ^ (i >> 3)) & 0xff;
  if ((flags & F_A) !== 0) hits++;
  if ((flags & (F_B | F_C)) === F_B) hits += 2;
  acc = (acc + ((i << 2) | (flags >>> 1))) & 0xffffff;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${acc * 1000 + hits}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
