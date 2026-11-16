// node:assert in Node 26: printf-style messages, message functions, partialDeepStrictEqual
import * as assert from 'node:assert';

function messageOf(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return '';
}

assert.strictEqual(messageOf(() => assert.ok(false, 'got %s and %d', 'x', 5)), 'got x and 5', 'printf message');
// (strictEqual follows a custom message with the comparison)
assert.strictEqual(messageOf(() => assert.strictEqual(1, 2, 'want %i', 2)), 'want 2\n\n1 !== 2\n');
assert.strictEqual(messageOf(() => assert.strictEqual(1, 2, (actual: any, expected: any) => `fn ${actual} ${expected}`)), 'fn 1 2\n\n1 !== 2\n', 'message function');
assert.ok(messageOf(() => assert.deepStrictEqual({ a: 1 }, { a: 2 }, 'deep %s', 'off')).startsWith('deep off'));
assert.strictEqual(messageOf(() => assert.equal(1, 2, 'eq %s', 'x')), 'eq x');
assert.strictEqual(messageOf(() => assert.notStrictEqual(1, 1, 'ne %s', 'x')), 'ne x');
assert.strictEqual(messageOf(() => assert.match('abc', /x/, 'no %s', 'x')), 'no x');
// (fail and throws keep their message as is)
assert.strictEqual(messageOf(() => assert.fail('failed %s')), 'failed %s');

assert.partialDeepStrictEqual({ a: 1, b: { c: 2, d: 3 }, list: [1, 2, 3] }, { b: { c: 2 }, list: [1, 3] });
const partialMessage = messageOf(() => assert.partialDeepStrictEqual({ a: 1 }, { a: 2 }));
assert.ok(partialMessage.includes('partially'), 'partialDeepStrictEqual fails');
console.log('assert ok');
