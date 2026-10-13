function first<const T extends readonly string[]>(xs: T): string { return xs[0]; }
interface Producer<out T> { get(): T }
const p: Producer<number> = { get: () => 4 };
assert(first(['a', 'b']) === 'a' && p.get() === 4, 'const / variance');
