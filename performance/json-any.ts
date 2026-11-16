// perf: `JSON.parse` into `any` and walking the result, `JSON.stringify` of objects built as `any`
import { performance } from 'node:perf_hooks';

const items: any[] = [];
for (let i = 0; i < 2000; i++) {
  const item: any = { id: i, name: `item ${i}`, ok: (i & 1) === 0, tags: ['a', 'b', `t${i & 7}`] };
  if ((i & 3) === 0) item.extra = { depth: i & 15, note: null };
  items.push(item);
}
const text = JSON.stringify({ count: items.length, items });

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 180; pass++) {
  const doc: any = JSON.parse(text);
  const list: any[] = doc.items;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    total += it.id & 7;
    total += it.tags.length;
    if (it.ok) total++;
    if (it.extra) total += it.extra.depth;
  }
  const out: any = { pass, first: list[pass], size: doc.count };
  total += JSON.stringify(out).length + JSON.stringify(list.slice(0, 200)).length;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
