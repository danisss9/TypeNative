// perf: rest parameters, spread arguments `f(...args)`, default parameters and `.call` / `.apply` / `.bind`
import { performance } from 'node:perf_hooks';

function sum(...xs: number[]): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s;
}

function scaled(x: number, factor = 2, bias = 1): number {
  return x * factor + bias;
}

class Acc {
  base: number;
  constructor(base: number) {
    this.base = base;
  }
  add(a: number, b: number): number {
    return this.base + a + b;
  }
}

const acc = new Acc(3);
// (the original receiver: `.call` / `.bind` with another object ignore it in TypeNative, see the README)
const bound = acc.add.bind(acc);
const args = [1, 2, 3, 4];

const start = performance.now();
let total = 0;
for (let i = 0; i < 5_000_000; i++) {
  const k = i & 15;
  total += sum(k, 1, 2);
  total += sum(...args);
  total += scaled(k) + scaled(k, 3);
  total += acc.add.call(acc, k, 1);
  total += acc.add.apply(acc, [k, 2]);
  total += bound(k, 0);
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
