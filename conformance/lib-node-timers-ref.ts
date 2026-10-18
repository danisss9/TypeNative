// An unref'ed interval does not keep the process alive
const ticker = setInterval(() => {}, 1000);
ticker.unref();
assert(!ticker.hasRef(), 'interval unref');

const t = setTimeout(() => console.log('never'), 10000);
assert(t.hasRef(), 'timeouts start ref-ed');
t.unref();
assert(!t.hasRef(), 'timeout unref');
t.ref();
assert(t.hasRef(), 'timeout ref again');
clearTimeout(t);

// refresh() restarts the countdown
const start = Date.now();
let fired = 0;
const refreshed = setTimeout(() => {
  fired++;
  const elapsed = Date.now() - start;
  console.log('refreshed timeout fired', fired, elapsed >= 40);
  assert(elapsed >= 40, 'refresh delays the timeout');
}, 30);
setTimeout(() => refreshed.refresh(), 15);

// close() clears; setImmediate handles too
const closed = setTimeout(() => assert(false, 'closed timeouts do not fire'), 5);
closed.close();
const immediate = setImmediate(() => console.log('immediate'));
assert(immediate.hasRef(), 'immediate hasRef');
process.on('exit', () => assert(fired === 1, 'fired once'));
