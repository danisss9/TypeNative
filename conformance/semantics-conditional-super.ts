// super(...) called inside if/else branches instead of as the first statement:
// every branch must initialize the parent before touching this. TypeScript
// only allows this in classes with no initialized properties (TS2401); the
// initialized-properties shape is syntax-conditional-super-initializers.ts.
class Shape {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Tagged extends Shape {
  tag: string;
  constructor(kind: string, size: number) {
    if (kind === 'circle') {
      super(`circle-${size}`);
      this.tag = 'round';
    } else if (kind === 'square') {
      super(`square-${size}`);
      this.tag = 'edgy';
    } else {
      super('unknown');
      this.tag = 'other';
    }
  }
}

const circle = new Tagged('circle', 3);
assert(circle.name === 'circle-3' && circle.tag === 'round', 'first branch super');
const square = new Tagged('square', 4);
assert(square.name === 'square-4' && square.tag === 'edgy', 'else-if branch super');
const other = new Tagged('blob', 5);
assert(other.name === 'unknown' && other.tag === 'other', 'else branch super');

// statements before the branches do not disturb which super runs
class Measured extends Shape {
  label: string;
  constructor(name: string, scale: number) {
    const scaled = scale > 0 ? `${name} x${scale}` : name;
    if (scale > 10) {
      super(scaled);
      this.label = 'big';
    } else {
      super(scaled);
      this.label = 'small';
    }
  }
}
assert(new Measured('dot', 2).label === 'small' && new Measured('dot', 2).name === 'dot x2', 'statements before branch supers');
assert(new Measured('dot', 12).label === 'big', 'second covered branch');
