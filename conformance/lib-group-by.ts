// Object.groupBy / Map.groupBy; [...map.keys()]
interface Pet { name: string; kind: string; age: number }
const pets: Pet[] = [
  { name: 'rex', kind: 'dog', age: 3 },
  { name: 'tom', kind: 'cat', age: 5 },
  { name: 'fido', kind: 'dog', age: 7 },
];
const byKind = Object.groupBy(pets, (p) => p.kind);
assert(Object.keys(byKind).join(',') === 'dog,cat', 'keys in first-seen order');
assert(byKind['dog']!.map((p) => p.name).join(',') === 'rex,fido', 'groups');
const byAge = Map.groupBy(pets, (p) => (p.age > 4 ? 'old' : 'young'));
assert([...byAge.keys()].join(',') === 'young,old' && byAge.get('old')!.length === 2 && byAge instanceof Map, 'Map.groupBy');
const parity = Object.groupBy([1, 2, 3, 4, 5], (n, i) => (n % 2 === 0 ? 'even' : 'odd'));
assert(JSON.stringify(parity) === '{"odd":[1,3,5],"even":[2,4]}', JSON.stringify(parity));
const counts = new Map<string, number>([['a', 1], ['b', 2]]);
assert([...counts.keys()].join() === 'a,b' && [...counts.values()].join() === '1,2', 'spread map keys / values');
