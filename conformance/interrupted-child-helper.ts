// The child of lib-node-test-interrupted.ts: run() executes it as an entry point
// in a child process. Standalone (without TN_INTERRUPTED_SLOW) it passes quickly.
import { it } from 'node:test';

it('slow helper test', async () => {
  if (process.env.TN_INTERRUPTED_SLOW === '1') {
    console.log('HELPER_RUNNING');
    await new Promise((r) => setTimeout(r, 10000));
  }
});
