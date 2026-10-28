// The child of lib-node-test-run.ts: run() executes it as an entry point in a
// child process. Standalone (without TN_RUN_CHILD) it registers only its
// passing test, so it passes as a probe of its own.
import { test, describe, it } from 'node:test';
import assert from 'node:assert';

test('child passes', () => {
  assert.strictEqual(1 + 1, 2);
});

if (process.env.TN_RUN_CHILD) {
  console.log('hello from the child');
  describe('helper suite', () => {
    it('inner', () => {});
  });
  test('child fails', () => {
    throw new Error('child boom');
  });
}
