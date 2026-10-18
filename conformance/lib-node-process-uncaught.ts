const seen: string[] = [];

process.on('uncaughtExceptionMonitor', (err, origin) => seen.push(`monitor:${err.message}:${origin}`));
process.on('uncaughtException', (err, origin) => {
  seen.push(`caught:${err.message}:${origin}`);
});
process.on('unhandledRejection', (reason) => {
  seen.push(`rejection:${(reason as Error).message}`);
});

let drains = 0;
process.on('beforeExit', (code) => {
  drains++;
  seen.push(`beforeExit:${code}`);
  // More work: the loop runs again, then drains a second time
  if (drains === 1) setTimeout(() => seen.push('after beforeExit'), 1);
});
process.on('exit', (code) => {
  console.log(seen.join('\n'));
  console.log('exit', code);
  assert(seen.includes('caught:from timer:uncaughtException'), 'timer throw caught');
  assert(seen.includes('monitor:from timer:uncaughtException'), 'monitor runs first');
  assert(seen.includes('rejection:async failure'), 'unhandled rejection');
  assert(drains === 2 && seen.includes('after beforeExit'), 'beforeExit runs per drain');
  assert(code === 0, 'handled errors do not fail the process');
});

setTimeout(() => {
  throw new Error('from timer');
}, 1);

async function failLater(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 2));
  throw new Error('async failure');
}
failLater();
