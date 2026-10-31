export {};
// process.stdout.write(data, callback): the callback runs once the data is
// written, after the current code; the program then exits with all of it
// flushed (more than a pipe's 64 KB buffer)
const order: string[] = [];
const big = 'x'.repeat(100 * 1024);
const done = new Promise<void>((resolve) => {
  const ok = process.stdout.write(big + '\n', () => {
    order.push('written');
    resolve();
  });
  order.push(typeof ok);
});
order.push('after');
await done;
assert(order.join(',') === 'boolean,after,written', `callback order: ${order.join(',')}`);
await new Promise<void>((resolve) => process.stderr.write('', () => resolve()));
process.exit(0);
