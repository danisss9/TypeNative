// Higher-order array methods over object arrays (callback return types inferred)
interface User { name: string; age: number; }
const users: User[] = [{ name: 'a', age: 30 }, { name: 'b', age: 20 }];

const names = users.map((u) => u.name).join(',');
assert(names === 'a,b', `map/join failed: ${names}`);

const adults = users.filter((u) => u.age >= 21).length;
assert(adults === 1, `filter failed: ${adults}`);

const total = users.reduce((sum, u) => sum + u.age, 0);
assert(total === 50, `reduce failed: ${total}`);

const doubled = [1, 2, 3].map((x) => x * 2);
assert(doubled[2] === 6, 'primitive map failed');
