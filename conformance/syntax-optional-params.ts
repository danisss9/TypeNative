function f(a: string, b?: string): string { return b ? a + b : a; }
assert(f('a') === 'a' && f('a', 'b') === 'ab', 'optional');
