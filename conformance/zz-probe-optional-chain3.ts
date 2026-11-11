// Temporary probe: a?.children.push(x) where the object is a nullable
// object-type value and the array holds a union of object types.
type ReactiveScopeNode = {
  kind: 'scope';
  id: number;
  scope: object;
};

type ValueBlockNode = {
  kind: 'node';
  id: number;
  valueRange: { start: number; end: number } | null;
  children: Array<ValueBlockNode | ReactiveScopeNode>;
};

function recordPlace(node: ValueBlockNode | null, id: number): void {
  node?.children.push({ kind: 'scope', scope: {}, id });
}

recordPlace(null, 0);

const node: ValueBlockNode = { kind: 'node', id: 1, valueRange: null, children: [] };
recordPlace(node, 2);
assert(node.children.length === 1, 'push through the optional chain');

const child = node.children[0];
assert(child.kind === 'scope', 'the pushed node is there');

console.log('ok');
