import { test, describe, it } from 'node:test';
import assert from 'node:assert';

// A failing test fails the run: the exit code becomes 1 (reset here so the probe passes)
process.on('exit', () => {
  console.log('exit code after a failing test:', process.exitCode);
  assert(process.exitCode === 1, 'a failing test sets the exit code');
  process.exitCode = 0;
});

test('passes', () => {});

describe('suite with a failure', () => {
  it('fails', () => {
    assert.strictEqual(1, 2);
  });
  it('still runs', () => {});
});

test('async rejection', async () => {
  await Promise.resolve();
  throw new Error('boom');
});

test('times out', { timeout: 20 }, async () => {
  await new Promise((resolve) => setTimeout(resolve, 200));
});
