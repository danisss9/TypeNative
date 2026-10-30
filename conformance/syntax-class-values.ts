// Classes as values: picked at run time, passed as constructors, compared,
// and read back through .constructor
class Circle {
  r: number;
  constructor(r: number) {
    this.r = r;
  }
  area(): number {
    return Math.round(Math.PI * this.r * this.r);
  }
}
class Square {
  r: number;
  constructor(r: number) {
    this.r = r;
  }
  area(): number {
    return this.r * this.r;
  }
}
type Shape = Circle | Square;
function make(ctor: new (r: number) => Shape, r: number): Shape {
  return new ctor(r);
}
const Kind = Math.random() < 2 ? Square : Circle;
const shape = make(Kind, 3);
assert(shape instanceof Square && shape.area() === 9, 'a class chosen at run time');
assert(make(Circle, 1).area() === 3, 'a class passed as a constructor');
assert(shape.constructor === Square && shape.constructor !== Circle, '.constructor');
const registry: Record<string, new (r: number) => Shape> = { circle: Circle, square: Square };
assert(new registry.circle(2) instanceof Circle, 'classes stored in a record');
console.log(shape.area(), make(Circle, 1).area());
