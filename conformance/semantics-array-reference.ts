const a = [1, 2];
const b = a;
b.push(3);
assert(a.length === 3, 'arrays are references');
