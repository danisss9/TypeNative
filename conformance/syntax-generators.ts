function* gen() { yield 1; yield 2; }
let s = 0;
for (const v of gen()) s += v;
assert(s === 3, 'generator');
