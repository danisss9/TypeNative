class Counter { n = 0; inc(this: Counter): number { return ++this.n; } }
assert(new Counter().inc() === 1, 'this parameter');
