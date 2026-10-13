const o: Record<string, number> = { a: 1, b: 2 };
Object.defineProperty(o, 'c', { value: 3, enumerable: true });
assert(Object.hasOwn(o, 'a') && !Object.hasOwn(o, 'z') && Object.getOwnPropertyNames(o).length === 3 && o['c'] === 3, 'hasOwn / defineProperty');
interface Opts { a: number; b?: string }
const opts: Opts = { a: 1 };
assert(Object.hasOwn(opts, 'a') && !Object.hasOwn(opts, 'b'), 'hasOwn on a typed object');
