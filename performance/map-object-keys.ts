// perf: `Map<object, number>` `set` / `get` / `has` / `delete` using object-identity keys
import { performance } from 'node:perf_hooks';

class Node {
  id: number;
  kind: string;
  constructor(id: number, kind: string) {
    this.id = id;
    this.kind = kind;
  }
}

const nodes: Node[] = [];
for (let i = 0; i < 8192; i++) {
  nodes.push(new Node(i, (i & 1) === 0 ? 'ident' : 'call'));
}

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 160; pass++) {
  const m = new Map<Node, number>();
  for (let i = 0; i < nodes.length; i++) {
    m.set(nodes[i], i + pass);
  }
  for (let i = 0; i < nodes.length; i++) {
    const k = nodes[(i * 131 + pass) & 8191];
    if (m.has(k)) total += m.get(k) ?? 0;
  }
  for (let i = 0; i < nodes.length; i += 4) {
    m.delete(nodes[i]);
  }
  total += m.size;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
