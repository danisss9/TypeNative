import { EventEmitter, once, on } from 'node:events';

async function main() {
  const emitter = new EventEmitter();
  setTimeout(() => emitter.emit('ready', 42, 'ok'), 5);
  const [value, status] = await once(emitter, 'ready');
  assert(value === 42 && status === 'ok', 'once resolves with the arguments');

  setTimeout(() => emitter.emit('error', new Error('failed')), 5);
  let rejected = '';
  try {
    await once(emitter, 'never');
  } catch (e) {
    rejected = (e as Error).message;
  }
  assert(rejected === 'failed', "once rejects on 'error'");

  setTimeout(() => {
    emitter.emit('tick', 1);
    emitter.emit('tick', 2);
    emitter.emit('tick', 3);
  }, 5);
  let total = 0;
  for await (const [n] of on(emitter, 'tick')) {
    total += n as number;
    if (n === 3) break;
  }
  assert(total === 6, 'events.on async iteration');
}
main();
