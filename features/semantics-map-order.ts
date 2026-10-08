const m = new Map<string, number>();
m.set('z', 1); m.set('a', 2); m.set('m', 3);
let k = '';
for (const [key] of m) k += key;
assert(k === 'zam', 'map order');
