// perf: backtracking RegExp (lookahead, lookbehind, backreferences) `test`, `exec` and `replace`
import { performance } from 'node:perf_hooks';

const lines: string[] = [];
for (let i = 0; i < 4000; i++) {
  const tag = i & 1 ? 'div' : 'span';
  const close = (i & 7) === 0 ? 'p' : tag;
  const word = (i & 3) === 0 ? 'the the' : 'the quick';
  lines.push(`<${tag}>item ${word} price=$${10 + (i & 255)} USD</${close}>`);
}

const tagRe = /<(\w+)>.*?<\/\1>/;
const dupWordRe = /\b(\w+)\s+\1\b/;
const priceRe = /(?<=\$)\d+(?=\s+USD)/g;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 80; pass++) {
  for (const line of lines) {
    const m = tagRe.exec(line);
    if (m !== null) total += m[1].length;
    if (dupWordRe.test(line)) total += 3;
    total += line.replace(priceRe, '99').length;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
