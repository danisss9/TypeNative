// Dates in arithmetic and comparisons use their time value; `any` operands of
// - * / convert like JS's ToNumber
const a = new Date(1000);
const b = new Date(3500);
assert(+b - +a === 2500, '+date');
assert(a < b && !(b <= a), 'ordering');
function sub(x: any, y: any): number { return x - y; }
function mul(x: any, y: number): number { return x * y; }
assert(sub(b, a) === 2500, 'date - date through any');
assert(sub('6', 1) === 5 && mul(true, 3) === 3 && sub(JSON.parse('7'), '2') === 5, 'ToNumber');
