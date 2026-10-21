// Class methods without a return-type annotation infer it from their returns
class Shape {
  size = 4;
  area() { return this.size * this.size; }
  static unit() { return 'cm'; }
  #halve() { return this.size / 2; }
  half() { return this.#halve(); }
  sign(n: number) {
    if (n > 0) {
      return 'pos';
    } else {
      return 'neg';
    }
  }
  count() { const parts = [1, 2, 3]; return parts.length; }
  self() { return this; }
}
class Square extends Shape {}
const s = new Shape();
assert(s.area() + 1 === 17, 'instance method');
assert(Shape.unit() === 'cm', 'static method');
assert(s.half() === 2, 'private method');
assert(s.sign(1) === 'pos' && s.sign(-1) === 'neg', 'returns nested in if / else');
assert(s.count() === 3, 'return of a local');
assert(new Square().self().area() === 16, 'inherited `return this`');
function firstEven(values: number[]) {
  for (const v of values) {
    if (v % 2 === 0) return v;
  }
  return -1;
}
assert(firstEven([1, 3, 4]) === 4, 'function return nested in a loop');
