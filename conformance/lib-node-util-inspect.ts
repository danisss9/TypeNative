import { inspect } from 'node:util';

assert(inspect('text') === "'text'" && inspect("it's") === `"it's"`, 'strings are quoted');
assert(inspect(42) === '42' && inspect(-0) === '-0' && inspect(true) === 'true', 'primitives');
assert(inspect(undefined) === 'undefined' && inspect(10n) === '10n', 'undefined / bigint');
assert(inspect([1, 2, 3]) === '[ 1, 2, 3 ]' && inspect([]) === '[]', 'arrays');
assert(inspect({ a: 1, b: 'x' }) === "{ a: 1, b: 'x' }", 'objects');
const record: Record<string, number> = { 'b-c': 1 };
assert(inspect(record) === "{ 'b-c': 1 }", 'quoted keys');
assert(inspect({ nested: { deep: { deeper: { deepest: 1 } } } }) === '{ nested: { deep: { deeper: [Object] } } }', 'depth 2 default');
assert(inspect({ a: { b: { c: 1 } } }, { depth: 0 }) === '{ a: [Object] }', 'depth option');
assert(inspect(new Map([['k', 1]])) === "Map(1) { 'k' => 1 }", 'Map');
assert(inspect(new Set([1, 2])) === 'Set(2) { 1, 2 }', 'Set');
assert(inspect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) === '[\n  1, 2, 3, 4,  5,\n  6, 7, 8, 9, 10\n]', 'long arrays group into columns');
assert(
  inspect({ alpha: 'aaaaaaaaaa', beta: 'bbbbbbbbbb', gamma: 'cccccccccc', delta: 'dddddddddd', epsilon: 'eeee' }) ===
    "{\n  alpha: 'aaaaaaaaaa',\n  beta: 'bbbbbbbbbb',\n  gamma: 'cccccccccc',\n  delta: 'dddddddddd',\n  epsilon: 'eeee'\n}",
  'breaks past 80 columns'
);

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
assert(inspect(new Point(1, 2)) === 'Point { x: 1, y: 2 }', 'class instances');
assert(inspect([new Point(0, 0)]) === '[ Point { x: 0, y: 0 } ]', 'nested class instance');
assert(inspect(Buffer.from('hi')) === '<Buffer 68 69>', 'Buffer');
const err = new Error('boom');
assert(inspect(err).startsWith('Error: boom'), 'Error');
// Maps and Sets nested in objects keep their shape, string keys or not
const tags: Record<string, number> = { a: 1 };
assert(
  inspect({ m: new Map([['k', 'v']]), s: new Set(['x']), tags }) === "{ m: Map(1) { 'k' => 'v' }, s: Set(1) { 'x' }, tags: { a: 1 } }",
  'nested Map / Set / record'
);
