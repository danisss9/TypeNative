// perf: lexer-style scan of a large string with `charCodeAt` and `str[i]`
import { performance } from 'node:perf_hooks';

const chunk = 'let value_1 = foo(bar, 42) + "text" * 3.5; // comment\n';
let text = '';
for (let i = 0; i < 40_000; i++) text += chunk;

const start = performance.now();
let idents = 0;
let digits = 0;
let quotes = 0;
for (let pass = 0; pass < 15; pass++) {
  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95) {
      while (i < text.length) {
        const d = text.charCodeAt(i);
        if (!((d >= 97 && d <= 122) || (d >= 65 && d <= 90) || d === 95 || (d >= 48 && d <= 57))) break;
        i++;
      }
      idents++;
    } else if (c >= 48 && c <= 57) {
      digits++;
      i++;
    } else {
      if (text[i] === '"') quotes++;
      i++;
    }
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${idents * 1000000 + digits * 1000 + quotes}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
