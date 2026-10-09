let c = 0;
const a = c++;
const b = ++c;
assert(a === 0 && b === 2, 'increment as value');
