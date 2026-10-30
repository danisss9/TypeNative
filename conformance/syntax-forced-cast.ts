// `x as unknown as T[]`: the cast only satisfies the checker; the value stays
// what it is (here an override returns a Map where its parent returns arrays)
class Seq {
  items: number[] = [1, 2];
  toJS(): unknown[] {
    return this.items.slice();
  }
}
class OrderedMap extends Seq {
  toJS(): never[] {
    const map = new Map<number, string>();
    map.set(1, 'a');
    return map as unknown as never[];
  }
}
const all: Seq[] = [new Seq(), new OrderedMap()];
const results = all.map((s) => s.toJS());
assert(Array.isArray(results[0]) && JSON.stringify(results[0]) === '[1,2]', 'array result');
assert(results[1] instanceof Map, 'the Map is returned as is');
assert(JSON.stringify(results[1]) === '{}', 'and serializes as a Map');
console.log(JSON.stringify(results));
