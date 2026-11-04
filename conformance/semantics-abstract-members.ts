// Abstract classes: super.m() into an abstract parent's method; abstract properties
// implemented by subclasses as fields or accessors
class Expr { constructor(public text: string) {} }
abstract class Op {
  abstract readonly optional: boolean;
  abstract execute(): Expr | null;
  fallback(): Op | Expr { return new Expr('null!'); }
}
abstract class Base extends Op {
  constructor(protected dir: string, protected index?: number) { super(); }
  override get optional() { return true; }
  override execute(): Expr {
    const id = new Expr(this.dir + ':' + (this.index ?? -1));
    return id;
  }
}
class NonGeneric extends Base {
  override execute(): Expr {
    if (this.dir === '') throw new Error('bad');
    return super.execute();
  }
}
class Generic extends Base {
  override execute(): Expr { return new Expr('g' + super.execute().text); }
}
const ops: Op[] = [new NonGeneric('a'), new Generic('b', 2)];
const opsText = ops.map((o) => o.execute()!.text + o.optional).join(",");
abstract class Shape {
  abstract name: string;
  abstract readonly sides: number;
  describe(): string { return this.name + '/' + this.sides; }
}
class Square extends Shape { name = 'square'; get sides() { return 4; } }
class Tri extends Shape { get name() { return 'tri'; } readonly sides = 3; }
const shapes: Shape[] = [new Square(), new Tri()];
const shapesText = shapes.map((s) => s.describe() + ":" + s.name + s.sides).join(",");
console.log(opsText, shapesText);
assert(opsText === 'a:-1true,gb:2true', 'super into an abstract parent');
assert(shapesText === 'square/4:square4,tri/3:tri3', 'abstract properties');
