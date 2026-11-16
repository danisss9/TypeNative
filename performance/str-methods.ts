// perf: `startsWith` / `endsWith` / `includes`, case conversion, `padStart`, `repeat` and `replaceAll` with a string
import { performance } from 'node:perf_hooks';

const lines: string[] = [];
for (let i = 0; i < 256; i++) lines.push(`GET /api/v${i & 3}/items/${i}?Sort=Name&Page=${i >> 4} HTTP/1.1`);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 2500; pass++) {
  for (let i = 0; i < lines.length; i += 2) {
    const s = lines[i];
    if (s.startsWith('GET ')) total++;
    if (s.endsWith('1.1')) total++;
    if (s.includes('/v2/')) total += 2;
    total += s.toLowerCase().length + s.toUpperCase().charCodeAt(5);
    total += String(i).padStart(6, '0').length;
    total += s.replaceAll('/', '|').length;
    if ((i & 63) === 0) total += '-'.repeat(i >> 2).length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
