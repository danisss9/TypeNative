// node:util debounce / throttle: callable functions with cancel / flush /
// ref / unref (and hasImmediateCapacity on a throttle)
import { debounce, throttle } from 'node:util';

let calls: number[] = [];
const d = debounce((n: number) => {
  calls.push(n);
  return n * 2;
}, 10);
d(1);
assert(d.pending !== null, 'a call is pending');
d(2);
assert(d.pending !== null, 'a second call is still pending');
await new Promise<void>((resolve) => setTimeout(resolve, 50));
assert(calls.join(',') === '2', 'only the last call runs');
assert(d.pending === null, 'nothing is pending after the wait');

const cancelled = d(3) as any;
cancelled.catch?.(() => {});
d.cancel();
await new Promise<void>((resolve) => setTimeout(resolve, 30));
assert(calls.join(',') === '2', 'cancel drops the call');

d(4);
d.flush();
assert(calls.join(',') === '2,4', 'flush runs the call now');

let leading: number[] = [];
const l = debounce((n: number) => leading.push(n), 20, { leading: true });
l(1);
assert(leading.join(',') === '1', 'leading runs the first call at once');
l(2);
await new Promise<void>((resolve) => setTimeout(resolve, 50));
assert(leading.join(',') === '1,2', 'the trailing call runs after the wait');

let runs: number[] = [];
const t = throttle((n: number) => {
  runs.push(n);
  return n;
}, 2, 20);
assert(t.hasImmediateCapacity() === true, 'immediate capacity');
t(1);
t(2);
t(3);
assert(runs.join(',') === '1,2', 'limit calls run at once');
assert(t.hasImmediateCapacity() === false, 'no immediate capacity');
assert(t.pending !== null, 'a queued call is pending');
await new Promise<void>((resolve) => setTimeout(resolve, 60));
assert(runs.join(',') === '1,2,3', 'the queued call drains after the interval');

t(4);
t(5);
const dropped = t(6) as any;
dropped.catch?.(() => {});
const dropped2 = t(7) as any;
dropped2.catch?.(() => {});
t.cancel();
await new Promise<void>((resolve) => setTimeout(resolve, 30));
assert(runs.join(',') === '1,2,3,4,5', 'cancel drops the queued calls');

console.log('debounce / throttle ok');
