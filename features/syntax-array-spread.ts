const a = [1, 2];
const b = [0, ...a, 3];
assert(b.length === 4 && b[3] === 3, 'array spread');
