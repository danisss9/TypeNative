// perf: `slice`, `splice`, `concat`, `[...a, ...b]`, `includes` and `indexOf` on arrays
import { performance } from 'node:perf_hooks';

const nums: number[] = [];
for (let i = 0; i < 64; i++) nums.push((i * 13) & 127);
const names = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
const lengths = names.map((s) => s.length);

const start = performance.now();
let total = 0;
for (let i = 0; i < 450_000; i++) {
  const lo = i & 15;
  const part = nums.slice(lo, lo + 24);
  const joined = part.concat(nums.slice(0, 8));
  const spread = [...part, ...lengths];
  joined.splice(lo, 4, 1, 2);
  total += part.length + joined.length + spread.length + joined[lo];
  if (nums.includes(i & 127)) total++;
  total += nums.indexOf((i * 13) & 127) + names.indexOf(names[i & 7]);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
