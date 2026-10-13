interface User { name: string; age: number }
const p: Partial<User> = { name: 'a' };
const q: Pick<User, 'age'> = { age: 1 };
const r: Readonly<User> = { name: 'b', age: 2 };
assert(p.name === 'a' && q.age === 1 && r.age === 2, 'utility types');
