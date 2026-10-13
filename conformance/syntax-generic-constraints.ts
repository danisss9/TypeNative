interface HasLength { length: number }
function longest<T extends HasLength>(a: T, b: T): T { return a.length >= b.length ? a : b; }
assert(longest('abc', 'de') === 'abc', 'generic constraint');
interface Named { name: string }
function nameOf<T extends Named>(x: T): string { return x.name; }
const user: Named = { name: 'ana' };
assert(nameOf(user) === 'ana' && longest([1, 2], [3]).length === 2, 'object constraint');
