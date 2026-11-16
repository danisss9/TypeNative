// perf: a `Record<string, number>` object literal used as a dictionary (`rec[k] ?? 0`, `k in rec`, `Object.keys`)
import { performance } from 'node:perf_hooks';

const WORDS: string[] = [];
for (let i = 0; i < 512; i++) WORDS.push(`w${(i * 7919) & 255}`);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 4000; pass++) {
  const counts: Record<string, number> = {};
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[(i + pass) & 511];
    counts[w] = (counts[w] ?? 0) + 1;
  }
  if ('w7' in counts) total += counts['w7'];
  if (!('missing' in counts)) total += 1;
  const keys = Object.keys(counts);
  total += keys.length;
  for (let k = 0; k < keys.length; k += 16) total += counts[keys[k]];
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
