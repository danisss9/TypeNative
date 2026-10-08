const m = new Map<string, number>([['a', 1], ['b', 2]]);
let s = 0;
m.forEach((v) => (s += v));
assert(s === 3, 'map forEach');
