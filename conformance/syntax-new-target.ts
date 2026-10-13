class Base {
  kind: string;
  constructor() { this.kind = new.target.name; }
}
class Child extends Base {}
assert(new Base().kind === 'Base' && new Child().kind === 'Child', 'new.target');
abstract class Shape {
  constructor(public sides: number) {
    if (new.target === Shape) throw new Error('abstract');
  }
}
class Tri extends Shape { constructor() { super(3); } }
class Equi extends Tri {}
assert(new Equi().sides === 3, 'new.target through super chains');
