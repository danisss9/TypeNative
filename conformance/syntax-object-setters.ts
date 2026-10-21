// Object-literal setters (with a getter) and `this`
const o = {
  _v: 1,
  get v(): number { return this._v; },
  set v(x: number) { this._v = x * 2; },
};
o.v = 3;
assert(o._v === 6 && o.v === 6, 'object-literal setter');
