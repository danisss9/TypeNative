const controller = new AbortController();
const signal = controller.signal;
let events = 0;
signal.addEventListener('abort', (ev: Event) => {
  events++;
  assert(ev.type === 'abort', 'abort event type');
});
assert(!signal.aborted, 'not aborted yet');
controller.abort();
controller.abort();
assert(signal.aborted && events === 1, 'aborts once');
assert((signal.reason as Error).name === 'AbortError', 'default reason is an AbortError');

let thrown = false;
try {
  signal.throwIfAborted();
} catch {
  thrown = true;
}
assert(thrown, 'throwIfAborted');

const reasoned = AbortSignal.abort('stop');
assert(reasoned.aborted && reasoned.reason === 'stop', 'AbortSignal.abort(reason)');

const target = new EventTarget();
let hits = 0;
const listener = () => hits++;
target.addEventListener('ping', listener);
target.addEventListener('ping', listener);
target.dispatchEvent(new Event('ping'));
target.removeEventListener('ping', listener);
target.dispatchEvent(new Event('ping'));
assert(hits === 1, 'EventTarget dedupes and removes listeners');

const timed = AbortSignal.timeout(5);
setTimeout(() => {
  assert(timed.aborted && (timed.reason as Error).name === 'TimeoutError', 'AbortSignal.timeout');
}, 50);

export {};
