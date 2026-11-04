// Array(n).fill(v).join(sep), and join on arrays of other element types
const n: number | undefined = 3;
const a = Array(n ?? 0).fill('any').join(', ');
const b = new Array(2).fill(0);
const c = Array(2).fill(null);
const d = [1, 2.5, 3].join('-');
console.log(a, b, c.length, d);
assert(a === 'any, any, any', 'filled strings joined');
assert(b.join('') === '00' && c.length === 2 && d === '1-2.5-3', 'other fills');
