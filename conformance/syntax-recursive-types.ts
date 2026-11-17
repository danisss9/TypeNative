// Self-referencing types: a struct with an array of itself, a nullable link
// and a recursive union
type Tree = { value: number; children: Tree[] };
function sum(t: Tree): number {
  let total = t.value;
  for (const child of t.children) total += sum(child);
  return total;
}
const tree: Tree = {
  value: 1,
  children: [
    { value: 2, children: [] },
    { value: 3, children: [{ value: 4, children: [] }] }
  ]
};
assert(sum(tree) === 10, 'a recursive object type');

interface Link {
  value: string;
  next: Link | null;
}
const head: Link = { value: 'b', next: { value: 'a', next: null } };
assert(head.next !== null && head.next.value === 'a', 'a nullable self-reference');

type Nested = number | Nested[];
function flatten(x: Nested): number {
  if (typeof x === 'number') return x;
  let total = 0;
  for (const item of x) total += flatten(item);
  return total;
}
const nested: Nested = [1, [2, [3]], 4];
assert(flatten(nested) === 10, 'a recursive union type');
