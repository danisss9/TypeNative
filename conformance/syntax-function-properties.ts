// Properties set on functions (fn.prop = v), including a function value
// typed with call and property signatures
const BREAK = Symbol('break');
const walk: {
  (items: number[], fn: (n: number) => symbol | void): number;
  BREAK: symbol;
  sum(items: number[]): number;
} = function walk(items, fn) {
  let seen = 0;
  for (const n of items) {
    seen++;
    if (fn(n) === walk.BREAK) break;
  }
  return seen;
};
walk.BREAK = BREAK;
walk.sum = (items: number[]): number => items.reduce((a, b) => a + b, 0);

function tag(s: string): string {
  return tag.prefix + s;
}
tag.prefix = '#';

assert(walk([1, 2, 3, 4], (n) => (n === 2 ? walk.BREAK : undefined)) === 2, 'callable with a property');
assert(walk.sum([1, 2, 3]) === 6, 'method property');
assert(tag('x') === '#x', 'expando on a function declaration');
tag.prefix = '@';
assert(tag('y') === '@y', 'reassigned');
console.log(walk.sum([1, 2]), tag('z'));
