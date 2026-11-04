// Iterating a linked list's *[Symbol.iterator]() while removing nodes, typed and held as any; [...iterable]
interface Node { v: number; next: Node | null; prev: Node | null; }
class List {
  head: Node = { v: -1, next: null, prev: null };
  tail: Node = { v: -2, next: null, prev: null };
  constructor() { this.head.next = this.tail; this.tail.prev = this.head; }
  push(v: number) { const n: Node = { v, next: this.tail, prev: this.tail.prev }; this.tail.prev!.next = n; this.tail.prev = n; }
  static remove(n: Node) { n.prev!.next = n.next; n.next!.prev = n.prev; n.next = n.prev = null; }
  *[Symbol.iterator](): Generator<Node> {
    let current = this.head.next!;
    while (current !== this.tail) { const next = current.next!; yield current; current = next; }
  }
}
const l = new List(); for (let i = 0; i < 6; i++) l.push(i);
const unit: any = { create: l };
for (const n of unit.create) if (n.v % 2 === 0) List.remove(n);
const seen: number[] = [];
for (const n of l) seen.push(n.v);
const typed: number[] = [];
for (const n of l) { if (n.v === 1) List.remove(n); typed.push(n.v); }
const text = [seen.join(','), typed.join(','), [...l].map((n) => n.v).join(',')].join(' ');
console.log(text);
assert(text === '1,3,5 1,3,5 3,5', 'iteration with removal');
