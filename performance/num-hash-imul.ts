// perf: FNV-1a and murmur-style string hashing with `Math.imul`, `>>> 0` and `charCodeAt`
import { performance } from 'node:perf_hooks';

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const keys: string[] = [];
for (let i = 0; i < 1024; i++) keys.push(`key-${i}-${(i * 2654435761) >>> 20}`);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 4500; pass++) {
  for (let i = 0; i < keys.length; i++) {
    const h = mix(fnv1a(keys[i]) + pass);
    total += h & 1023;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
