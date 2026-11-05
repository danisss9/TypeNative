// perf: virtual method calls through an abstract base class and an interface
import { performance } from 'node:perf_hooks';

interface Shape {
  area(): number;
}

abstract class Base implements Shape {
  abstract area(): number;
  scaled(k: number): number {
    return this.area() * k;
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
}

const shapes: Base[] = [];
for (let i = 0; i < 1000; i++) shapes.push(i % 2 === 0 ? new Square(i % 10) : new Rect(i % 7, 3));
const asIface: Shape[] = shapes;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 25000; pass++) {
  for (let i = 0; i < shapes.length; i++) total += shapes[i].scaled(2);
  for (const s of asIface) total += s.area();
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
