// A fresh small object converted to a wider object type (its fields a prefix
// of the target's) reads no memory past the object: the target's extra
// fields are absent, and writing them leaves the objects allocated next to
// it alone (a view of the small object as the wider struct would read and
// write the neighbor's memory)
type Small = { kind: string };
type Wide = { kind: string; label?: string; count?: number; next?: Small };

// (through an any value: the object converted at run time)
function widen(value: any): Wide {
  return value;
}

const smalls: { kind: string }[] = [];
const neighbors: { kind: string }[] = [];
for (let i = 0; i < 200; i++) {
  smalls.push({ kind: 'small' });
  neighbors.push({ kind: `neighbor-${i}` });
}

let absent = 0;
for (const small of smalls) {
  const wide = widen(small);
  if (wide.kind === 'small' && wide.label === undefined && wide.count === undefined && wide.next === undefined) absent++;
}
console.log('extra fields absent:', absent, 'of', smalls.length);

for (const small of smalls) {
  const wide = widen(small);
  wide.label = 'written';
  wide.count = 7;
  wide.next = { kind: 'next' };
  if (wide.label !== 'written' || wide.next.kind !== 'next') console.log('write lost');
}
let intact = 0;
neighbors.forEach((n, i) => {
  if (n.kind === `neighbor-${i}`) intact++;
});
console.log('neighbors intact:', intact, 'of', neighbors.length);

// a union member held in the union's slot is still the one object
type Leaf = { kind: 'leaf'; value: number };
type Branch = { kind: 'branch'; children: Leaf[] };
type Tree = Leaf | Branch;
const leaf: Leaf = { kind: 'leaf', value: 1 };
const trees: Tree[] = [];
trees.push(leaf);
const held = trees[0];
if (held.kind === 'leaf') held.value = 2;
console.log('leaf value:', leaf.value);
