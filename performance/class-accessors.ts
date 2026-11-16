// perf: getters and setters, static fields and `super.m()` calls on class instances
import { performance } from 'node:perf_hooks';

class Counter {
  static created = 0;
  private _value = 0;
  constructor() {
    Counter.created++;
  }
  get value(): number {
    return this._value;
  }
  set value(v: number) {
    this._value = v & 0xffff;
  }
  step(n: number): number {
    return n + 1;
  }
}

class Doubling extends Counter {
  step(n: number): number {
    return super.step(n) * 2;
  }
  get twice(): number {
    return this.value * 2;
  }
}

const counters: Counter[] = [];
for (let i = 0; i < 256; i++) counters.push((i & 1) === 0 ? new Counter() : new Doubling());
const d = new Doubling();

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 20_000; pass++) {
  for (let i = 0; i < counters.length; i++) {
    const c = counters[i];
    c.value = c.value + (i & 7);
    total += c.step(i & 3);
  }
  d.value = pass;
  total += d.twice + Counter.created;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
