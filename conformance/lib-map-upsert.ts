// Map / WeakMap getOrInsert and getOrInsertComputed (ES2026 upsert)
const counts = new Map<string, number>();
for (const w of ['a', 'b', 'a', 'c', 'a']) {
  counts.set(w, counts.getOrInsert(w, 0) + 1);
}
console.log([...counts.entries()]);
assert(counts.get('a') === 3 && counts.get('b') === 1 && counts.size === 3, 'getOrInsert counts');

let computed = 0;
const lengths = new Map<string, number>();
const first = lengths.getOrInsertComputed('hello', (k) => {
  computed++;
  return k.length;
});
const again = lengths.getOrInsertComputed('hello', () => {
  computed++;
  return -1;
});
assert(first === 5 && again === 5 && computed === 1, 'getOrInsertComputed runs the callback only for a missing key');

// (arrays are held by reference: a push on the result reaches the map)
const groups = new Map<string, string[]>();
groups.getOrInsertComputed('x', () => []).push('one');
groups.getOrInsert('x', []).push('two');
assert(groups.get('x')!.join(',') === 'one,two', 'getOrInsert returns the stored array');

interface Box {
  n: number;
}
const boxes = new Map<string, Box>();
boxes.getOrInsert('k', { n: 1 }).n++;
assert(boxes.get('k')!.n === 2, 'getOrInsert returns the stored object');

const key = {};
const meta = new WeakMap<object, number>();
assert(meta.getOrInsert(key, 7) === 7 && meta.getOrInsert(key, 9) === 7, 'WeakMap getOrInsert');
assert(meta.getOrInsertComputed({}, () => 3) === 3, 'WeakMap getOrInsertComputed');
