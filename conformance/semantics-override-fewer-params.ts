// An override with fewer parameters than the method it overrides: inherited code passes them all
class Ast { constructor(public kids: Ast[] = [], public name = 'n') {} visit(v: RecursiveVisitor, ctx?: any): any { return v.visitAst(this, ctx); } }
class RecursiveVisitor {
  seen: string[] = [];
  visit(ast: Ast, context?: any): any { ast.visit(this, context); }
  visitAst(ast: Ast, context: any): any { this.seen.push(ast.name + ':' + context); for (const k of ast.kids) this.visit(k, context); }
}
class Combined extends RecursiveVisitor {
  override visit(node: Ast): void { this.seen.push('c'); node.visit(this, 'x'); }
}
class Deeper extends Combined {}
const tree = new Ast([new Ast([], 'a'), new Ast([], 'b')], 'root');
const c = new Combined(); c.visit(tree);
const d = new Deeper(); d.visit(tree);
const r = new RecursiveVisitor(); r.visit(tree, 'ctx');
const text = [c.seen.join(','), d.seen.join(','), r.seen.join(',')].join(' | ');
console.log(text);
assert(text === 'c,root:x,c,a:x,c,b:x | c,root:x,c,a:x,c,b:x | root:ctx,a:ctx,b:ctx', 'override arity');
