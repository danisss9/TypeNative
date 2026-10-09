const s = new Set<number>([1, 2, 2]);
s.add(3);
assert(s.size === 3 && s.has(2), 'set');
