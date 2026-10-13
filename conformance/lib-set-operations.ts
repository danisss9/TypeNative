const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);
assert(a.union(b).size === 4 && a.intersection(b).size === 2 && a.difference(b).has(1) && a.isSubsetOf(new Set([1, 2, 3, 4])), 'set operations');
