// perf: object spread `{ ...p, x }`, destructuring with defaults, and array-destructuring swaps
import { performance } from 'node:perf_hooks';

interface Vec {
  x: number;
  y: number;
  z: number;
}

interface Options {
  size?: number;
  depth?: number;
  label?: string;
}

function area({ size = 4, depth = 2, label = 'n' }: Options): number {
  return size * depth + label.length;
}

const base: Vec = { x: 1, y: 2, z: 3 };
const opts: Options[] = [{}, { size: 3 }, { depth: 5, label: 'abc' }, { size: 1, depth: 1, label: '' }];

const start = performance.now();
let total = 0;
let a = 1;
let b = 2;
for (let i = 0; i < 4_500_000; i++) {
  const moved: Vec = { ...base, x: i & 255 };
  const { x, y, z } = moved;
  total += x + y + z;
  total += area(opts[i & 3]);
  [a, b] = [b, a + (i & 1)];
  const [first, second] = [x, y];
  total += first - second;
}
total += a + b;
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
