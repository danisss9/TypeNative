import { PerformanceObserver, performance, createHistogram, monitorEventLoopDelay } from 'node:perf_hooks';

const observed: string[] = [];
const observer = new PerformanceObserver((list, obs) => {
  for (const entry of list.getEntries()) observed.push(`${entry.entryType}:${entry.name}`);
  if (observed.length >= 3) {
    obs.disconnect();
    console.log(observed.join(' '));
    // Entries come sorted by startTime (the measure starts at its start mark)
    assert(observed.join(' ') === 'mark:start measure:span mark:end', 'observed entries');
  }
});
observer.observe({ entryTypes: ['mark', 'measure'] });
performance.mark('start');
performance.mark('end');
performance.measure('span', 'start', 'end');

// timerify records 'function' entries
const work = (n: number): number => {
  let s = 0;
  for (let i = 0; i < n; i++) s += i;
  return s;
};
const timed = performance.timerify(work);
const fnObserver = new PerformanceObserver((list) => {
  const entry = list.getEntriesByType('function')[0];
  console.log('timerify', entry.name, entry.duration >= 0);
  assert(entry.name === 'work', 'function entry name');
  fnObserver.disconnect();
});
fnObserver.observe({ type: 'function' });
assert(timed(1000) === 499500, 'timerified result');

// Histograms
const h = createHistogram();
for (const v of [1, 2, 3, 4, 100]) h.record(v);
console.log('histogram', h.count, h.min, h.max, h.mean, h.percentile(50));
assert(h.count === 5 && h.min === 1 && h.max === 100 && h.mean === 22 && h.percentile(50) === 3, 'histogram stats');
h.reset();
assert(h.count === 0, 'reset');
const delay = monitorEventLoopDelay({ resolution: 5 });
delay.enable();
setTimeout(() => {
  delay.disable();
  console.log('loop delay samples', delay.count > 0, delay.min > 0);
  assert(delay.count > 0 && delay.min > 0 && delay.max >= delay.min, 'event loop delay');
}, 60);
