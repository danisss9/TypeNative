// perf: sync generators (a method, `*[Symbol.iterator]()`, `yield*`) consumed by `for…of`
import { performance } from 'node:perf_hooks';

class Op {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

class OpList {
  private items: Op[] = [];
  push(op: Op): void {
    this.items.push(op);
  }
  *[Symbol.iterator](): Generator<Op> {
    for (let i = 0; i < this.items.length; i++) yield this.items[i];
  }
  *reversed(): Generator<Op> {
    for (let i = this.items.length - 1; i >= 0; i--) yield this.items[i];
  }
}

function* range(n: number): Generator<number> {
  for (let i = 0; i < n; i++) yield i;
}

function* both(list: OpList): Generator<Op> {
  yield* list.reversed();
}

const list = new OpList();
for (let i = 0; i < 2000; i++) list.push(new Op(i));

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 500; pass++) {
  for (const op of list) total += op.value;
  for (const op of list.reversed()) total -= op.value >> 1;
  for (const i of range(2000)) total += i & 7;
  for (const op of both(list)) total += op.value & 3;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
