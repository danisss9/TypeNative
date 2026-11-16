// perf: `bigint` `+`, `*`, `%` and shifts (Fibonacci mod a prime, modular exponentiation)
import { performance } from 'node:perf_hooks';

const P = 1_000_000_007n;

function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

const start = performance.now();
let total = 0n;
let a = 0n;
let b = 1n;
for (let i = 0; i < 1_500_000; i++) {
  const next = (a + b) % P;
  a = b;
  b = next;
}
total += b;
for (let i = 1; i < 100_000; i++) total += modpow(BigInt(i), 65_537n, P);
// a few large values: 2^400 grows past one machine word
let big = 1n << 400n;
for (let i = 0; i < 250_000; i++) big = (big * 3n + BigInt(i)) % (1n << 401n);
total += big & 0xffffn;
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
