interface Box<T> { value: T }
type Pair<A, B> = { first: A; second: B };
const b: Box<number> = { value: 1 };
const p: Pair<string, number> = { first: 'a', second: 2 };
assert(b.value === 1 && p.first === 'a' && p.second === 2, 'generic interfaces');
