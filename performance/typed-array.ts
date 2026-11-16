// perf: `Float64Array` / `Int32Array` / `Uint8Array` indexed loops, `subarray`, `set` and `fill`
import { performance } from 'node:perf_hooks';

const N = 4096;
const f = new Float64Array(N);
const ints = new Int32Array(N);
const bytes = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  f[i] = i * 0.5;
  ints[i] = i * 3;
  bytes[i] = i & 255;
}
const scratch = new Int32Array(256);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 6000; pass++) {
  let s = 0;
  for (let i = 0; i < N; i++) s += f[i] * 2;
  for (let i = 1; i < N; i++) ints[i] = (ints[i - 1] + ints[i]) & 0xffff;
  for (let i = 0; i < N; i++) bytes[i] = (bytes[i] + 1) & 255;
  const view = ints.subarray(pass & 1023, (pass & 1023) + 256);
  scratch.set(view);
  scratch.fill(pass & 7, 0, 16);
  total += s + scratch[17] + scratch[0] + bytes[pass & 4095];
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
