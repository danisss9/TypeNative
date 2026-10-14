type Dir = 'up' | 'down';
function flip(d: Dir): Dir { return d === 'up' ? 'down' : 'up'; }
assert(flip('up') === 'down', 'string literal union param/return');
const d: Dir = 'down';
assert(d === 'down', 'string literal union assign');
type Single = 'only';
const s: Single = 'only';
assert(s === 'only', 'single literal type');
let current: Dir = 'up';
current = 'down';
assert(current === 'down', 'literal union reassign');
type One = 1;
const n: One = 1;
assert(n === 1, 'numeric literal type');
type Level = 1 | 2 | 3;
function level(l: Level): number { return l * 10; }
assert(level(2) === 20, 'numeric literal union param');
type Flag = true | false;
const f: Flag = true;
assert(f === true, 'boolean literal union');
const dict: Record<'a' | 'b', number> = { a: 1, b: 2 };
assert(dict['a'] === 1 && dict['b'] === 2, 'literal union Record keys');
