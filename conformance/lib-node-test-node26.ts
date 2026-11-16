// node:test in Node 26: t.log, getTestContext, passed / attempt / workerId / tags, mock call assertions
import { test, getTestContext, mock } from 'node:test';

test('outer', { tags: ['slow'] }, async (t) => {
  t.log('hello %s', 'log');
  assert(getTestContext() === t, 'getTestContext');
  assert(t.passed === false && t.attempt === 0 && t.workerId === undefined, 'passed / attempt / workerId');
  assert(t.tags.length === 1 && t.tags[0] === 'slow', 'tags');

  const fn = mock.fn((a: number) => a * 2);
  fn(1);
  fn(2);
  t.assert.called(fn);
  t.assert.callCount(fn, 2);
  t.assert.nthCalledWith(fn, 1, 1);
  t.assert.lastCalledWith(fn, 2);
  let failed = false;
  try {
    t.assert.callCount(fn, 3);
  } catch {
    failed = true;
  }
  assert(failed, 'callCount fails on a mismatch');

  await t.test('inner', { tags: ['fast'] }, (t2) => {
    assert(t2.tags.includes('fast') && t2.tags.includes('slow'), 'a subtest has its own and its parents\' tags');
  });
});
