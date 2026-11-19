// perf: `Set<string>` `add` / `has` and ES2025 set operations (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`)
import { performance } from 'node:perf_hooks';

const keys: string[] = [];
for (let i = 0; i < 1024; i++) keys.push(`item_${i}`);

const a = new Set<string>();
const b = new Set<string>();
const sub = new Set<string>();
for (let i = 0; i < 512; i++) a.add(keys[i]);
for (let i = 256; i < 768; i++) b.add(keys[i]);
for (let i = 0; i < 256; i++) sub.add(keys[i]);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 2000; pass++) {
  const u = a.union(b);
  const inter = a.intersection(b);
  const diff = a.difference(b);
  const sym = a.symmetricDifference(b);
  const isSub = sub.isSubsetOf(a) ? 1 : 0;
  total += u.size + inter.size + diff.size + sym.size + isSub;
  if (u.has(keys[pass & 511])) total++;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
