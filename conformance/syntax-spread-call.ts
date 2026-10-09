function f(a: number, b: number): number { return a * b; }
const args: [number, number] = [3, 4];
assert(f(...args) === 12, 'spread call');
