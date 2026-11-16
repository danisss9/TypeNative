// perf: ES2025 iterator helpers (`filter` / `map` / `take` / `drop` / `reduce` / `toArray`) on generators and `Iterator.from(array)`
import { performance } from 'node:perf_hooks';

const nums: number[] = [];
for (let i = 0; i < 2048; i++) nums.push((i * 37) & 1023);

function* naturals(): Generator<number> {
  let n = 0;
  while (true) yield n++;
}

function* words(count: number): Generator<string> {
  for (let i = 0; i < count; i++) yield `w${i}`;
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 900; pass++) {
  const picked = Iterator.from(nums)
    .filter((n) => (n & 3) === (pass & 3))
    .map((n) => n * 2)
    .take(256)
    .toArray();
  total += picked.length + picked[pass & 127];
  total += Iterator.from(nums).drop(1024).reduce((a, n) => a + (n & 7), 0);
  total += words(512)
    .filter((w) => w.length === 3)
    .map((w) => w.charCodeAt(1))
    .reduce((a, c) => a + c, 0);
  total += naturals()
    .map((n) => n & 15)
    .take(512)
    .reduce((a, n) => a + n, 0);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
