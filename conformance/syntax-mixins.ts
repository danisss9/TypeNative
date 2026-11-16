// Mixin class factories: a factory over `typeof Base` (an arrow, a function
// expression or a function declaration) makes a subclass with its own members;
// a function returning a subclass of a known class works too
class Base {
  x = 1;
  hello(): string { return 'base' + this.x; }
}

const Tagged = (superClass: typeof Base) =>
  class extends superClass {
    tag(): string { return 'tagged'; }
  };
const C = Tagged(Base);
const c = new C();
assert(c.x === 1 && c.hello() === 'base1', 'inherited state');
assert(c.tag() === 'tagged', 'mixin method');
assert(c instanceof Base, 'instanceof the base');

function FunctionTagged(superClass: typeof Base) {
  return class extends superClass {
    label(): string { return 'fn'; }
  };
}
const D = FunctionTagged(Base);
const d = new D();
assert(d.hello() === 'base1' && d.label() === 'fn', 'function declaration factory');

function makeExtra() {
  return class extends Base {
    extra = 2;
    more(): number { return this.x + this.extra; }
  };
}
const E = makeExtra();
const e = new E();
assert(e.hello() === 'base1', 'returned subclass inherits');
assert(e.extra === 2 && e.more() === 3, 'returned subclass members');
assert(e instanceof Base && e instanceof E, 'returned subclass instanceof');
console.log('syntax-mixins ok');
