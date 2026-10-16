import nodeAssert from 'node:assert';
import strict from 'node:assert/strict';

nodeAssert(true);
nodeAssert.ok(1, 'truthy');
nodeAssert.equal(1, '1');
nodeAssert.notEqual(1, 2);
nodeAssert.strictEqual(NaN, NaN);
nodeAssert.notStrictEqual(1, '1');
nodeAssert.match('abc', /b/);
nodeAssert.doesNotMatch('abc', /z/);
strict.equal('x', 'x');

let caught = false;
try {
  nodeAssert.strictEqual(1, 2);
} catch (e) {
  const err = e as NodeJS.ErrnoException;
  caught = err.code === 'ERR_ASSERTION' && err.name === 'AssertionError' && err.message.startsWith('Expected values to be strictly equal');
}
assert(caught, 'strictEqual failure is an AssertionError');

let custom = '';
try {
  nodeAssert.ok(false, 'custom message');
} catch (e) {
  custom = (e as Error).message;
}
assert(custom === 'custom message', 'custom message');

let strictLoose = false;
try {
  strict.equal(1, '1' as any);
} catch {
  strictLoose = true;
}
assert(strictLoose, 'assert/strict equal is strictEqual');

nodeAssert.throws(() => {
  throw new Error('bad input');
}, /bad input/);
nodeAssert.throws(
  () => {
    throw new TypeError('wrong type');
  },
  { message: 'wrong type' }
);
nodeAssert.throws(() => {
  throw new Error('x');
}, Error);
nodeAssert.doesNotThrow(() => 1 + 1);

let missing = '';
try {
  nodeAssert.throws(() => {});
} catch (e) {
  missing = (e as Error).message;
}
assert(missing === 'Missing expected exception.', 'throws without exception');

let failed = '';
try {
  nodeAssert.fail('stop');
} catch (e) {
  failed = (e as Error).message;
}
assert(failed === 'stop', 'fail');
nodeAssert.ifError(null);
