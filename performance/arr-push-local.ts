// perf: building many short arrays with `push` inside functions (locals and fields of new objects)
import { performance } from 'node:perf_hooks';

class Line {
  tokens: number[] = [];
  words: string[] = [];
}

const WORDS = ['let', 'x', '=', 'y', '+', '1', ';'];

// A lexer-style list: a local array, pushed into and returned
function scan(seed: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push((seed + i) & 255);
  return out;
}

// Pushes into the fields of a new object
function build(seed: number, count: number): Line {
  const line = new Line();
  for (let i = 0; i < count; i++) {
    line.tokens.push((seed ^ i) & 63);
    if ((i & 3) === 0) line.words.push(WORDS[i & 7] ?? '');
  }
  return line;
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 1_000_000; pass++) {
  const count = 4 + (pass & 63);
  const a = scan(pass, count);
  const line = build(pass, count);
  total += a.length + a[count - 1] + line.tokens.length + line.tokens[count >> 1] + line.words.length;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
