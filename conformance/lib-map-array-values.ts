// A Map's array values are the arrays themselves: pushes through get(),
// through a variable, or through a function returning them reach the map
const m = new Map<string, number[]>();
m.set('a', []);
m.get('a')!.push(1);
const arr = m.get('a')!;
arr.push(2);
class Attrs {
  private byKind = new Map<number, string[]>();
  arrayFor(kind: number): string[] {
    if (!this.byKind.has(kind)) this.byKind.set(kind, []);
    return this.byKind.get(kind)!;
  }
  add(kind: number, name: string) {
    const a = this.arrayFor(kind);
    a.push(name);
  }
  get(kind: number): readonly string[] {
    return this.byKind.get(kind) ?? [];
  }
}
const at = new Attrs();
at.add(1, 'x');
at.add(1, 'y');
const init = new Map<string, number[]>([['p', [1, 2]], ['q', [3]]]);
init.get('q')!.push(4);
const keys: string[] = [];
let total = 0;
for (const [k, v] of init) {
  keys.push(k + v.length);
  total += v.reduce((s, x) => s + x, 0);
}
init.forEach((v, k) => keys.push(k + ':' + v.join('')));
const flat = Array.from(init.values()).flat();
const missing = init.get('zzz');
const text = [m.get('a')!.join(','), at.get(1).join(','), at.get(2).length, keys.join(' '), total, flat.join(''), missing === undefined, init.size].join(' | ');
console.log(text);
assert(text === '1,2 | x,y | 0 | p2 q2 p:12 q:34 | 10 | 1234 | true | 2', 'map array values');
const copied = new Map(init);
copied.get('p')!.push(5);
const grouped = Map.groupBy([1, 2, 3, 4], (x) => (x % 2 ? 'odd' : 'even'));
grouped.get('odd')!.push(9);
const more = [JSON.stringify(Object.fromEntries(init)), init.get('p')!.length, grouped.get('odd')!.join(',')].join(' ');
console.log(more);
assert(more === '{"p":[1,2,5],"q":[3,4]} 3 1,3,9', 'copies share arrays; groupBy');
