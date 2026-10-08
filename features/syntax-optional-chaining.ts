const o: { a?: { b: number } } = {};
assert(o.a?.b === undefined, 'optional chaining');
