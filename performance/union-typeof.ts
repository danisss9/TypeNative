// perf: `typeof`, `instanceof` and `Array.isArray` narrowing of a five-way union (string, number, boolean, class, array)
import { performance } from 'node:perf_hooks';

class Box {
  inner: number;
  constructor(inner: number) {
    this.inner = inner;
  }
}

type Value = string | number | boolean | Box | number[];

function weigh(v: Value): number {
  if (typeof v === 'number') return v & 15;
  if (typeof v === 'string') return v.length;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Box) return v.inner;
  if (Array.isArray(v)) return v.length;
  return -1;
}

const values: Value[] = [];
for (let i = 0; i < 1024; i++) {
  const kind = i & 7;
  if (kind < 2) values.push(i);
  else if (kind < 4) values.push(`s${i}`);
  else if (kind === 4) values.push((i & 8) !== 0);
  else if (kind < 7) values.push(new Box(i & 63));
  else values.push([i, i]);
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 24000; pass++) {
  for (let i = 0; i < values.length; i++) total += weigh(values[i]);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
