// Arrays held in a Map / Record / object field, mutated in place: the element
// is an array reference (*[]T), so a push reaches the container — also through
// a local alias of it
const map = new Map<string, number[]>();
map.set('a', [1]);
map.get('a')!.push(2);
const mapAlias = map.get('a')!;
mapAlias.push(3);
assert(map.get('a')!.join(',') === '1,2,3', 'Map element push, also through a local');

const record: Record<string, number[]> = { a: [1] };
record['a'].push(2);
record.a.push(3);
const recordAlias = record['a'];
recordAlias.push(4);
assert(record.a.join(',') === '1,2,3,4', 'Record element push, also through a local');

const object = { items: [1] };
object.items.push(2);
const fieldAlias = object.items;
fieldAlias.push(3);
assert(object.items.join(',') === '1,2,3', 'array field push, also through a local');

// (upsert results are the stored array too)
const upserts = new Map<string, string[]>();
upserts.getOrInsertComputed('x', () => []).push('one');
upserts.getOrInsert('x', []).push('two');
assert(upserts.get('x')!.join(',') === 'one,two', 'upsert result push');

// (a generic helper returning V, bound to an array: V is the reference)
function getOrInsertWith<U, V>(m: Map<U, V>, key: U, makeDefault: () => V): V {
  if (m.has(key)) return m.get(key) as V;
  const value = makeDefault();
  m.set(key, value);
  return value;
}
const generic = new Map<string, number[]>();
getOrInsertWith(generic, 'a', () => []).push(1);
getOrInsertWith(generic, 'a', () => []).push(2);
assert(generic.get('a')!.join(',') === '1,2', 'a generic helper returning the array');

// (a Map of arrays inside an array)
const lists = [[1]];
lists[0].push(2);
assert(lists[0].join(',') === '1,2', 'array element push');
console.log('container array push ok');
