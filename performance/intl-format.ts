// perf: `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.Collator` formatting and comparison
import { performance } from 'node:perf_hooks';

const numFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const collator = new Intl.Collator('en-US', { sensitivity: 'base' });

const amounts: number[] = [];
const dates: Date[] = [];
const words: string[] = [];
for (let i = 0; i < 1024; i++) {
  amounts.push(i * 12.345 + 0.5);
  dates.push(new Date(1700000000000 + i * 86400000));
  words.push(`Item-${String(i).padStart(4, '0')}`);
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 40; pass++) {
  for (let i = 0; i < 1024; i++) {
    total += numFmt.format(amounts[i]).length;
    total += dateFmt.format(dates[i]).length;
    total += collator.compare(words[i], words[(i + 1) & 1023]);
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
