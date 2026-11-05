// perf: `sort` of numbers with a comparator and of strings in default order
import { performance } from 'node:perf_hooks';

const nums: number[] = [];
const strs: string[] = [];
let seed = 12345;
for (let i = 0; i < 300_000; i++) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  nums.push(seed % 1000000);
  strs.push('k' + (seed % 100000));
}

const start = performance.now();
const a = nums.slice();
a.sort((x, y) => x - y);
const b = strs.slice();
b.sort();
const elapsed = performance.now() - start;

console.log(`checksum: ${a[0] + a[a.length >> 1] + a[a.length - 1]} ${b[0]} ${b[b.length >> 1]} ${b[b.length - 1]}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
