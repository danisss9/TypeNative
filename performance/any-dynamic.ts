// perf: property reads and writes on `any` objects (nested objects, arrays)
import { performance } from 'node:perf_hooks';

const records: any[] = [];
for (let i = 0; i < 10_000; i++) {
  records.push({ id: i, name: 'item' + i, price: i % 100, tags: ['a', 'b'], meta: { score: i % 7 } });
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 2500; pass++) {
  for (const r of records) {
    total += r.price + r.meta.score + r.tags.length;
    r.price = r.price < 99 ? r.price + 1 : 0;
    if (r.name.length > 6) total++;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
