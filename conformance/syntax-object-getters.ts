const o = { a: 2, get double(): number { return this.a * 2; } };
assert(o.double === 4, 'object getter');
