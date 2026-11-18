async function main(): Promise<void> {
  const v = await Promise.resolve(3);
  assert(v === 3, 'resolve');

  // .then on a Promise.resolve(v) held in a variable, alongside await and multiple consumers
  const p = Promise.resolve(42);
  const log: string[] = [];
  const p2 = p.then((x) => {
    log.push(`then1:${x}`);
    return x * 2;
  });
  p.then((x) => {
    log.push(`then2:${x}`);
  });
  const a = await p;
  const b = await p;
  assert(a === 42 && b === 42, 'multi await on Promise.resolve');
  assert((await p2) === 84, 'chained then value');
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  assert(log.length === 2 && log.includes('then1:42') && log.includes('then2:42'), 'both then callbacks ran');

  // Promise.resolve() with no argument
  const pv = Promise.resolve();
  let voidRan = false;
  pv.then(() => {
    voidRan = true;
  });
  await pv;
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  assert(voidRan, 'void Promise.resolve .then ran');

  // Pending promise with multiple consumers
  const { promise: pending, resolve: resolvePending } = Promise.withResolvers<number>();
  let pendingThen = 0;
  pending.then((n) => {
    pendingThen = n;
  });
  setTimeout(() => resolvePending(7), 2);
  const [pa, pb] = await Promise.all([pending, pending]);
  assert(pa === 7 && pb === 7, 'pending multi await');
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  assert(pendingThen === 7, 'pending .then ran');

  // Rejected promise: .then does not run onFulfilled
  const pr = Promise.reject(new Error('nope'));
  let badThen = false;
  pr.then(() => {
    badThen = true;
  });
  let caught = '';
  try {
    await pr;
  } catch (e) {
    caught = (e as Error).message;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  assert(!badThen && caught === 'nope', 'rejected promise skips .then');
}
main();
