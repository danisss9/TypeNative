// perf: regex `test`, `exec` with groups and global `replace` over log lines
import { performance } from 'node:perf_hooks';

const lines: string[] = [];
for (let i = 0; i < 5000; i++) {
  const day = String((i % 28) + 1).padStart(2, '0');
  const minute = String(i % 60).padStart(2, '0');
  const level = i % 3 === 0 ? 'ERROR' : 'INFO';
  lines.push(`2026-11-${day} 12:${minute} [${level}] user=${i} took ${i % 997}ms path=/api/v1/items/${i}`);
}

const lineRe = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) \[(\w+)\] user=(\d+) took (\d+)ms/;
const errorRe = /\[ERROR\]/;
const idRe = /\/(\d+)/g;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 60; pass++) {
  for (const line of lines) {
    const m = lineRe.exec(line);
    if (m !== null) total += Number(m[8]) + m[6].length;
    if (errorRe.test(line)) total++;
    total += line.replace(idRe, '/:id').length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
