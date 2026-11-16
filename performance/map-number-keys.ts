// perf: `Map<number, T>` lookups by integer id and memoization
import { performance } from 'node:perf_hooks';

class Entity {
  id: number;
  score: number;
  constructor(id: number) {
    this.id = id;
    this.score = id & 31;
  }
}

const byId = new Map<number, Entity>();
for (let i = 0; i < 8192; i++) byId.set(i * 3, new Entity(i * 3));

const memo = new Map<number, number>();
function collatz(n: number): number {
  if (n === 1) return 0;
  const hit = memo.get(n);
  if (hit !== undefined) return hit;
  const steps = 1 + collatz((n & 1) === 0 ? n / 2 : 3 * n + 1);
  memo.set(n, steps);
  return steps;
}

const start = performance.now();
let total = 0;
for (let i = 0; i < 3_000_000; i++) {
  const e = byId.get((i * 7) & 32767);
  if (e) total += e.score;
  if (byId.has(i & 1023)) total++;
}
for (let n = 1; n < 200_000; n++) total += collatz(n);
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
