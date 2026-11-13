// Calls through an abstract base class or an interface whose implementations
// share the method's signature go through a typed dispatcher (no boxing).
// What JS does must not change: the receiver's own override runs with its
// own `this`, inherited methods dispatch to overrides they call, other
// classes satisfying the interface (or cast to it) still work,
// class results and null come back as they were, void methods run for their
// effects, and a call on null throws a TypeError
const log: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

interface Shape {
  area(): number;
  label(prefix: string): string;
}

abstract class Base implements Shape {
  abstract area(): number;
  label(prefix: string): string {
    return `${prefix}${this.name()}:${this.area()}`;
  }
  scaled(k: number): number {
    return this.area() * k;
  }
  abstract name(): string;
  touch(tag: string): void {
    log.push(`${this.name()} ${tag}`);
  }
  next(): Base | null {
    return null;
  }
}

class Square extends Base {
  side: number;
  constructor(side: number) {
    super();
    this.side = side;
  }
  area(): number {
    return this.side * this.side;
  }
  name(): string {
    return 'square';
  }
}

class Rect extends Base {
  w: number;
  h: number;
  constructor(w: number, h: number) {
    super();
    this.w = w;
    this.h = h;
  }
  area(): number {
    return this.w * this.h;
  }
  name(): string {
    return 'rect';
  }
  override next(): Base | null {
    return new Square(this.w);
  }
}

// (a subclass of a subclass, overriding the inherited method)
class Tall extends Rect {
  override area(): number {
    return super.area() * 2;
  }
  override name(): string {
    return 'tall';
  }
}

const shapes: Base[] = [new Square(3), new Rect(2, 5), new Tall(1, 4)];

// 1. Results through the base class
let sum = 0;
for (let i = 0; i < shapes.length; i++) sum += shapes[i].scaled(2);
check('scaled', sum, 2 * (9 + 10 + 8));
check('label', shapes.map((s) => s.label('#')).join(','), '#square:9,#rect:10,#tall:8');
check('negative zero', Object.is(shapes[0].scaled(-0), -0), true);
check('nan', Number.isNaN(shapes[1].scaled(NaN)), true);

// 2. Class results and null
const nexts = shapes.map((s) => s.next());
check('next null', nexts[0] == null, true);
check('next direct', shapes[0].next() === null || shapes[0].next() === undefined, true);
check('next class', nexts[1] instanceof Square, true);
check('next area', (nexts[1] as Base).area(), 4);
check('next chained', shapes[2].next()!.scaled(1), 1);

// 3. Void methods as statements
for (const s of shapes) s.touch('hit');
check('touch', log.join('|'), 'square hit|rect hit|tall hit');
log.length = 0;

// 4. Through the interface, including a class outside the base hierarchy
// and one cast in (the same array: an alias of shapes)
class Circle implements Shape {
  r: number;
  constructor(r: number) {
    this.r = r;
  }
  area(): number {
    return 3 * this.r * this.r;
  }
  label(prefix: string): string {
    return `${prefix}circle`;
  }
}
// (a class outside the hierarchy, cast in: the typed dispatcher's fallback)
class Stray {
  area(): number {
    return 7;
  }
  label(prefix: string): string {
    return `${prefix}stray`;
  }
}
const literal = new Stray() as unknown as Shape;
// 5. A parameter declared as the base class
function total(xs: Shape[], one: Base): number {
  let t = one.scaled(10);
  for (const x of xs) t += x.area();
  return t;
}
const base1 = shapes[1];
const all: Shape[] = shapes;
all.push(new Circle(2));
all.push(literal);
let areas = 0;
const labels: string[] = [];
for (const s of all) {
  areas += s.area();
  labels.push(s.label('>'));
}
check('iface areas', areas, 9 + 10 + 8 + 12 + 7);
check('iface labels', labels.join(','), '>square:9,>rect:10,>tall:8,>circle,>stray');
check('param', total(all, base1), 100 + 46);

// 6. A call on null throws a TypeError
const maybe: (Base | null)[] = [null];
try {
  (maybe[0] as Base).scaled(1);
  log.push('no throw');
} catch (e) {
  log.push(e instanceof TypeError ? 'TypeError' : `other ${String(e)}`);
}
check('null receiver', log.join('|'), 'TypeError');
console.log('ok');
