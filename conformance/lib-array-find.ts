const a = [1, 5, 8];
assert(a.find((x) => x > 4) === 5 && a.findIndex((x) => x > 4) === 1 && a.findLast((x) => x > 4) === 8, 'find');
