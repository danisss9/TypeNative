// perf: generators driven by hand (`.next()`), spread `[...gen()]` and stored in a variable before `for…of`
import { performance } from 'node:perf_hooks';

function* range(n: number): Generator<number> {
  for (let i = 0; i < n; i++) yield i;
}

function* pairs(n: number): Generator<[number, number]> {
  for (let i = 0; i < n; i++) yield [i, i * 2];
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 24000; pass++) {
  // manual .next()
  const it = range(64);
  let r = it.next();
  while (!r.done) {
    total += r.value & 7;
    r = it.next();
  }
  // spread
  const all = [...range(32)];
  total += all.length + all[pass & 31];
  // a stored generator consumed by for…of
  const stored = pairs(32);
  for (const [a, b] of stored) total += (a ^ b) & 3;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
