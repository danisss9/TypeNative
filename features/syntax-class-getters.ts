class C { private _v = 1; get v(): number { return this._v; } set v(x: number) { this._v = x; } }
const c = new C();
c.v = 5;
assert(c.v === 5, 'getters');
