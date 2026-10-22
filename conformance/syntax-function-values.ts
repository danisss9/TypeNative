// call / apply / bind on functions; fn.name and fn.length
function add(a: number, b: number): number { return a + b; }
function greet(greeting: string, name: string = 'you'): string { return `${greeting}, ${name}`; }
const mul = (a: number, b: number): number => a * b;
class Shape {}
assert(add.call(null, 1, 2) === 3 && add.apply(null, [3, 4]) === 7, 'call / apply on a declaration');
const add5 = add.bind(null, 5);
assert(add5(10) === 15 && greet.bind(null, 'hi')('bob') === 'hi, bob', 'bind');
assert(mul.bind(null, 2)(21) === 42 && mul.apply(null, [6, 7]) === 42, 'bind / apply on an arrow');
assert(add.name === 'add' && mul.name === 'mul' && Shape.name === 'Shape', 'name');
assert(add.length === 2 && greet.length === 1 && mul.length === 2, 'length');
