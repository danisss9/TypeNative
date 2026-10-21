// Writing past the end of an array grows it (holes read as the zero value)
const a: number[] = [1];
a[3] = 4;
assert(a.length === 4 && a[3] === 4, 'variable');
class Box { items: string[] = []; }
const b = new Box();
b.items[1] = 'x';
assert(b.items.length === 2 && b.items[1] === 'x', 'field');
function fill(xs: number[]): void { xs[2] = 9; }
const c: number[] = [];
fill(c);
assert(c.length === 3 && c[2] === 9, 'through a parameter');
const m: number[][] = [[]];
m[0][1] = 5;
assert(m[0].length === 2 && m[0][1] === 5, 'nested array');
a[-1] = 7;
assert(a.length === 4, 'a negative index is not an element');
