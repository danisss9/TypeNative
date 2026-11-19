// perf: `WeakMap` and `WeakSet` `set` / `get` / `has` / `add` on object instances
import { performance } from 'node:perf_hooks';

class AstNode {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}

const nodes: AstNode[] = [];
for (let i = 0; i < 8192; i++) nodes.push(new AstNode(i));

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 80; pass++) {
  const meta = new WeakMap<AstNode, number>();
  const visited = new WeakSet<AstNode>();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    meta.set(n, (i << 1) + pass);
    if ((i & 1) === 0) visited.add(n);
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[(i * 73 + pass) & 8191];
    const v = meta.get(n);
    if (v !== undefined) total += v;
    if (visited.has(n)) total++;
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
