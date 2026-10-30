// typeof / instanceof narrow an unknown value inside the branch
function describe(v: unknown): string {
  if (typeof v === 'string') return `string:${v.toUpperCase()}`;
  if (typeof v === 'number') return `number:${v.toFixed(1)}`;
  if (typeof v === 'boolean') return `boolean:${!v}`;
  if (v instanceof Date) return `date:${v.getUTCFullYear()}`;
  if (Array.isArray(v)) return `array:${v.length}`;
  if (typeof v === 'function') return 'function';
  if (v === null) return 'null';
  if (typeof v === 'object') return `object:${Object.keys(v).length}`;
  return 'undefined';
}
const results = ['x', 1.25, true, new Date(Date.UTC(2020, 0, 1)), [1, 2], () => 1, { a: 1 }].map(describe);
assert(results.join(' ') === 'string:X number:1.3 boolean:false date:2020 array:2 function object:1', 'each branch');
assert(describe(null) === 'null', 'null');
function len(v: string | string[]): number {
  return typeof v === 'string' ? v.length : v.length * 10;
}
assert(len('abc') === 3 && len(['a']) === 10, 'union narrowing');
console.log(results.join(' '));
