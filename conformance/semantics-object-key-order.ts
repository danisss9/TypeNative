const o: Record<string, number> = { z: 1, a: 2 };
assert(Object.keys(o).join('') === 'za', 'key order');
