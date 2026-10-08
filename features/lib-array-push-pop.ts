const a = [1];
a.push(2, 3);
const p = a.pop();
assert(p === 3 && a.length === 2, 'push pop');
