// Properties of objects held as unions and any: reads, writes, arrays shared
// by reference, and values that must not change under a later write

type Leaf = { type: 'leaf'; name: string; size: number; note?: string; items: string[] };
type Branch = { type: 'branch'; name: string; size: number; items: any[] };
type Item = Leaf | Branch;

function nameOf(x: Item): string {
  return x.name;
}

const leaf: Item = { type: 'leaf', name: 'a', size: 1, items: [] };
const branch: Item = { type: 'branch', name: 'b', size: 2, items: [] };

// A value read stays what it was when the field changes
function keptAcrossWrite(x: any): string {
  const before = x.name;
  const sizeBefore = x.size;
  x.name = 'changed';
  x.size = 99;
  return `${before}:${sizeBefore}:${x.name}:${x.size}`;
}
assert(keptAcrossWrite({ name: 'n', size: 3 }) === 'n:3:changed:99', 'a value read is a copy');

function comparedThenWritten(x: any): string {
  if (x.type === 'leaf') {
    x.type = 'branch';
    return x.type === 'leaf' ? 'stale' : 'fresh';
  }
  return 'other';
}
assert(comparedThenWritten({ type: 'leaf' }) === 'fresh', 'a comparison reads the field now');

function switchedThenWritten(x: any): string {
  switch (x.type) {
    case 'leaf':
      x.type = 'branch';
      return 'first ' + x.type;
    case 'branch':
      return 'second';
    default:
      return 'none';
  }
}
assert(switchedThenWritten({ type: 'leaf' }) === 'first branch', 'a switch on a field');
assert(switchedThenWritten({ type: 'branch' }) === 'second', 'another case');
assert(switchedThenWritten({ type: 7 }) === 'none', 'a tag that is no string');
assert(switchedThenWritten({}) === 'none', 'no tag');

function switchFallsThrough(x: any): number {
  let n = 0;
  switch (x) {
    case 'a':
      n += 1;
    case 'b':
      n += 2;
      break;
    case 'c':
      n += 4;
  }
  return n;
}
assert(switchFallsThrough('a') === 3 && switchFallsThrough('b') === 2, 'fallthrough');
assert(switchFallsThrough('c') === 4 && switchFallsThrough(1) === 0, 'no match');

// Arrays in fields are shared with whoever holds them
function pushInto(x: any, v: any): void {
  x.items.push(v);
}
class Holder {
  items: number[] = [1];
}
const shared = new Holder();
pushInto(shared, 2);
shared.items.push(3);
assert(shared.items.length === 3 && shared.items[1] === 2 && shared.items[2] === 3, 'pushes reach the field');

const strings: { items: string[] } = { items: ['x'] };
pushInto(strings, 'y');
assert(strings.items.join() === 'x,y', 'a push onto an array of strings');
const numbers: { items: number[] } = { items: [] };
for (let i = 0; i < 100; i++) pushInto(numbers, i);
assert(numbers.items.length === 100 && numbers.items[99] === 99, 'pushes that grow an array of numbers');

pushInto(branch, leaf);
pushInto(branch, branch);
assert(branch.items.length === 2 && nameOf(branch.items[0]) === 'a', 'a push of objects');

// Writes: of the field's type, of another, and through a setter
class Temperature {
  celsius = 0;
  log: string[] = [];
  get fahrenheit(): number {
    return this.celsius * 1.8 + 32;
  }
  set fahrenheit(v: number) {
    this.log.push('set');
    this.celsius = (v - 32) / 1.8;
  }
}
function setKey(o: any, k: string, v: any): void {
  o[k] = v;
}
function setF(o: any, v: number): void {
  o.fahrenheit = v;
}
const temp = new Temperature();
setF(temp, 212);
assert(temp.celsius === 100 && temp.log.length === 1, 'a setter runs');
setKey(temp, 'celsius', 5);
assert((temp as any).fahrenheit === 41, 'a getter reads the new value');

const nullable: any = { note: 'x', count: 1 as number | undefined };
nullable.note = undefined;
nullable.count = undefined;
assert(nullable.note === undefined && !('note' in {}) && nullable.count === undefined, 'unsetting fields');

// Falsy values
function truth(o: any): string {
  return [o.a ? 1 : 0, o.b ? 1 : 0, o.c ? 1 : 0, o.d ? 1 : 0].join('');
}
assert(truth({ a: '', b: 0, c: false, d: null }) === '0000', 'falsy fields');
assert(truth({ a: 'x', b: 1, c: true, d: {} }) === '1111', 'truthy fields');

// Struct conversions: fields of the target only, nested values kept
type Wide = { a: string; b: number; c: string[]; d?: { e: number } };
type Narrow = { a: string; c: string[] };
function narrow(n: Narrow): string {
  return n.a + n.c.length;
}
const wide: Wide = { a: 'w', b: 1, c: ['p', 'q'], d: { e: 1 } };
assert(narrow(wide) === 'w2', 'a wider object as a narrower type');

const merged = Object.assign({ a: 'x', b: 1 }, { b: 2 }, { a: 'y' });
assert(merged.a === 'y' && merged.b === 2, 'Object.assign');

class Options {
  name = 'default';
  depth = 1;
  tags: string[] = [];
}
const options = Object.assign(new Options(), { name: 'custom', tags: ['t'] });
assert(options.name === 'custom' && options.depth === 1 && options.tags[0] === 't', 'Object.assign onto a class');
