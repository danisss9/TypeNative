// A function taking a base interface and changing the fields of what it was
// given: the caller's object (of an extending interface) sees the changes
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

interface LocalRef {
  name: string;
  target: string;
}

interface ElementBase {
  kind: number;
  localRefs: LocalRef[] | number | null;
  slots: number;
}

interface ElementStart extends ElementBase {
  tag: string;
}

function ingestReferences(op: ElementBase, refs: string[]): void {
  if (!Array.isArray(op.localRefs)) throw new Error('expected an array');
  for (const name of refs) op.localRefs.push({ name, target: '' });
  op.slots += refs.length;
}

function createElementStart(tag: string): ElementStart {
  return { kind: 1, localRefs: [], slots: 1, tag };
}

const start = createElementStart('div');
ingestReferences(start, ['a', 'b']);
assert(Array.isArray(start.localRefs) && start.localRefs.length === 2, 'refs pushed to the caller object');
assert(start.slots === 3, `slots: ${start.slots}`);
assert(start.tag === 'div', 'own field kept');
const refs = start.localRefs as LocalRef[];
assert(refs.map((r) => r.name).join(',') === 'a,b', 'ref names');
console.log('ok');
