const wait = (ms: number, v: number): Promise<number> => new Promise((r) => setTimeout(() => r(v), ms));
async function main(): Promise<void> {
  // The slow timer is far off (a loaded machine can stall between the two
  // setTimeout calls) and cleared once the race settles
  let cancel = (): void => {};
  const slow = new Promise<number>((r) => {
    const t = setTimeout(() => r(1), 1000);
    cancel = () => clearTimeout(t);
  });
  const fastest = await Promise.race([slow, wait(5, 2)]);
  cancel();
  const settled = await Promise.allSettled([wait(1, 3), Promise.reject(new Error('x'))]);
  const any = await Promise.any([Promise.reject(new Error('y')), wait(1, 4)]);
  assert(fastest === 2 && settled[0].status === 'fulfilled' && settled[1].status === 'rejected' && any === 4, 'combinators');
}
main();
