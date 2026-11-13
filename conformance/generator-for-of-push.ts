// for…of over a sync generator runs its push form (no goroutine): the loop
// body runs inside yield. Everything observable must stay as in JS: break and
// return run the generator's finally blocks, a throw from the loop body is
// never caught by the generator's catch, a throw from the generator reaches
// the loop, yield* nests, and state is seen in step
const log: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function* count(n: number): Generator<number> {
  try {
    for (let i = 0; i < n; i++) yield i;
    log.push('count done');
  } finally {
    log.push(`count finally ${n}`);
  }
}

// 1. Full run, break, and return out of the loop
let sum = 0;
for (const i of count(5)) sum += i;
check('sum', sum, 10);
check('full log', log.join('|'), 'count done|count finally 5');
log.length = 0;
for (const i of count(10)) {
  if (i === 3) break;
}
check('break log', log.join('|'), 'count finally 10');
log.length = 0;
function firstOver(limit: number): number {
  for (const i of count(100)) {
    if (i > limit) return i;
  }
  return -1;
}
check('return value', firstOver(6), 7);
check('return log', log.join('|'), 'count finally 100');
log.length = 0;

// 2. A throw from the loop body passes the generator's catch, runs its finally
function* guarded(): Generator<string> {
  try {
    yield 'a';
    yield 'b';
  } catch (e) {
    log.push('generator caught');
  } finally {
    log.push('guarded finally');
  }
}
try {
  for (const v of guarded()) {
    if (v === 'a') throw new Error('from body');
  }
} catch (e) {
  log.push(`loop caught ${(e as Error).message}`);
}
check('body throw', log.join('|'), 'guarded finally|loop caught from body');
log.length = 0;

// 3. A throw from the generator reaches the loop; its own catch sees its own throws
function* failing(): Generator<number> {
  try {
    yield 1;
    throw new Error('inner');
  } catch (e) {
    log.push(`own catch ${(e as Error).message}`);
    yield 2;
  }
  yield 3;
  throw new Error('outer');
}
const seen: number[] = [];
try {
  for (const v of failing()) seen.push(v);
} catch (e) {
  log.push(`loop caught ${(e as Error).message}`);
}
check('failing values', seen.join(','), '1,2,3');
check('failing log', log.join('|'), 'own catch inner|loop caught outer');
log.length = 0;

// 4. yield* nesting, break inside nested delegation
function* inner(tag: string): Generator<string> {
  try {
    yield `${tag}1`;
    yield `${tag}2`;
  } finally {
    log.push(`inner finally ${tag}`);
  }
}
function* outer(): Generator<string> {
  try {
    yield* inner('x');
    yield 'mid';
    yield* inner('y');
    yield* ['arr1', 'arr2'];
  } finally {
    log.push('outer finally');
  }
}
const all: string[] = [];
for (const v of outer()) all.push(v);
check('nested values', all.join(','), 'x1,x2,mid,y1,y2,arr1,arr2');
check('nested log', log.join('|'), 'inner finally x|inner finally y|outer finally');
log.length = 0;
for (const v of outer()) {
  if (v === 'y1') break;
}
check('nested break log', log.join('|'), 'inner finally x|inner finally y|outer finally');
log.length = 0;

// 5. Methods, *[Symbol.iterator], this, state seen in step, subclasses
class Bag {
  items: number[] = [];
  reads = 0;
  add(n: number): void {
    this.items.push(n);
  }
  *[Symbol.iterator](): Generator<number> {
    for (let i = 0; i < this.items.length; i++) {
      this.reads++;
      yield this.items[i];
    }
  }
  *pairs(step: number): Generator<number> {
    for (let i = 0; i + step < this.items.length; i += step) yield this.items[i] + this.items[i + step];
  }
}
class SortedBag extends Bag {
  add(n: number): void {
    super.add(n);
    this.items.sort((a, b) => a - b);
  }
}
const bag = new Bag();
for (const n of [5, 1, 4]) bag.add(n);
const order: string[] = [];
for (const n of bag) {
  order.push(`${n}:${bag.reads}`);
  if (n === 5) bag.add(9); // seen: the loop reads items.length each step
}
check('bag order', order.join(','), '5:1,1:2,4:3,9:4');
let pairSum = 0;
for (const p of bag.pairs(2)) pairSum += p;
check('pairs', pairSum, 9);
const sorted = new SortedBag();
for (const n of [3, 1, 2]) sorted.add(n);
const sortedOut: number[] = [];
for (const n of sorted.pairs(1)) sortedOut.push(n);
check('subclass generator method', sortedOut.join(','), '3,5');

// 6. Nested loops over the same generator, continue, labeled break
let pairs = 0;
outerLoop: for (const a of count(4)) {
  for (const b of count(4)) {
    if (b === a) continue;
    if (a === 3 && b === 1) break outerLoop;
    pairs++;
  }
}
check('nested loops', pairs, 3 + 3 + 3 + 1);
check('nested finally count', log.filter((l) => l === 'count finally 4').length, 5);
log.length = 0;

// 7. A generator used as a value still works (next() and spread)
const it = count(3);
check('next', it.next().value, 0);
check('spread', [...count(3)].join(','), '0,1,2');
console.log('ok');
