const o = { n: 1, inc(): number { return this.n + 1; } };
assert(o.inc() === 2, 'object method');
