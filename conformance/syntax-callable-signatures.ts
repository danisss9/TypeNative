type Adder = { (a: number, b: number): number };
const add: Adder = (a, b) => a + b;
interface Factory { new (n: number): Box }
class Box { constructor(public n: number) {} }
const make = (F: Factory, n: number): Box => new F(n);
assert(add(1, 2) === 3 && make(Box, 5).n === 5, 'callable / construct signatures');
