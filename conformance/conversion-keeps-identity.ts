// conformance-flags: --no-typecheck
// A class instance seen through an interface type (Babel's parser Node read as
// a t.Identifier) is the same object every time: Set / Map keys and ===
// find it, and fields written through it are seen by the next read
// (BuildHIR: hoistableIdentifiers.has(path.node) for binding.identifier)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

interface Identifier {
  type: 'Identifier';
  name: string;
}

class Node {
  type: string;
  start: number;
  name: string;
  constructor(type: string, name: string) {
    this.type = type;
    this.start = 0;
    this.name = name;
  }
}

class Binding {
  identifier: any;
  constructor(node: any) {
    this.identifier = node;
  }
}

function asIdentifier(value: any): Identifier {
  return value;
}

const node = new Node('Identifier', 'id');
const binding = new Binding(node);

const hoistable = new Set<Identifier>();
hoistable.add(asIdentifier(binding.identifier));
check('has', hoistable.has(asIdentifier(node)), true);
hoistable.delete(asIdentifier(node));
check('deleted', hoistable.size, 0);

const infos = new Map<Identifier, { reassigned: boolean }>();
infos.set(asIdentifier(node), { reassigned: false });
const info = infos.get(asIdentifier(binding.identifier));
check('map hit', info !== undefined, true);
check('same object', asIdentifier(node) === asIdentifier(binding.identifier), true);

// a field changed on the object after the first read is seen by the next
node.name = 'renamed';
check('refreshed', asIdentifier(node).name, 'renamed');
const other = new Node('Identifier', 'other');
check('distinct objects', asIdentifier(other) === asIdentifier(node), false);
console.log('ok');
