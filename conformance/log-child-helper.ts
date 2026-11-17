// The child of lib-node-test-log.ts: run() executes it as an entry point in a
// child process. Standalone (without a parent) it registers its logging test,
// so it passes as a probe of its own.
import { it } from 'node:test';

it('logs', (t) => {
  t.log('hello from t.log');
});
