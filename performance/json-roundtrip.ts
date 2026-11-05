// perf: `JSON.stringify` and `JSON.parse` of an array of nested objects
import { performance } from 'node:perf_hooks';

interface Item {
  id: number;
  name: string;
  price: number;
  tags: string[];
  dims: { w: number; h: number };
}

const items: Item[] = [];
for (let i = 0; i < 5000; i++) {
  items.push({ id: i, name: `item "${i}"`, price: i * 1.25, tags: ['x', 'y' + (i % 9)], dims: { w: i % 50, h: 3 } });
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 20; pass++) {
  const text = JSON.stringify(items);
  const back = JSON.parse(text) as Item[];
  total += text.length + back.length + back[pass].dims.w;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
