// A class that defines *[Symbol.iterator]() is iterable everywhere JS
// iterates: array destructuring (reading only as many values as it binds, so
// an endless one ends and its finally runs), spread into call and new
// arguments, and bag[Symbol.iterator]() as a generator of its own
const log: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

class Bag {
  items: number[] = [];
  constructor(...items: number[]) {
    this.items = items;
  }
  *[Symbol.iterator](): Generator<number> {
    try {
      for (const n of this.items) yield n;
    } finally {
      log.push('bag closed');
    }
  }
  first(): number {
    return this[Symbol.iterator]().next().value as number;
  }
}

class Naturals {
  *[Symbol.iterator](): Generator<number> {
    let n = 0;
    try {
      while (true) yield n++;
    } finally {
      log.push('naturals closed');
    }
  }
}

class Words extends Bag {}

const bag = new Bag(4, 9, 2);

// 1. Destructuring: fewer, as many, more (undefined → default), holes, rest
const [a] = bag;
check('one', a, 4);
const [b1, b2, b3] = bag;
check('three', `${b1},${b2},${b3}`, '4,9,2');
const [c1, , c3 = 7, c4 = 100] = bag;
check('holes and defaults', `${c1},${c3},${c4}`, '4,2,100');
const [head, ...rest] = bag;
check('rest', `${head}|${rest.join(',')}`, '4|9,2');
check('closed each time', log.length, 4);
log.length = 0;

// 2. An endless iterator: only what is bound is read, then it closes
const [z0, z1, z2] = new Naturals();
check('endless', `${z0},${z1},${z2}`, '0,1,2');
check('endless closed', log.join('|'), 'naturals closed');
log.length = 0;

// 3. Spread into calls and constructors
function sum(...xs: number[]): number {
  return xs.reduce((acc, x) => acc + x, 0);
}
check('Math.max', Math.max(...bag), 9);
check('Math.min', Math.min(...bag), 2);
check('rest param', sum(...bag), 15);
check('mixed args', sum(1, ...bag, 10), 26);
const copy = new Bag(...bag);
check('new spread', copy.items.join(','), '4,9,2');
const pushed: number[] = [0];
pushed.push(...bag);
check('push spread', pushed.join(','), '0,4,9,2');
log.length = 0;

// 4. bag[Symbol.iterator]() is a generator: next(), done, spread, for…of
const it = bag[Symbol.iterator]();
const r1 = it.next();
check('next value', r1.value, 4);
check('next done', r1.done, false);
it.next();
it.next();
check('exhausted', it.next().done, true);
check('spread iterator', [...bag[Symbol.iterator]()].join(','), '4,9,2');
let total = 0;
for (const n of bag[Symbol.iterator]()) total += n;
check('for-of iterator', total, 15);
check('this[Symbol.iterator]()', bag.first(), 4);

// 5. Subclasses inherit it
const words = new Words(5, 6);
const [w1, w2] = words;
check('subclass destructure', w1 + w2, 11);
check('subclass spread', Math.max(...words), 6);
check('subclass array spread', [...words].join(','), '5,6');
let wordTotal = 0;
for (const w of words) wordTotal += w;
check('subclass for-of', wordTotal, 11);
console.log('ok');
