function sum(...n: number[]): number { return n.reduce((s, x) => s + x, 0); }
assert(sum(1, 2, 3) === 6, 'rest');
