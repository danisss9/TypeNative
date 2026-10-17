import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';
import { readFile } from 'node:fs';
import { EventEmitter } from 'node:events';

const als = new AsyncLocalStorage<string>();
const seen: string[] = [];
const record = (where: string) => seen.push(`${where}=${als.getStore() ?? 'none'}`);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(id: string, delay: number): Promise<string> {
  return als.run(id, async () => {
    record(`start:${id}`);
    await sleep(delay);
    record(`after-await:${id}`);
    await Promise.resolve();
    return `done:${als.getStore()}`;
  });
}

async function main(): Promise<void> {
  record('top');
  const result = als.run('sync', () => {
    record('inside-run');
    return 42;
  });
  assert(result === 42, 'run returns the callback result');
  record('after-run');

  // Two interleaved "requests" keep their own stores across awaits
  const [a, b] = await Promise.all([request('a', 30), request('b', 10)]);
  assert(a === 'done:a' && b === 'done:b', 'stores survive awaits');

  // Timers, immediates, nextTick, microtasks and fs callbacks
  await new Promise<void>((resolve) => {
    als.run('timers', () => {
      setTimeout(() => record('timeout'), 1);
      setImmediate(() => record('immediate'));
      process.nextTick(() => record('nextTick'));
      queueMicrotask(() => record('microtask'));
      readFile('conformance/lib-node-async-hooks.ts', () => {
        record('readFile');
        resolve();
      });
    });
  });
  await sleep(5);

  // Event listeners run in the emitter's caller context; exit / enterWith
  const emitter = new EventEmitter();
  emitter.on('ping', () => record('listener'));
  als.run('emit', () => emitter.emit('ping'));
  als.run('outer', () => {
    als.exit(() => record('exit'));
    record('outer');
  });

  // AsyncResource captures the context it was created in
  const resource = als.run('resource', () => new AsyncResource('Probe'));
  resource.runInAsyncScope(() => record('resource'));
  const bound = als.run('bound', () => AsyncLocalStorage.bind(() => record('bound')));
  bound();

  als.enterWith('entered');
  record('enterWith');

  const expected = [
    'top=none',
    'inside-run=sync',
    'after-run=none',
    'start:a=a',
    'start:b=b',
    'after-await:b=b',
    'after-await:a=a',
    'listener=emit',
    'exit=none',
    'outer=outer',
    'resource=resource',
    'bound=bound',
    'enterWith=entered'
  ];
  const order = seen.filter((s) => !/^(timeout|immediate|readFile|nextTick|microtask)=/.test(s));
  console.log(order.join('\n'));
  assert(order.join(',') === expected.join(','), 'context everywhere');
  for (const name of ['timeout', 'immediate', 'readFile', 'nextTick', 'microtask']) {
    assert(seen.includes(`${name}=timers`), `${name} keeps the store`);
  }
}

main();
