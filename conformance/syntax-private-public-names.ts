// #x and x are different members; private fields stay out of JSON.stringify
class A {
  #x = 1;
  x = 2;
  static #n = 10;
  static n = 20;
  #half(): number { return this.#x * 5; }
  half(): number { return this.#half() + this.x; }
  get #g(): number { return this.#x + 100; }
  get g(): number { return this.#g + 1000; }
  static both(): number { return A.#n + A.n; }
}
const a = new A();
assert(a.x === 2 && a.half() === 7 && a.g === 1101 && A.both() === 30, 'private and public members');
assert(JSON.stringify(a) === '{"x":2}', JSON.stringify(a));
