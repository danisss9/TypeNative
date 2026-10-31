// An optional array parameter may be absent: passing it on to a defaulted
// parameter (a call or super(…)) gives the default, `xs ?? []` the fallback
class Base {
  items: number[];
  label: string;
  constructor(items: number[] = [], label: string = 'base') {
    this.items = items;
    this.label = label;
  }
}
class Sub extends Base {
  constructor(items?: number[], label?: string) {
    super(items, label);
  }
}
function count(xs: number[] = [1]) {
  return xs.length;
}
function relay(xs?: number[]) {
  return count(xs);
}
function orEmpty(xs?: number[] | null) {
  return (xs ?? []).length;
}
assert(new Sub().items.length === 0 && new Sub().label === 'base', 'super gets the defaults');
assert(new Sub([1, 2]).items.length === 2 && new Sub([], 'x').label === 'x', 'super gets the arguments');
assert(relay() === 1 && relay([1, 2, 3]) === 3, 'a call gets the default');
assert(orEmpty() === 0 && orEmpty(null) === 0 && orEmpty([4]) === 1, '?? on an absent array');
console.log(new Sub().items.length, relay(), orEmpty([4]));
function splitPair(s: string): [string, string] | undefined {
  const i = s.indexOf(',');
  return i < 0 ? undefined : [s.slice(0, i), s.slice(i + 1)];
}
const none = splitPair('ab');
const pair = splitPair('a,b');
assert(!none && none === undefined, 'a function result of T[] | undefined stays undefined');
assert(!!pair && pair.join('|') === 'a|b', 'and a set result is the array');
const slots: (string | undefined)[] = [undefined, 'b'];
assert((slots[0] ?? 'dflt') === 'dflt' && (slots[1] ?? 'x') === 'b' && (slots[5] ?? 'oob') === 'oob', '?? over T | undefined elements');
