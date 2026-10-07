// typeof narrowing on union types + static typeof
function describe(x: number | string): string {
  if (typeof x === 'number') return 'num';
  if (typeof x === 'string') return 'str';
  return 'other';
}
assert(describe(5) === 'num', 'typeof number failed');
assert(describe('hi') === 'str', 'typeof string failed');

const n = 42;
assert(typeof n === 'number', 'static typeof number failed');
const s = 'x';
assert(typeof s === 'string', 'static typeof string failed');
const b = true;
assert(typeof b === 'boolean', 'static typeof boolean failed');
