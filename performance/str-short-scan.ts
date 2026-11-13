// perf: `charCodeAt(i)` / `s[i]` scans of many short (< 512 byte) lines
import { performance } from 'node:perf_hooks';

const lines: string[] = [];
for (let i = 0; i < 2000; i++) {
  lines.push(`  key_${i}: value ${i * 3} "quoted text" # a comment that pads the line out a bit more ${i}`);
}

const start = performance.now();
let idents = 0;
let digits = 0;
let quotes = 0;
for (let pass = 0; pass < 100; pass++) {
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const c = line.charCodeAt(i);
      if ((c >= 97 && c <= 122) || c === 95) idents++;
      else if (c >= 48 && c <= 57) digits++;
      else if (line[i] === '"') quotes++;
    }
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${idents * 1000000 + digits * 1000 + quotes}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
