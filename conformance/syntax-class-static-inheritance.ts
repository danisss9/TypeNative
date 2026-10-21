// Static members are inherited; Go builtin names (make) and #private statics
class Parent {
  static make(): number { return 4; }
  static label = 'P';
}
class Child extends Parent {}
class GrandChild extends Child {}
assert(Child.make() === 4 && GrandChild.make() === 4, 'inherited static method');
assert(Child.label === 'P', 'inherited static field');
class Counter {
  static #count = 3;
  static bump(): number { Counter.#count++; return Counter.#count; }
}
assert(Counter.bump() === 4 && Counter.bump() === 5, 'static private field');
