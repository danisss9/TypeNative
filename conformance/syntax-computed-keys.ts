const k = 'name';
const o: Record<string, number> = { [k]: 1 };
assert(o.name === 1, 'computed key');
