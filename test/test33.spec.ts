// Destructured parameters in functions and arrow functions
interface Options {
  width: number;
  height: number;
}

function area({ width, height }: Options): number {
  return width * height;
}

const opts: Options = { width: 3, height: 4 };
assert(area(opts) === 12, `area failed: ${area(opts)}`);

// Arrow function with object destructuring
const perimeter = ({ width, height }: Options): number => 2 * (width + height);
assert(perimeter(opts) === 14, `perimeter failed: ${perimeter(opts)}`);

// Renamed binding: { width: w }
function widthOf({ width: w }: Options): number {
  return w;
}
const opts2: Options = { width: 5, height: 9 };
assert(widthOf(opts2) === 5, `widthOf failed: ${widthOf(opts2)}`);

// Array destructuring parameter
function firstTwo([a, b]: number[]): number {
  return a + b;
}
const pair: number[] = [10, 20];
assert(firstTwo(pair) === 30, `firstTwo failed: ${firstTwo(pair)}`);
