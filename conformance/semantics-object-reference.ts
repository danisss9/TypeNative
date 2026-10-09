interface P { x: number }
const a: P = { x: 1 };
const b = a;
b.x = 2;
assert(a.x === 2 && a === b, 'objects are references');
