// Object.hasOwn / defineProperty with a computed key on a typed object
const o: { a: number; b?: string } = { a: 1 };
const present = ['a', 'b', 'z'].map((k) => Object.hasOwn(o, k));
assert(present.join() === 'true,false,false', present.join());
const key = 'a' as string;
Object.defineProperty(o, key, { value: 42 });
assert(o.a === 42, 'defineProperty');
