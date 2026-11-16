// async_hooks ids and createHook callbacks; symbol event names; EventEmitterAsyncResource; histogram statistics
import { createHook, executionAsyncId, triggerAsyncId, AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter, EventEmitterAsyncResource } from 'node:events';
import { createHistogram } from 'node:perf_hooks';

// symbol event names
const tick = Symbol('tick');
const other = Symbol('tick');
const emitter = new EventEmitter();
let ticks = 0;
emitter.on(tick, (n: number) => (ticks += n));
emitter.emit(tick, 2);
emitter.emit(other, 100);
assert(ticks === 2 && emitter.listenerCount(tick) === 1 && emitter.listenerCount(other) === 0, 'symbols are distinct event names');

// EventEmitterAsyncResource: listeners run in the creation context
const store = new AsyncLocalStorage<string>();
let seen = '';
const resource = store.run('created', () => new EventEmitterAsyncResource({ name: 'demo' }));
resource.on('ping', () => (seen = store.getStore() ?? 'none'));
store.run('emitted', () => resource.emit('ping'));
assert(seen === 'created', 'EventEmitterAsyncResource runs listeners in its context');
assert(resource.asyncId > 0, 'asyncId');

// histogram statistics
const h = createHistogram();
for (let v = 1; v <= 10; v++) h.record(v);
assert(h.cdf(5) === 0.5 && h.ccdf(5) === 0.5 && h.countAt(3) === 1, 'cdf / ccdf / countAt');
assert(h.skewness === 0 && Math.abs(h.kurtosis - -1.2242424242424244) < 1e-12, 'skewness / kurtosis');
const snap = h.snapshot();
assert(snap.count === 10 && snap.min === 1 && snap.max === 10 && snap.mean === 5.5, 'snapshot');
h.recordCorrected(50, 10);
assert(h.count === 15 && h.max === 50, 'recordCorrected');

// async ids and hooks
const top = executionAsyncId();
assert(top >= 0 && triggerAsyncId() >= 0, 'top-level ids');
const events: string[] = [];
const hook = createHook({
  init(id: number, type: string, trigger: number) {
    if (trigger === top) events.push('init');
  },
  before() {
    events.push('before');
  },
  after() {
    events.push('after');
  }
}).enable();
setTimeout(() => {
  const inner = executionAsyncId();
  assert(inner !== top && triggerAsyncId() === top, 'a timer callback runs with its own id, triggered by the top level');
  setTimeout(() => {
    hook.disable();
    assert(events.includes('init') && events.includes('before') && events.includes('after'), 'createHook callbacks');
    console.log('hooks ok');
  }, 1);
}, 1);
