// Self-hosting syntax: contextual object/array literal types, Record map literals,
// object type aliases, unbraced loop bodies, while-condition assignment, `in`

type Size = { width: number; height: number };

function area(size: Size): number {
  return size.width * size.height;
}

function makeSize(side: number): Size {
  // Object literal typed from the return type
  return { width: side, height: side };
}

// Object literal typed from the parameter type
assert(area({ width: 3, height: 4 }) === 12, 'call-arg object literal failed');
assert(area(makeSize(5)) === 25, 'return object literal failed');

// Inline object type → anonymous struct
function bounds(): { min: number; max: number } {
  return { min: 1, max: 9 };
}
assert(bounds().max === 9, 'inline object type failed');

// Record<K, V> object literal → Go map literal
const labels: Record<string, string> = { en: 'Hello', pt: 'Ola' };
assert(labels['pt'] === 'Ola', 'record literal failed');
assert('en' in labels, '`in` operator failed');
assert(!('fr' in labels), '`in` operator (missing key) failed');

// Record values typed from the Record value type (function literals included)
type Formatter = (value: number) => string;
const formatters: Record<string, Formatter> = {
  plain: (value) => `${value}`,
  money: (value) => {
    return `$${value}`;
  }
};
assert(formatters['money'](5) === '$5', 'record function value failed');

// Empty array literal typed from the default parameter type
function total(values: number[] = []): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum;
}
assert(total() === 0, 'default empty array failed');
assert(total([1, 2, 3]) === 6, 'unbraced for-of body failed');

// Unbraced for / while bodies
let count = 0;
for (let i = 0; i < 3; i++) count++;
while (count < 10) count += 2;
assert(count === 11, `unbraced loop bodies failed: ${count}`);

// Assignment inside a while condition
const words: string[] = ['a', 'b', 'c'];
let index = 0;
let next = '';
let joined = '';
while ((next = index < words.length ? words[index] : '') !== '') {
  joined += next;
  index++;
}
assert(joined === 'abc', `while-condition assignment failed: ${joined}`);

// `any` parameters are interface{}
function describe(value: any): string {
  return `${value}`;
}
assert(describe(42) === '42', 'any parameter failed');
