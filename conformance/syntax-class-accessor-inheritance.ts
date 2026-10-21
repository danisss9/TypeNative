// Getters / setters are inherited; super.x reads the parent's getter; private accessors
class P {
  _v = 5;
  get v(): number { return this._v; }
  set v(x: number) { this._v = x; }
}
class Override extends P {
  get v(): number { return super.v + 1; }
}
class Inherit extends P {}
assert(new Override().v === 6, 'super.x on a getter');
const i = new Inherit();
i.v = 9;
assert(i.v === 9 && i._v === 9, 'inherited getter and setter');
class Priv {
  #raw = 2;
  get #x(): number { return this.#raw * 10; }
  set #x(n: number) { this.#raw = n; }
  read(): number { this.#x = 4; return this.#x; }
}
assert(new Priv().read() === 40, 'private accessors');
