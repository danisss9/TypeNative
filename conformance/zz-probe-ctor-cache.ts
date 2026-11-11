// Temporary probe: a class constructor that returns a cached instance (Babel's
// Scope constructor does this through a WeakMap keyed by the AST node).
class Scope {
  path: any;
  tag: string = '';
  constructor(path: any) {
    const cached = scopeCache.get(path.node);
    if (cached && cached.path === path) {
      return cached;
    }
    scopeCache.set(path.node, this);
    this.path = path;
    this.tag = 'fresh';
  }
}

const scopeCache = new WeakMap<object, Scope>();

const node = { type: 'FunctionExpression' };
const p1 = { node };
const p2 = { node };

const a = new Scope(p1);
const b = new Scope(p1);
const c = new Scope(p2);

assert(a === b, 'same path returns the cached scope');
assert(a !== c, 'a different path gets a fresh scope');
assert(c.tag === 'fresh', 'fresh scope initialized');
assert(c.path === p2, 'path stored');
console.log('ok');
