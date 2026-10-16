import { setTimeout as delay, setImmediate as immediate, clearTimeout as cancel, setInterval as every, clearInterval as stop } from 'node:timers';

const order: string[] = [];
delay(
  (label: string) => {
    order.push(label);
  },
  5,
  'timeout'
);
const cancelled = delay(() => order.push('cancelled'), 1);
cancel(cancelled);
immediate(() => order.push('immediate'));
setImmediate(() => order.push('global immediate'));

let ticks = 0;
const interval = every(() => {
  ticks++;
  if (ticks === 3) stop(interval);
}, 1);

delay(() => {
  assert(order.includes('timeout') && order.includes('immediate') && order.includes('global immediate'), 'timers fired');
  assert(!order.includes('cancelled'), 'clearTimeout');
  assert(ticks === 3, 'setInterval / clearInterval');
}, 100);
