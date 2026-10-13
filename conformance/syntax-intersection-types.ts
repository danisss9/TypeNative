type A = { a: number };
type B = { b: number };
const ab: A & B = { a: 1, b: 2 };
assert(ab.a + ab.b === 3, 'intersection');
