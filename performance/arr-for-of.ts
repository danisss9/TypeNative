// perf: `for…of`, `forEach`, `find` / `findIndex` and `entries()` over arrays of objects
import { performance } from 'node:perf_hooks';

interface Row {
  id: number;
  qty: number;
  active: boolean;
}

const rows: Row[] = [];
for (let i = 0; i < 2048; i++) rows.push({ id: i, qty: (i * 7) & 63, active: (i & 3) !== 0 });

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 3000; pass++) {
  for (const r of rows) if (r.active) total += r.qty;
  rows.forEach((r) => {
    total += r.id & 1;
  });
  for (const [i, r] of rows.entries()) total += (i ^ r.qty) & 3;
  const target = (pass * 5) & 2047;
  const hit = rows.find((r) => r.id === target);
  total += hit ? hit.qty : 0;
  total += rows.findIndex((r) => r.qty === (pass & 63));
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
