// perf: `?.` and `??` walking nullable links and optional fields
import { performance } from 'node:perf_hooks';

interface Meta {
  weight?: number;
  tag?: string;
}

class Node {
  value: number;
  next: Node | null = null;
  meta?: Meta;
  constructor(value: number) {
    this.value = value;
  }
}

let head: Node | null = null;
for (let i = 0; i < 4096; i++) {
  const n = new Node(i);
  if ((i & 3) === 0) n.meta = { weight: i & 15 };
  else if ((i & 3) === 1) n.meta = { tag: 't' };
  n.next = head;
  head = n;
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 2800; pass++) {
  let cur: Node | null = head;
  while (cur) {
    total += cur.meta?.weight ?? 1;
    // (not `cur.meta?.tag?.length ?? 0`: that doesn't compile yet, see the README)
    total += (cur.meta?.tag ?? '').length;
    total += cur.next?.next?.value ?? 0;
    cur = cur.next;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
