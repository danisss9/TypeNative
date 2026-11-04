// A grandchild class inherits its parent's override, not the grandparent's method
class A {
  m(): string {
    return 'A';
  }
  get g(): string {
    return 'gA';
  }
}
class B extends A {
  override m(): string {
    return 'B';
  }
  override get g(): string {
    return 'gB';
  }
}
class C extends B {}
const xs: A[] = [new A(), new B(), new C()];
const seen = xs.map((x) => x.m() + x.g).join(',');
console.log(seen, new C().m());
assert(seen === 'AgA,BgB,BgB', 'dispatch through the base type');
assert(new C().m() === 'B' && new C().g === 'gB', 'direct call');
