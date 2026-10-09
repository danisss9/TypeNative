interface A { a: number }
interface B extends A { b: number }
const v: B = { a: 1, b: 2 };
assert(v.a + v.b === 3, 'interface extends');
