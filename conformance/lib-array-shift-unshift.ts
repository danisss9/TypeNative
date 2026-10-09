const a = [2];
a.unshift(1);
const s = a.shift();
assert(s === 1 && a[0] === 2, 'shift unshift');
