const { x, y } = { x: 1, y: 2 };
const [a, , c] = [1, 2, 3];
assert(x + y + a + c === 7, 'destructuring');
