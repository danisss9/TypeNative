// A Set or Map handed to a generic function that changes it (deletes,
// adds, sets) is the caller's own collection: the changes are in it
// (the React Compiler's retainWhere_Set(activeScopes, scope => …))
type Scope = { id: number; range: { start: number; end: number } };

function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function retainWhere_Set<T>(items: Set<T>, predicate: (item: T) => boolean): void {
  for (const item of items) {
    if (!predicate(item)) {
      items.delete(item);
    }
  }
}

function addAll<T>(into: Set<T>, values: T[]): void {
  for (const v of values) into.add(v);
}

function dropKeys<K>(map: Map<K, Scope>, keep: (key: K) => boolean): void {
  for (const key of [...map.keys()]) {
    if (!keep(key)) map.delete(key);
  }
}


const scopes: Scope[] = [
  { id: 0, range: { start: 6, end: 7 } },
  { id: 1, range: { start: 8, end: 13 } },
  { id: 2, range: { start: 10, end: 11 } },
];
const active = new Set<Scope>(scopes);
retainWhere_Set(active, (scope) => scope.range.end > 12);
check('retained', [...active].map((s) => s.id).join(','), '1');

class Holder {
  active: Set<Scope> = new Set(scopes);
}
const holder = new Holder();
retainWhere_Set(holder.active, (scope) => scope.range.start >= 8);
check('field retained', [...holder.active].map((s) => s.id).join(','), '1,2');

const names = new Set<string>(['a']);
addAll(names, ['b', 'c']);
check('added', [...names].join(','), 'a,b,c');

const byId = new Map<number, Scope>(scopes.map((s) => [s.id, s]));
dropKeys(byId, (id) => id !== 1);
check('map deleted', [...byId.keys()].join(','), '0,2');
check('same values', byId.get(2) === scopes[2], true);
console.log('ok');
