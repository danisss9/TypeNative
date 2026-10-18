import { channel, tracingChannel } from 'node:diagnostics_channel';
import { AsyncLocalStorage } from 'node:async_hooks';

const events: string[] = [];
const tc = tracingChannel('app:op');
assert(tc.start.name === 'tracing:app:op:start' && tc.asyncEnd.name === 'tracing:app:op:asyncEnd', 'channel names');
assert(!tc.hasSubscribers, 'no subscribers yet');

const handlers = {
  start(message: any) {
    events.push(`start:${message.id}`);
  },
  end(message: any) {
    events.push(`end:${message.result ?? '-'}`);
  },
  asyncStart(message: any) {
    events.push(`asyncStart:${message.result ?? '-'}`);
  },
  asyncEnd(_message: any) {
    events.push('asyncEnd');
  },
  error(message: any) {
    events.push(`error:${(message.error as Error).message}`);
  }
};
tc.subscribe(handlers);
assert(tc.hasSubscribers && channel('tracing:app:op:error').hasSubscribers, 'subscribe attaches each handler');

const sum = tc.traceSync((a: number, b: number) => a + b, { id: 1 }, undefined, 2, 3);
assert(sum === 5, 'traceSync returns the result');
assert(events.join(',') === 'start:1,end:5', 'traceSync publishes start and end with the result');

events.length = 0;
let caught = '';
try {
  tc.traceSync(() => {
    throw new Error('boom');
  }, { id: 2 });
} catch (e) {
  caught = (e as Error).message;
}
assert(caught === 'boom' && events.join(',') === 'start:2,error:boom,end:-', 'traceSync publishes error and rethrows');

events.length = 0;
function work(n: number, cb: (err: Error | null, value: number) => void) {
  setTimeout(() => cb(null, n * 2), 1);
}
let callbackValue = 0;
tc.traceCallback(work, -1, { id: 3 }, undefined, 21, (err: Error | null, value: number) => {
  callbackValue = value;
  events.push(`cb:${value}`);
});

const store = new AsyncLocalStorage<string>();
const bound = channel('app:bound');
bound.bindStore(store, (data: any) => `store-${data.user}`);
const seen = bound.runStores({ user: 'ana' }, () => store.getStore());
assert(seen === 'store-ana' && store.getStore() === undefined, 'runStores enters bound stores');
assert(bound.unbindStore(store) && !bound.unbindStore(store), 'unbindStore');

async function main() {
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
  assert(callbackValue === 42, 'traceCallback calls the wrapped callback');
  assert(events.join(',') === 'start:3,end:-,asyncStart:42,cb:42,asyncEnd', 'traceCallback events');

  events.length = 0;
  const value = await tc.tracePromise(async () => 'done', { id: 4 });
  assert(value === 'done', 'tracePromise resolves with the result');
  assert(events.join(',') === 'start:4,end:-,asyncStart:done,asyncEnd', 'tracePromise events');

  events.length = 0;
  let rejected = '';
  try {
    await tc.tracePromise(async () => {
      throw new Error('nope');
    }, { id: 5 });
  } catch (e) {
    rejected = (e as Error).message;
  }
  assert(rejected === 'nope' && events.join(',') === 'start:5,end:-,error:nope,asyncStart:-,asyncEnd', 'tracePromise rejection');

  assert(tc.unsubscribe(handlers) && !tc.hasSubscribers, 'unsubscribe');
  const plain = tc.traceSync(() => 7);
  assert(plain === 7 && events.length === 5, 'without subscribers nothing is published');
}
main();
