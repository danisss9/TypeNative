const a = { x: 1, y: 2 };
const b = { ...a, y: 3 };
assert(b.x === 1 && b.y === 3, 'object spread');
