// A Map field handed to a generic static method whose parameter spells the
// value type differently (TreeNode<T> & { reactive } for DependencyNode &
// { reactive }) is the same map: what the method sets is in the field
// (the React Compiler's ReactiveScopeDependencyTreeHIR.#getOrCreateRoot)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type TreeNode<T extends string> = {
  properties: Map<string, TreeNode<T>>;
  accessType: T;
};
type DependencyNode = TreeNode<'Conditional' | 'Unconditional'>;
type HoistableNode = TreeNode<'Optional' | 'NonNull'>;
type Identifier = { id: number; name: string };

class DependencyTree {
  #hoistable: Map<Identifier, HoistableNode & { reactive: boolean }> = new Map();
  #deps: Map<Identifier, DependencyNode & { reactive: boolean }> = new Map();

  static #getOrCreateRoot<T extends string>(
    identifier: Identifier,
    reactive: boolean,
    roots: Map<Identifier, TreeNode<T> & { reactive: boolean }>,
    defaultAccessType: T,
  ): TreeNode<T> {
    let root = roots.get(identifier);
    if (root === undefined) {
      root = { properties: new Map(), reactive, accessType: defaultAccessType };
      roots.set(identifier, root);
    }
    return root;
  }

  addDependency(identifier: Identifier, path: string[]): void {
    let cursor = DependencyTree.#getOrCreateRoot(identifier, true, this.#deps, 'Unconditional');
    for (const property of path) {
      let next = cursor.properties.get(property);
      if (next === undefined) {
        next = { properties: new Map(), accessType: 'Unconditional' };
        cursor.properties.set(property, next);
      }
      cursor = next;
    }
    // (the node the generic method returned is the map's own node)
    cursor.accessType = 'Dependency' as any;
  }

  accessOf(identifier: Identifier): string {
    return this.#deps.get(identifier)?.accessType ?? 'none';
  }

  addHoistable(identifier: Identifier): void {
    DependencyTree.#getOrCreateRoot(identifier, false, this.#hoistable, 'NonNull');
  }

  roots(): string[] {
    return [...this.#deps.keys()].map((i) => i.name);
  }

  depth(identifier: Identifier): number {
    let n = 0;
    let node: DependencyNode | undefined = this.#deps.get(identifier);
    while (node && node.properties.size > 0) {
      node = [...node.properties.values()][0];
      n++;
    }
    return n;
  }
}

const count: Identifier = { id: 19, name: 'count' };
const props: Identifier = { id: 3, name: 'props' };
const tree = new DependencyTree();
tree.addDependency(count, []);
tree.addDependency(props, ['user', 'name']);
tree.addDependency(count, []);
tree.addHoistable(props);
check('roots', tree.roots().join(','), 'count,props');
check('depth', tree.depth(props), 2);
check('root written through', tree.accessOf(count), 'Dependency');
check('root of a path kept', tree.accessOf(props), 'Unconditional');
console.log('ok');
