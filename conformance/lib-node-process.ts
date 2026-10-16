import { argv, pid, nextTick } from 'node:process';

assert(argv.length >= 2 && process.argv.length >= 2, 'argv has Node shape');
assert(process.execPath.length > 0 && process.argv0.length > 0, 'execPath / argv0');
assert(pid > 0 && process.pid === pid && process.ppid > 0, 'pid / ppid');
assert(['x64', 'arm64', 'ia32', 'arm'].includes(process.arch), 'arch');
assert(process.version.startsWith('v') && process.versions.node.length > 0, 'version');

const start = process.hrtime();
assert(start.length === 2 && start[1] >= 0 && start[1] < 1e9, 'hrtime');
const diff = process.hrtime(start);
assert(diff[0] >= 0 && diff.length === 2, 'hrtime diff');
assert(process.hrtime.bigint() > 0n, 'hrtime.bigint');
assert(process.uptime() >= 0, 'uptime');
const mem = process.memoryUsage();
assert(mem.heapUsed > 0 && mem.rss > 0, 'memoryUsage');

const cwd = process.cwd();
process.chdir('..');
assert(process.cwd() !== cwd, 'chdir');
process.chdir(cwd);
assert(process.cwd() === cwd, 'chdir back');

assert(process.stdout.write('') === true, 'stdout.write');
assert(typeof process.stdout.isTTY === 'boolean' || process.stdout.isTTY === undefined, 'isTTY');

let ticked = false;
nextTick(() => {
  ticked = true;
});
assert(!ticked, 'nextTick runs later');
setTimeout(() => assert(ticked, 'nextTick ran before timers'), 0);

process.exitCode = 0;
assert(process.exitCode === 0, 'exitCode');
