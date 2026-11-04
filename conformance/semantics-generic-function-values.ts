// A generic function used as a value; groups[i].push(x); T[] parameters bind T;
// `return value` in a callback typed void
interface Op { kind: number; name: string }
interface Rule<T extends Op> { test: (op: T) => boolean; transform?: (ops: Array<T>) => Array<T>; }
function keepLast<T>(ops: Array<T>) { return ops.slice(ops.length - 1); }
function kindTest(kind: number): (op: Op) => boolean { return (op) => op.kind === kind; }
const ORDER: Array<Rule<Op>> = [{ test: kindTest(1), transform: keepLast }, { test: kindTest(2) }, { test: () => true }];
function reorder<T extends Op>(ops: Array<T>, ordering: Array<Rule<T>>): Array<T> {
  const groups = Array.from(ordering, () => new Array<T>());
  for (const op of ops) {
    const groupIndex = ordering.findIndex((o) => o.test(op));
    groups[groupIndex].push(op);
  }
  return groups.flatMap((group, i) => {
    const transform = ordering[i].transform;
    return transform ? transform(group) : group;
  });
}
function visitEach(ops: Op[], visitor: (op: Op, flag: number) => void): void { ops.forEach((o, i) => visitor(o, i)); }
const ops: Op[] = [{ kind: 2, name: 'a' }, { kind: 1, name: 'b' }, { kind: 3, name: 'c' }, { kind: 1, name: 'd' }];
const seen: string[] = [];
visitEach(ops, (op, flag) => { if (flag === 0) return; seen.push(op.name); return op; });
const text = [reorder(ops, ORDER).map((o) => o.name).join(','), keepLast([1, 2, 3]).join(','), seen.join('')].join(' ');
console.log(text);
assert(text === 'd,a,c 3 bcd', 'ordering');
