// Object.create(C.prototype): an instance of the class without running its
// constructor (the clone idiom); getPrototypeOf gives the class back. (Fields
// a constructor never set read as zero values, not undefined)
class Point {
  x = 0;
  y = 0;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  sum(): number {
    return this.x + this.y;
  }
  clone(): Point {
    const copy = Object.create(Object.getPrototypeOf(this)) as Point;
    copy.x = this.x;
    copy.y = this.y;
    return copy;
  }
}
const p = new Point(2, 3);
const c = p.clone();
assert(c instanceof Point && c.sum() === 5 && c !== p, 'clone through the prototype');
const blank = Object.create(Point.prototype) as Point;
blank.x = 1;
blank.y = 1;
assert(blank instanceof Point && blank.sum() === 2, 'an instance whose constructor did not run');
assert(Object.getPrototypeOf(p) === Object.getPrototypeOf(c), 'same prototype');
console.log(c.sum(), blank.sum());
