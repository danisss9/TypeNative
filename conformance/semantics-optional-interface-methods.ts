// Optional methods of a method interface: implementations may lack them or
// declare other signatures; `if (v.m)`, `v.m !== undefined` and `v.m?.()` test them
class Leaf { constructor(public v: number) {} accept(visitor: Visitor): string { return visitor.visitLeaf(this); } }
interface Visitor {
  visit?(node: Leaf): string;
  visitLeaf(leaf: Leaf): string;
  visitExtra?(n: number, ctx?: any): string;
}
function visitAll(visitor: Visitor, nodes: Leaf[]): string[] {
  const out: string[] = [];
  if (visitor.visit) {
    for (const n of nodes) out.push(visitor.visit(n));
  } else {
    for (const n of nodes) out.push(n.accept(visitor));
  }
  out.push(visitor.visitExtra !== undefined ? 'has-extra' : 'no-extra');
  out.push(visitor.visitExtra?.(7) ?? 'skipped');
  return out;
}
class Base { visit(node: Leaf, ctx?: any): string { return 'base' + node.v; } }
class Plain implements Visitor { visitLeaf(l: Leaf) { return 'leaf' + l.v; } }
class WithVisit extends Base implements Visitor {
  override visit(node: Leaf): string { return 'visit' + node.v; }
  visitLeaf(l: Leaf) { return 'never'; }
  visitExtra(n: number): string { return 'extra' + n; }
}
const nodes = [new Leaf(1), new Leaf(2)];
const results: string[] = [];
results.push(visitAll(new Plain(), nodes).join(','));
results.push(visitAll(new WithVisit(), nodes).join(','));
const lit: Visitor = { visitLeaf: (l) => 'lit' + l.v };
results.push(visitAll(lit, nodes).join(','));
const lit2: Visitor = { visitLeaf: (l) => 'lit' + l.v, visit: (n) => 'litvisit' + n.v };
results.push(visitAll(lit2, nodes).join(','));
class Inherits extends WithVisit {}
results.push(visitAll(new Inherits(), nodes).join(','));
console.log(results.join('\n'));
assert(results[0] === 'leaf1,leaf2,no-extra,skipped', 'class without the methods');
assert(results[1] === 'visit1,visit2,has-extra,extra7', 'class with them');
assert(results[2] === 'lit1,lit2,no-extra,skipped', 'literal without them');
assert(results[3] === 'litvisit1,litvisit2,no-extra,skipped', 'literal with one');
assert(results[4] === 'visit1,visit2,has-extra,extra7', 'inherited methods');
