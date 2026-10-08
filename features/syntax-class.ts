class C { n = 1; inc(): number { return ++this.n; } }
assert(new C().inc() === 2, 'class');
