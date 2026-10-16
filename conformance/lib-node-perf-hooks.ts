import { performance as perf } from 'node:perf_hooks';
import tty from 'node:tty';
import { SIGINT, F_OK } from 'node:constants';

const start = perf.now();
assert(start >= 0 && performance.now() >= start, 'performance.now');
assert(perf.timeOrigin > 1600000000000, 'timeOrigin is epoch milliseconds');
perf.mark('a');
let sum = 0;
for (let i = 0; i < 100000; i++) sum += i;
perf.mark('b');
const m = perf.measure('a-to-b', 'a', 'b');
assert(m.name === 'a-to-b' && m.entryType === 'measure' && m.duration >= 0, 'measure');
assert(perf.getEntriesByName('a').length === 1 && perf.getEntriesByType('mark').length === 2, 'getEntries');
perf.clearMarks();
assert(perf.getEntriesByType('mark').length === 0, 'clearMarks');
assert(sum > 0, 'work happened');

assert(typeof tty.isatty(1) === 'boolean' && tty.isatty(99) === false, 'tty.isatty');
assert(SIGINT === 2 && F_OK === 0, 'node:constants');
