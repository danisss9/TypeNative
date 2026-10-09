function f({ a, b }: { a: number; b: number }): number { return a - b; }
assert(f({ a: 5, b: 2 }) === 3, 'param destructuring');
