class R { *[Symbol.iterator]() { yield 1; yield 2; } }
let s = 0;
for (const v of new R()) s += v;
assert(s === 3, 'iterator');
