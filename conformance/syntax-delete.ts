const o: Record<string, number> = { a: 1, b: 2 };
delete o.a;
assert(Object.keys(o).length === 1, 'delete');
