assert([[1], [2, 3]].flat().length === 3 && [1, 2].flatMap((x) => [x, x]).length === 4, 'flat');
// (a T | T[] callback's results: the arrays spread, the rest kept)
interface Item { name: string }
const mixed = [{ name: 'a' }, { name: 'b' }].map((item: Item): Item | Item[] => (item.name === 'b' ? [item, { name: 'c' }] : item)).flat() as Item[];
assert(mixed.length === 3 && mixed.map((i) => i.name).join('') === 'abc', 'flat of mixed values and arrays');
