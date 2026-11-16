// perf: `replace` with a callback, `matchAll` with groups and `split` on a regex
import { performance } from 'node:perf_hooks';

const lines: string[] = [];
for (let i = 0; i < 512; i++) lines.push(`user=${i} role=r${i & 7}; size=${i * 3}, flag=${(i & 1) === 0}`);

const PAIR = /(\w+)=(\w+)/g;
const SEP = /[;,]\s*/;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 150; pass++) {
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i];
    const upper = s.replace(PAIR, (_m: string, k: string, v: string) => `${k.toUpperCase()}:${v.length}`);
    total += upper.length;
    for (const m of s.matchAll(PAIR)) total += m[1].length + (m.index ?? 0);
    total += s.split(SEP).length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
