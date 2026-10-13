const a = [1, 2, 3, 4];
const b = a.toSpliced(1, 2, 9);
assert(b.join() === '1,9,4' && a.length === 4, 'toSpliced');
