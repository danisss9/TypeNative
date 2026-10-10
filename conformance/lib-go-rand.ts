// go:math/rand and go:math/rand/v2 — random values within asserted ranges
import { Intn, Int63, Float64, Perm, Seed, Uint32, NormFloat64 } from 'go:math/rand';
import { IntN, Int64N, Float64 as V2Float64, UintN } from 'go:math/rand/v2';

Seed(42);
for (let i = 0; i < 20; i++) {
  const n = Intn(10);
  assert(n >= 0 && n < 10, `Intn out of range: ${n}`);
}
for (let i = 0; i < 20; i++) {
  const f = Float64();
  assert(f >= 0 && f < 1, `Float64 out of range: ${f}`);
}
const big = Int63();
assert(big >= 0, 'Int63');
const u = Uint32();
assert(u >= 0, 'Uint32');
const norm = NormFloat64();
assert(Number.isFinite(norm), 'NormFloat64');
const p = Perm(6);
assert(p.length === 6, 'Perm length');
let sum = 0;
for (const v of p) sum += v;
assert(sum === 15, 'Perm is a permutation of 0..5');

for (let i = 0; i < 20; i++) {
  const n = IntN(100);
  assert(n >= 0 && n < 100, `IntN out of range: ${n}`);
  const m = Int64N(1000000);
  assert(m >= 0 && m < 1000000, `Int64N out of range: ${m}`);
  const un = UintN(1000);
  assert(un >= 0 && un < 1000, `UintN out of range: ${un}`);
  const f = V2Float64();
  assert(f >= 0 && f < 1, `v2 Float64 out of range: ${f}`);
}
console.log('go-rand ok');
