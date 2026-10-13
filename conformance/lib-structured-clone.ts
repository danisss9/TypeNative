const original = { name: 'a', tags: ['x'], nested: { n: 1 } };
const copy = structuredClone(original);
copy.tags.push('y');
copy.nested.n = 2;
assert(original.tags.length === 1 && original.nested.n === 1 && copy.name === 'a', 'structuredClone');
