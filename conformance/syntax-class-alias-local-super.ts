// A class extending a const alias of a class, super() after validation in an
// else-if chain (one throwing branch), a class declared inside a function, and
// a `declare` field that has no runtime value.
class Base {
  constructor(public value: number) {}
}

const Alias = Base as unknown as typeof Base;

class Derived extends Alias {
  constructor(value: number) {
    if (value < 0) {
      throw new Error('negative');
    } else if (value === 0) {
      super(0);
    } else {
      super(value);
    }
    this.value += 1;
  }
}

class WithDeclared {
  declare tag: string;
  real: number = 7;
}

function makeLocal(): number {
  class Local extends Base {
    constructor() {
      super(3);
    }
  }
  return new Local().value;
}

if (new Derived(2).value !== 3) throw new Error('derived 2');
if (new Derived(0).value !== 1) throw new Error('derived 0');
if (makeLocal() !== 3) throw new Error('local');
const w = new WithDeclared();
if (w.real !== 7 || 'tag' in w) throw new Error('declare field');
console.log('class shapes ok');
