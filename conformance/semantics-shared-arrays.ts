// Arrays are shared references, as in JS: a field passed to a function or
// returned from one is the same array, so a push or splice through it is
// seen by the owner
const o: any = { list: [] };
o.list.push(1);
o.list.push(2);
assert(o.list.length === 2, 'pushed through an any value');

interface Node {
  items: string[];
  sep?: string[];
}
function addTo(list: string[], v: string): void {
  list.push(v);
}
const node: Node = { items: [] };
addTo(node.items, 'a');
addTo(node.items, 'b');
assert(node.items.join() === 'a,b', 'a field passed to a function');

function target(n: Node): string[] {
  return n.sep ?? n.items;
}
target(node).push('c');
assert(node.items.length === 3, 'returned from a function');
node.sep = [];
target(node).push('x');
assert(node.sep.length === 1 && node.items.length === 3, 'the other field');
function dropFirst(list: string[]): void {
  list.splice(0, 1);
}
dropFirst(node.items);
assert(node.items.join() === 'b,c', 'spliced by a callee');
console.log(o.list, node.items, node.sep);
