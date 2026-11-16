// perf: `Object.keys` / `values` / `entries` and `for…in` over typed objects and class instances
import { performance } from 'node:perf_hooks';

interface Config {
  width: number;
  height: number;
  depth: number;
  scale: number;
  offset: number;
}

class Point {
  x: number;
  y: number;
  z: number;
  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

const configs: Config[] = [];
const points: Point[] = [];
for (let i = 0; i < 256; i++) {
  configs.push({ width: i, height: i + 1, depth: i & 7, scale: 2, offset: i >> 2 });
  points.push(new Point(i, i * 2, i * 3));
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 2400; pass++) {
  for (let i = 0; i < configs.length; i++) {
    const c = configs[i];
    total += Object.keys(c).length;
    for (const v of Object.values(c)) total += v;
    for (const [k, v] of Object.entries(points[i])) total += k.length + v;
    for (const k in c) total += k.length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
