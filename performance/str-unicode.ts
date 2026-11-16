// perf: `length`, `charCodeAt`, `codePointAt` and `slice` on non-ASCII text (UTF-16 indexes)
import { performance } from 'node:perf_hooks';

const parts = ['naïve café', 'Straße', 'Ελληνικά', 'добрый день', '日本語のテキスト', 'smörgåsbord'];
const lines: string[] = [];
for (let i = 0; i < 400; i++) lines.push(`${parts[i & 3]} #${i} ${parts[(i >> 2) & 3]} ${parts[4 + (i & 1)]}`);
const big = lines.join('\n');

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 8400; pass++) {
  // a long string scanned by index
  for (let i = 0; i < big.length; i += 3) total += big.charCodeAt(i) & 255;
  // many short lines: length, codePointAt, slice
  for (let j = 0; j < lines.length; j++) {
    const s = lines[j];
    total += s.length;
    total += (s.codePointAt(s.length >> 1) ?? 0) & 127;
    total += s.slice(2, 9).length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
