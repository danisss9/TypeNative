function f(a: number, b = 2): number { return a + b; }
assert(f(1) === 3 && f(1, 5) === 6, 'default');
