// Object spread in struct literals
interface Point {
  x: number;
  y: number;
  z: number;
}

const base: Point = { x: 1, y: 2, z: 3 };
const moved: Point = { ...base, x: 10 };

assert(moved.x === 10, `moved.x should be 10, got ${moved.x}`);
assert(moved.y === 2, `moved.y should be unchanged (2), got ${moved.y}`);
assert(moved.z === 3, `moved.z should be unchanged (3), got ${moved.z}`);

// original should be unaffected (Go struct value-copy semantics)
assert(base.x === 1, `base.x should remain 1, got ${base.x}`);

const spreadOnly: Point = { ...base };
assert(spreadOnly.x === 1 && spreadOnly.y === 2 && spreadOnly.z === 3, 'plain spread copy should match original');
