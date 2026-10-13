async function* letters(): AsyncGenerator<string> {
  const a = await Promise.resolve('a');
  yield a;
  yield 'b';
}
async function main(): Promise<void> {
  const out: string[] = [];
  for await (const l of letters()) out.push(l);
  assert(out.join('') === 'ab', 'async generator');
}
main();
