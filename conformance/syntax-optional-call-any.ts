// Optional calls on any values short-circuit: o?.m(), a?.b.c?.get(k), and
// results flowing into typed declarations. A call with a known primitive
// result (s?.toUpperCase()) gives that type's zero value, not undefined
const mods = new Map<string, { ast: any }>();
mods.set('a', { ast: { expandos: new Map([['f', new Set(['x', 'y'])]]) } });
function propsOf(key: string, remote: string): number {
  const props: Set<string> | undefined = mods.get(key)?.ast.expandos?.get(remote);
  return props ? props.size : -1;
}
assert(propsOf('a', 'f') === 2, 'present');
assert(propsOf('a', 'g') === -1 && propsOf('b', 'f') === -1, 'absent at either step');
const none: any = undefined;
assert(none?.greet('x') === undefined, 'nullish receiver');
assert(!none?.toUpperCase(), 'a typed result is falsy (its zero value)');
const some: any = { greet: (n: string) => `hi ${n}` };
assert(some?.greet('x') === 'hi x', 'set receiver');
const items = [{ kids: [1, 2] }, { kids: 3 }, {}].flatMap((o: any) => o.kids ?? []);
assert(items.join() === '1,2,3', 'flatMap over any results');
console.log(propsOf('a', 'f'), propsOf('b', 'f'), items);
const holder: any = { end: [1] };
const missing: any = undefined;
holder.end?.push(2);
missing?.push(3);
missing?.end?.push(4);
assert(holder.end.length === 2 && holder.end[1] === 2, 'a?.push(x) on an any array');
