// Nullable primitives (T | null): comparison, reassignment, and ??=
let x: number | null = null;
assert(x === null, 'null check failed');
assert(!(x === 5), 'null !== value failed');

x = 5;
assert(x === 5, 'value check failed');
assert(x !== 3, 'neq check failed');
assert(x !== null, 'not-null check failed');

let name: string | null = 'Alice';
assert(name === 'Alice', 'string nullable eq failed');
name = null;
assert(name === null, 'string nullable null failed');

// ??= end to end (assign-if-nil, then compare)
let y: number | null = null;
y ??= 10;
assert(y === 10, `??= assign failed: ${y}`);
y ??= 99;
assert(y === 10, '??= no-op failed');

let z: string | null = 'set';
z ??= 'default';
assert(z === 'set', '??= string no-op failed');
