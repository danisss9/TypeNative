interface P { x: number }
function move(p: P): void { p.x += 1; }
const p: P = { x: 1 };
move(p);
assert(p.x === 2, 'parameter mutation');
