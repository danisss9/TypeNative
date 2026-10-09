const o: Record<string, number> = { a: 1, b: 2 };
assert(Object.keys(o).length === 2 && Object.values(o).reduce((s, x) => s + x, 0) === 3 && Object.entries(o).length === 2, 'object helpers');
