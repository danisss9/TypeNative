// Generator<T> / IterableIterator<T> annotations on generator and ordinary functions
function* ids(n: number): Generator<number> { for (let i = 0; i < n; i++) yield i; }
function* walk(items: string[]): Generator<string, void, undefined> { for (const s of items) yield s.toUpperCase(); }
function wrap(n: number): Generator<number> { return ids(n); }
let total = 0;
for (const v of wrap(4)) total += v;
const parts: string[] = [];
for (const s of walk(['a', 'b'])) parts.push(s);
assert(total === 6 && parts.join('') === 'AB', 'Generator return types');
const g: Generator<number> = ids(2);
assert(g.next().value === 0, 'next');
