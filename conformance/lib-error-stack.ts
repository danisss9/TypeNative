// err.stack lists the TS frames ("at fn (file.ts:line)"); AggregateError
class AppError extends Error {
  constructor(message: string) { super(message); }
}
class Service {
  run(): void { throw new AppError('service failed'); }
}
function inner(): Error { return new Error('boom'); }
function outer(): Error { return inner(); }
const stack = outer().stack ?? '';
const lines = stack.split('\n');
assert(lines[0] === 'Error: boom', lines[0]);
assert(/^ {4}at inner \(.*lib-error-stack\.ts:8\)$/.test(lines[1]), lines[1]);
assert(/^ {4}at outer \(.*lib-error-stack\.ts:9\)$/.test(lines[2]), lines[2]);
let serviceStack = '';
try { new Service().run(); } catch (err) { serviceStack = (err as Error).stack ?? ''; }
assert(/^Error: service failed\n {4}at Service\.run \(.*lib-error-stack\.ts:6\)/.test(serviceStack), serviceStack);
const agg = new AggregateError([new Error('a'), 'b'], 'many');
assert(agg.name === 'AggregateError' && agg.message === 'many' && agg.errors.length === 2, 'AggregateError');
assert(agg instanceof AggregateError && agg instanceof Error, 'instanceof AggregateError');
