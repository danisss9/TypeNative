// perf: `split`, `join`, `indexOf`, `slice` and `trim` on CSV-like lines
import { performance } from 'node:perf_hooks';

const lines: string[] = [];
for (let i = 0; i < 1000; i++) lines.push(` id${i}, name ${i}, ${i * 7}, tag-${i % 17}, done `);
const csv = lines.join('\n');

const start = performance.now();
let sum = 0;
for (let pass = 0; pass < 200; pass++) {
  const rows = csv.split('\n');
  for (const row of rows) {
    const cells = row.split(',');
    sum += cells.length;
    const tag = cells[3].trim();
    sum += tag.slice(tag.indexOf('-') + 1).length;
    sum += cells.map((c) => c.trim()).join('|').length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${sum}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
