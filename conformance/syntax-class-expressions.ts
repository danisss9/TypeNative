const Point = class {
  x: number;
  constructor(x: number) { this.x = x; }
  double(): number { return this.x * 2; }
};
const p = new Point(3);
assert(p.x === 3 && p.double() === 6, 'class expression');
