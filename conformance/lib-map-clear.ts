const m = new Map<string, number>([['a', 1]]);
m.clear();
const s = new Set<number>([1]);
s.clear();
assert(m.size === 0 && s.size === 0, 'clear');
