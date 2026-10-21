// Field initializers run after super() and the parameter properties (as in TS)
class Base {
  base = 10;
  constructor(public tag: string) {}
}
class Derived extends Base {
  doubled = this.k * 2;
  plusBase = this.base + 1;
  label = this.tag + '!';
  constructor(public k: number) {
    super('t');
    this.doubled += 100;
  }
}
const d = new Derived(3);
assert(d.doubled === 106, `parameter property before fields: ${d.doubled}`);
assert(d.plusBase === 11, 'parent fields before fields');
assert(d.label === 't!', 'parent parameter properties before fields');
class Plain {
  a = 1;
  b = this.a + 1;
  seen = 0;
  constructor(public z: number) { this.seen = this.b + this.z; }
}
assert(new Plain(5).seen === 7, 'fields before the constructor body');
