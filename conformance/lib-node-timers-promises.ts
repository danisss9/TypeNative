import { setTimeout as sleep, setImmediate as nextLoop, setInterval as every, scheduler } from 'node:timers/promises';

async function main() {
  const start = Date.now();
  const value = await sleep(20, 'done');
  assert(value === 'done' && Date.now() - start >= 15, 'setTimeout resolves with the value');
  assert((await nextLoop(7)) === 7, 'setImmediate');
  await scheduler.wait(1);

  let ticks = 0;
  for await (const tick of every(5, 'tick')) {
    assert(tick === 'tick', 'interval value');
    ticks++;
    if (ticks === 3) break;
  }
  assert(ticks === 3, 'setInterval async iterator');

  const controller = new AbortController();
  const pending = sleep(1000, 'late', { signal: controller.signal });
  controller.abort();
  let aborted = '';
  try {
    await pending;
  } catch (e) {
    aborted = (e as Error).name;
  }
  assert(aborted === 'AbortError', 'abort signal rejects');
}
main();
