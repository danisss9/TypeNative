// Object literals passed directly as arguments — the struct type must be inferred
// from the parameter's contextual type (was previously emitted as an untyped `{}`).
interface Options {
  width: number;
  height: number;
}

function area({ width, height }: Options): number {
  return width * height;
}

// Object literal directly as a call argument (no intermediate typed variable)
assert(area({ width: 3, height: 4 }) === 12, `area failed: ${area({ width: 3, height: 4 })}`);

function makeSquare(side: number): Options {
  // Object literal in return position
  return { width: side, height: side };
}
const sq = makeSquare(5);
assert(sq.width === 5 && sq.height === 5, `makeSquare failed: ${sq.width}x${sq.height}`);

// Nested: object literal as argument whose field is itself typed
interface Box {
  size: Options;
  label: string;
}
function boxArea({ size }: Box): number {
  return size.width * size.height;
}
assert(boxArea({ size: { width: 2, height: 6 }, label: 'b' }) === 12, 'boxArea failed');
