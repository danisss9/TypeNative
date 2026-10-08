const m = new Map<string, number>([['a', 1]]);
m.set('b', 2);
assert(m.size === 2 && m.get('a') === 1 && m.has('b') && !m.has('c'), 'map');
