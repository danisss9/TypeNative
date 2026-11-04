// A class method implementing an interface whose parameters are any (or an
// interface): the Go signature widens, the body sees the declared types
class Block { constructor(public name: string) {} visit(v: Visitor, ctx: any): any { return v.visitBlock(this, ctx); } }
interface Visitor { visitBlock(block: Block, context: any): any; visitOther(n: number, context: any): any; }
function visitAll(v: Visitor, nodes: Block[], context: any = null): any[] { return nodes.map((n) => n.visit(v, context)); }
class Transform implements Visitor {
  visitBlock(block: Block, context: Block[]): string { context.push(block); return block.name + context.length; }
  visitOther(n: number, msg: { id: string }): any { return msg.id + n; }
}
class Sub extends Transform {}
const ctx: Block[] = [];
const text = [visitAll(new Transform(), [new Block('a'), new Block('b')], ctx).join(','), visitAll(new Sub(), [new Block('c')], ctx).join(','), new Sub().visitOther(1, { id: 'i' }), ctx.length].join(' ');
console.log(text);
assert(text === 'a1,b2 c3 i1 3', 'widened parameters');
