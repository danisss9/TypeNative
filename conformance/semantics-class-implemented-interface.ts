// An interface with properties that classes implement: values of it may be
// any of the classes (or an object literal)
interface Visitor {
  visitA(a: A): string;
  visitB(b: B): string;
}
interface Node {
  span: string;
  visit(v: Visitor): string;
}
interface Block extends Node {
  children: Node[];
}
class A implements Node {
  constructor(
    public span: string,
    public name: string
  ) {}
  visit(v: Visitor): string {
    return v.visitA(this);
  }
}
class B implements Block {
  constructor(
    public span: string,
    public children: Node[]
  ) {}
  visit(v: Visitor): string {
    return v.visitB(this);
  }
}
const out: string[] = [];
class Printer implements Visitor {
  visitA(a: A) {
    return 'A:' + a.name;
  }
  visitB(b: B) {
    this.visitAll(b.children);
    return 'B';
  }
  visitAll(nodes: Node[]) {
    for (const n of nodes) out.push(n.visit(this) + '@' + n.span);
  }
}
const as: A[] = [new A('1', 'x'), new A('2', 'y')];
const p = new Printer();
p.visitAll(as);
const nodes: Node[] = [new A('3', 'z'), new B('4', [new A('5', 'w')])];
p.visitAll(nodes);
const lit: Node = { span: '6', visit: (v) => 'literal' };
p.visitAll([lit]);
nodes[0].span = '9';
console.log(out.join(' '), nodes[0].span);
assert(out.join(' ') === 'A:x@1 A:y@2 A:z@3 A:w@5 B@4 literal@6', 'visits');
assert(nodes[0].span === '9', 'field write through the interface');
