import { EventEmitter, errorMonitor, getMaxListeners, setMaxListeners, addAbortListener } from 'node:events';

// errorMonitor sees errors first; an unhandled 'error' still throws
const monitored = new EventEmitter();
const seen: string[] = [];
monitored.on(errorMonitor, (err: Error) => seen.push(`monitor:${err.message}`));
monitored.on('error', (err: Error) => seen.push(`handler:${err.message}`));
monitored.emit('error', new Error('one'));
assert(seen.join(',') === 'monitor:one,handler:one', 'errorMonitor order');
const bare = new EventEmitter();
bare.on(errorMonitor, () => seen.push('bare monitor'));
try {
  bare.emit('error', new Error('two'));
  assert(false, 'unhandled error throws');
} catch (err) {
  assert((err as Error).message === 'two' && seen.includes('bare monitor'), 'monitor then throw');
}

// captureRejections: async listener failures become 'error' events
async function failingJob(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  throw new Error('async listener failed');
}
const capturing = new EventEmitter({ captureRejections: true });
capturing.on('job', () => failingJob());
capturing.on('error', (err: Error) => {
  console.log('captured', err.message);
  assert(err.message === 'async listener failed', 'captured rejection');
});
capturing.emit('job');

// getMaxListeners / setMaxListeners
const limited = new EventEmitter();
assert(getMaxListeners(limited) === 10, 'default max listeners');
setMaxListeners(3, limited);
assert(getMaxListeners(limited) === 3 && limited.getMaxListeners() === 3, 'setMaxListeners');

// addAbortListener
const controller = new AbortController();
let aborted = 0;
const disposable = addAbortListener(controller.signal, () => aborted++);
const ignored = new AbortController();
const removed = addAbortListener(ignored.signal, () => aborted += 100);
removed[Symbol.dispose]();
controller.abort();
ignored.abort();
setTimeout(() => {
  console.log('abort listeners', aborted);
  assert(aborted === 1, 'abort listener fired once; disposed one did not');
  disposable[Symbol.dispose]();
}, 5);
