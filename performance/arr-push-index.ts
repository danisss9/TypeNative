// perf: `push`, indexed reads/writes and `length` on number arrays
import { performance } from 'node:perf_hooks';

const n = 5_000_000;

const start = performance.now();
const a: number[] = [];
for (let i = 0; i < n; i++) a.push(i & 1023);
for (let i = 1; i < a.length; i++) a[i] = (a[i] + a[i - 1]) & 4095;
let sum = 0;
for (let i = 0; i < a.length; i += 3) sum += a[i];
const elapsed = performance.now() - start;

console.log(`checksum: ${sum}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
