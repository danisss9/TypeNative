async function* count(): AsyncGenerator<number> { yield 1; yield 2; yield 3; }
async function main(): Promise<void> {
  let s = 0;
  for await (const v of count()) s += v;
  assert(s === 6, 'for await');
}
main();
