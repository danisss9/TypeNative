function f(x: number | string): string { return typeof x === 'number' ? 'n' : x.toUpperCase(); }
assert(f(1) === 'n' && f('a') === 'A', 'union');
