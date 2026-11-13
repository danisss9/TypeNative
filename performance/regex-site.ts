// perf: `/g` regex literals evaluated inside a hot function, and `.index` on long input
import { performance } from 'node:perf_hooks';

function tokenize(line: string): number {
  let count = 0;
  const word = /[A-Za-z_]\w*/g;
  let m: RegExpExecArray | null;
  while ((m = word.exec(line)) !== null) count += m[0].length;
  if (/^\s*#/.test(line)) count += 100;
  return count;
}

const lines: string[] = [];
for (let i = 0; i < 2000; i++) lines.push(`  item_${i} = compute(alpha, beta_${i & 7}) # note ${i}`);
const doc = lines.join('\n');

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 200; pass++) {
  for (const line of lines) total += tokenize(line);
}
const marker = /compute\(alpha, beta_3\)/g;
let m: RegExpExecArray | null;
while ((m = marker.exec(doc)) !== null) total += m.index & 1023;
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
