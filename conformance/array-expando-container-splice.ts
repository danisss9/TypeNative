// conformance-flags: --no-typecheck
// An array stored on an object as an added property, read back dynamically
// into another object's field and changed through it (splice, push) is the
// same array: the object sees every change (Babel's NodePath.container =
// node[listKey]; container.splice(from, 0, ...nodes) on program.body)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

class Node {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
}

class NodePath {
  node: any;
  container: any;
  listKey: string;
  constructor(node: any, listKey: string) {
    this.node = node;
    this.listKey = listKey;
    this.container = node[listKey];
  }
  insertBefore(from: number, nodes: Node[]): void {
    this.container.splice(from, 0, ...nodes);
  }
  append(node: Node): void {
    this.container.push(node);
  }
}

function startNode(type: string): any {
  return new Node(type);
}

const program = startNode('Program');
program.body = [new Node('ImportReact'), new Node('Function')];
const path = new NodePath(program, 'body');
path.insertBefore(0, [new Node('ImportRuntime')]);
check('unshifted', program.body.map((n: Node) => n.type).join(','), 'ImportRuntime,ImportReact,Function');
path.insertBefore(2, [new Node('A'), new Node('B')]);
check('middle', program.body.map((n: Node) => n.type).join(','), 'ImportRuntime,ImportReact,A,B,Function');
path.append(new Node('Last'));
check('pushed', program.body.length, 6);
check('same array', path.container === program.body, true);

// (through a function whose `this` is the path — Babel's
// _containerInsert.call(path, from, nodes))
function containerInsert(this: NodePath, from: number, nodes: Node[]): void {
  this.container.splice(from, 0, ...nodes);
}
const second = startNode('Program');
second.body = [new Node('ImportReact'), new Node('Function')];
const secondPath = new NodePath(second, 'body');
containerInsert.call(secondPath, 0, [new Node('ImportRuntime')]);
check('via this', second.body.map((n: Node) => n.type).join(','), 'ImportRuntime,ImportReact,Function');
console.log('ok');
