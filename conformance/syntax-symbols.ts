const s = Symbol('id');
const o: Record<symbol, number> = { [s]: 1 };
assert(o[s] === 1, 'symbol');
