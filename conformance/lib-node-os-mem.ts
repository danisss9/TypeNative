import os from 'node:os';

const total = os.totalmem();
const free = os.freemem();
console.log('memory', total > 0, free > 0, free <= total);
assert(total > 1024 * 1024 && free > 0 && free <= total, 'totalmem / freemem');
assert(os.uptime() > 0, 'uptime');
const load = os.loadavg();
assert(load.length === 3 && load.every((n) => n >= 0), 'loadavg');
assert(os.release().length > 0 && os.version().length > 0, 'release / version');

const before = process.cpuUsage();
let x = 0;
for (let i = 0; i < 2_000_000; i++) x += i % 7;
const delta = process.cpuUsage(before);
console.log('cpu', typeof delta.user, delta.user >= 0, delta.system >= 0, x > 0);
assert(delta.user >= 0 && delta.system >= 0, 'cpuUsage delta');
const usage = process.resourceUsage();
assert(usage.maxRSS > 0 && usage.userCPUTime >= 0, 'resourceUsage');
assert(process.availableMemory() > 0, 'availableMemory');
