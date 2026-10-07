// class implements interface + constructor parameter properties
interface Shape { area(): number; }

class Circle implements Shape {
  constructor(private radius: number) {}
  area(): number { return 3.14 * this.radius * this.radius; }
}

class Rect implements Shape {
  constructor(public width: number, public height: number) {}
  area(): number { return this.width * this.height; }
}

const c = new Circle(2);
assert(Math.abs(c.area() - 12.56) < 0.01, `circle area failed: ${c.area()}`);

const r = new Rect(3, 4);
assert(r.area() === 12, `rect area failed: ${r.area()}`);
assert(r.width === 3, 'param property field access failed');
