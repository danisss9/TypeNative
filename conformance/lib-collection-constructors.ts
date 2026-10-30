// new Map(iterable) / new Set(iterable) take any iterable: arrays, other
// Maps and Sets, generators, Object.entries(); null gives an empty one
function* pairs(): Generator<[string, number]> {
  yield ['a', 1];
  yield ['b', 2];
}
const fromGen = new Map(pairs());
assert(fromGen.size === 2 && fromGen.get('b') === 2, 'Map from a generator');
const copy = new Map(fromGen);
copy.set('c', 3);
assert(copy.size === 3 && fromGen.size === 2, 'Map from a Map is a copy');
const fromEntries = new Map(Object.entries({ x: 1, y: 2 }));
assert(fromEntries.get('y') === 2, 'Map from Object.entries');
const empty = new Map<string, number>(null);
assert(empty.size === 0, 'Map from null');
const s = new Set('hello');
assert(s.size === 4 && s.has('l'), 'Set from a string');
const s2 = new Set(fromGen.keys());
assert(s2.has('a') && s2.size === 2, 'Set from an iterator');
console.log(fromGen.size, copy.size, [...s].join(''));
const typed = new Map<string, number>([['x', 1]]);
const typedCopy = new Map(typed);
typedCopy.set('y', 2);
let sum = 0;
for (const [key, value] of typedCopy) sum += value;
assert(sum === 3 && typed.size === 1, 'typed Map copy; unread for-of bindings');
