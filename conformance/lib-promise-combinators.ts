const wait = (ms: number, v: number): Promise<number> => new Promise((r) => setTimeout(() => r(v), ms));
async function main(): Promise<void> {
  const fastest = await Promise.race([wait(30, 1), wait(5, 2)]);
  const settled = await Promise.allSettled([wait(1, 3), Promise.reject(new Error('x'))]);
  const any = await Promise.any([Promise.reject(new Error('y')), wait(1, 4)]);
  assert(fastest === 2 && settled[0].status === 'fulfilled' && settled[1].status === 'rejected' && any === 4, 'combinators');
}
main();
