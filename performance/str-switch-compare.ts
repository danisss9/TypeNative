// perf: `switch` over string values and `===` / `<` string comparisons (keyword lookup)
import { performance } from 'node:perf_hooks';

const SOURCE = 'function let const if else return while for of in class new this x y value';
const words = SOURCE.split(' ');

function keyword(w: string): number {
  switch (w) {
    case 'function':
      return 1;
    case 'let':
    case 'const':
      return 2;
    case 'if':
      return 3;
    case 'else':
      return 4;
    case 'return':
      return 5;
    case 'while':
    case 'for':
      return 6;
    case 'of':
    case 'in':
      return 7;
    case 'class':
      return 8;
    case 'new':
      return 9;
    case 'this':
      return 10;
    default:
      return 0;
  }
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 1_200_000; pass++) {
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    total += keyword(w);
    if (w === 'value') total++;
    if (w < words[(i + 1) & 15]) total++;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
