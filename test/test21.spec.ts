// Map / Set

// --- Map ---
const m: Map<string, number> = new Map<string, number>();
m.set('a', 1);
m.set('b', 2);
m.set('c', 3);

assert(m.has('a') === true, 'Map.has — existing key');
assert(m.has('z') === false, 'Map.has — missing key');
assert(m.get('a') === 1, 'Map.get — existing key');
assert(m.size === 3, 'Map.size');

m.delete('b');
assert(m.has('b') === false, 'Map.delete — key removed');
assert(m.size === 2, 'Map.size after delete');

const m2: Map<string, number> = new Map<string, number>([
  ['x', 10],
  ['y', 20]
]);
assert(m2.get('x') === 10, 'Map constructor with entries — x');
assert(m2.get('y') === 20, 'Map constructor with entries — y');
assert(m2.size === 2, 'Map constructor with entries — size');

// --- Set ---
const s: Set<string> = new Set<string>();
s.add('hello');
s.add('world');
s.add('hello'); // duplicate, should not grow

assert(s.has('hello') === true, 'Set.has — existing value');
assert(s.has('foo') === false, 'Set.has — missing value');
assert(s.size === 2, 'Set.size');

s.delete('world');
assert(s.has('world') === false, 'Set.delete — value removed');
assert(s.size === 1, 'Set.size after delete');

const ss: Set<number> = new Set<number>([1, 2, 3]);
assert(ss.has(1) === true, 'Set constructor with values — 1');
assert(ss.has(4) === false, 'Set constructor with values — 4 not present');
assert(ss.size === 3, 'Set constructor with values — size');

// --- For...of on Set ---
let setSum = 0;
const numSet: Set<number> = new Set<number>([1, 2, 3, 4, 5]);
for (const v of numSet) {
  setSum = setSum + v;
}
assert(setSum === 15, 'for...of Set — sum of values');

// --- For...of on Map ---
let mapSum = 0;
const numMap: Map<string, number> = new Map<string, number>([
  ['a', 10],
  ['b', 20],
  ['c', 30]
]);
for (const [, v] of numMap) {
  mapSum = mapSum + v;
}
assert(mapSum === 60, 'for...of Map — sum of values');
