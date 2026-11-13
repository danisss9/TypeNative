// Generators reached through a polymorphic receiver, and generators spread
// or passed to Array.from, run their push form. Everything observable must
// stay as in JS: values are produced lazily (the loop body sees each value
// before the generator resumes), break runs the generator's finally, a throw
// from the loop body skips the generator's catch, an override that returns an
// array (not a generator) is still iterated, and spread / Array.from collect
// every value in order, running finally blocks once
const log: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

abstract class Unit {
  items: number[] = [];
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  *ops(): Generator<number> {
    try {
      for (const x of this.items) {
        log.push(`${this.name} yields ${x}`);
        yield x;
      }
    } finally {
      log.push(`${this.name} finally`);
    }
  }
  abstract kind(): string;
}
class ViewUnit extends Unit {
  kind(): string {
    return 'view';
  }
}
class HostUnit extends Unit {
  kind(): string {
    return 'host';
  }
  // (an override with its own body: still a generator)
  override *ops(): Generator<number> {
    yield -1;
    yield* super.ops();
  }
}
class ArrayUnit extends Unit {
  kind(): string {
    return 'array';
  }
}

const view = new ViewUnit('v');
view.items = [1, 2, 3];
const host = new HostUnit('h');
host.items = [10, 20];
const units: Unit[] = [view, host];

// 1. for…of through the base class: lazy, in step with the loop body
for (const unit of units) {
  for (const op of unit.ops()) log.push(`body ${op}`);
}
check(
  'lazy',
  log.join('|'),
  'v yields 1|body 1|v yields 2|body 2|v yields 3|body 3|v finally|body -1|h yields 10|body 10|h yields 20|body 20|h finally'
);
log.length = 0;

// 2. The loop body changes what the generator reads next (JS sees it)
view.items = [1, 2, 3];
for (const unit of units.slice(0, 1)) {
  for (const op of unit.ops()) {
    if (op === 1) view.items[1] = 42;
    log.push(`${op}`);
  }
}
check('mutation seen', log.filter((l) => !l.includes(' ')).join(','), '1,42,3');
view.items = [1, 2, 3];
log.length = 0;

// 3. break runs finally; a throw from the body passes the generator
function firstOver(u: Unit, limit: number): number {
  for (const op of u.ops()) {
    if (op > limit) return op;
  }
  return -1;
}
check('return', firstOver(units[0], 1), 2);
check('return log', log.join('|'), 'v yields 1|v yields 2|v finally');
log.length = 0;
try {
  for (const op of units[1].ops()) {
    if (op === 10) throw new Error('stop');
  }
} catch (e) {
  log.push(`caught ${(e as Error).message}`);
}
check('throw log', log.join('|'), 'h yields 10|h finally|caught stop');
log.length = 0;

// 4. Spread and Array.from of a generator call
function* range(from: number, to: number): Generator<number> {
  try {
    for (let i = from; i < to; i++) yield i;
  } finally {
    log.push(`range finally ${from}`);
  }
}
const spread = [...range(0, 4)];
check('spread', spread.join(','), '0,1,2,3');
check('spread length', spread.length, 4);
const mixed = [-1, ...range(5, 7), 99, ...range(1, 2)];
check('mixed', mixed.join(','), '-1,5,6,99,1');
const from = Array.from(range(2, 5));
check('from', from.join(','), '2,3,4');
const mapped = Array.from(range(1, 4), (x, i) => x * 10 + i);
check('from map', mapped.join(','), '10,21,32');
check('range log', log.join('|'), 'range finally 0|range finally 5|range finally 1|range finally 2|range finally 1');
log.length = 0;
function sum(...xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}
check('spread args', sum(...range(1, 5)), 10);
check('empty', [...range(3, 3)].length, 0);
log.length = 0;

// 5. Spread and Array.from of a method generator and through the base
const viaMethod = [...view.ops()];
check('method spread', viaMethod.join(','), '1,2,3');
const viaBase = Array.from(units[1].ops());
check('base from', viaBase.join(','), '-1,10,20');
const all: number[] = [];
for (const u of units) all.push(...u.ops());
check('push spread', all.join(','), '1,2,3,-1,10,20');
log.length = 0;

// 6. Strings yielded, and the collected array is a fresh array
function* words(): Generator<string> {
  yield 'a';
  yield 'b';
}
const ws = [...words()];
ws.push('c');
check('words', ws.join(''), 'abc');
check('words again', [...words()].join(''), 'ab');

// 7. A throw from the generator while spreading propagates (after finally)
function* boom(): Generator<number> {
  try {
    yield 1;
    throw new Error('boom');
  } finally {
    log.push('boom finally');
  }
}
try {
  const xs = [...boom()];
  log.push(`no throw ${xs.length}`);
} catch (e) {
  log.push(`caught ${(e as Error).message}`);
}
check('boom', log.join('|'), 'boom finally|caught boom');
log.length = 0;

// 8. A subclass with no items still iterates (and runs finally)
const empty = new ArrayUnit('a');
check('empty unit', [...empty.ops()].length, 0);
check('empty kinds', units.map((u) => u.kind()).join(','), 'view,host');
check('empty log', log.join('|'), 'a finally');
console.log('ok');
