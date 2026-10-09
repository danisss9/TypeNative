class P { constructor(public x: number, private y: number) {} sum(): number { return this.x + this.y; } }
assert(new P(1, 2).sum() === 3, 'parameter properties');
