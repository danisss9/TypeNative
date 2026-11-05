// perf: viewing an `any` object as `Record<string, any>` and reading keys through it
import { performance } from 'node:perf_hooks';

const records: any[] = [];
for (let i = 0; i < 10_000; i++) {
  records.push({ id: i, name: 'item' + i, price: i % 100, tags: ['a', 'b'] });
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 200; pass++) {
  for (const r of records) {
    const bag: Record<string, any> = r;
    total += bag['price'] + bag['name'].length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
