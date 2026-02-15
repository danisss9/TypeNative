// Null and Undefined

// null literal
const aN: string | null = null;
assert(aN === null, 'a should be null');

// undefined literal
const bN: number | undefined = undefined;
assert(bN === undefined, 'b should be undefined');

// nullable with value
const cN: string | null = 'hello';
assert(cN !== null, 'c should not be null');

// nullable number with value
const dN: number | undefined = 42;
assert(dN !== undefined, 'd should not be undefined');

// class instance nullable
class Foo {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

const eN: Foo | null = null;
assert(eN === null, 'e should be null');

const fN: Foo | null = new Foo('bar');
assert(fN !== null, 'f should not be null');

console.log('Null and undefined tests passed!');
