const o: Record<string, number> = { a: 1, b: 2 };
let keys = 0;
for (const k in o) keys++;
assert(keys === 2, 'for in');
