// perf: allocating many short-lived object literals and class instances
import { performance } from 'node:perf_hooks';

interface Point {
  x: number;
  y: number;
}

class Vec {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const n = 15_000_000;

const start = performance.now();
let sum = 0;
const keep: Point[] = [];
for (let i = 0; i < n; i++) {
  const p: Point = { x: i, y: i * 2 };
  const v = new Vec(p.y, p.x);
  sum += v.x - v.y;
  if ((i & 127) === 0) keep.push(p);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${sum + keep.length}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
