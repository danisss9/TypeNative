import { test, mock } from 'node:test';

test('mock timers', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1000 });
  const seen: string[] = [];
  setTimeout(() => seen.push(`a${Date.now()}`), 50);
  const id = setInterval(() => seen.push(`i${Date.now()}`), 20);
  t.mock.timers.tick(45);
  t.assert.strictEqual(seen.join(','), 'i1045,i1045');
  t.assert.strictEqual(Date.now(), 1045);
  clearInterval(id);
  t.mock.timers.tick(10);
  t.assert.strictEqual(seen.join(','), 'i1045,i1045,a1055');
  setTimeout(() => seen.push('late'), 1000);
  t.mock.timers.runAll();
  t.assert.strictEqual(seen.join(','), 'i1045,i1045,a1055,late');
  t.assert.strictEqual(Date.now(), 2055);
  t.mock.timers.setTime(5000);
  t.assert.strictEqual(new Date().getTime(), 5000);
});

test('cleared and nested timers', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const order: number[] = [];
  const cancelled = setTimeout(() => order.push(-1), 10);
  setTimeout(() => {
    order.push(1);
    setTimeout(() => order.push(3), 5);
  }, 10);
  setTimeout(() => order.push(2), 12);
  clearTimeout(cancelled);
  t.mock.timers.tick(20);
  // Timers scheduled during tick() count from the new time
  t.assert.deepStrictEqual(order, [1, 2]);
  t.mock.timers.tick(5);
  t.assert.deepStrictEqual(order, [1, 2, 3]);
  t.assert.ok(Date.now() > 1000000, 'Date is not mocked unless requested');
});

test('module-level mock.timers and reset', () => {
  mock.timers.enable({ apis: ['setImmediate'] });
  let ran = false;
  setImmediate(() => {
    ran = true;
  });
  mock.timers.tick(0);
  mock.timers.reset();
  if (!ran) throw new Error('setImmediate did not run on tick(0)');
});

test('timers are real again after the test', async (t) => {
  t.plan(2);
  const start = Date.now();
  await new Promise<void>((resolve) => setTimeout(resolve, 5));
  t.assert.ok(Date.now() - start >= 4);
  let code = '';
  try {
    t.mock.timers.tick(1);
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  t.assert.equal(code, 'ERR_INVALID_STATE');
});
