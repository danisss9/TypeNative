// Array.fromAsync over async generators, promise arrays and plain arrays, with a mapFn
async function* ticks(): AsyncGenerator<number> {
  for (let i = 1; i <= 3; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1));
    yield i;
  }
}

async function main() {
  const fromGen = await Array.fromAsync(ticks());
  console.log(fromGen);
  assert(fromGen.length === 3 && fromGen[0] === 1 && fromGen[2] === 3, 'fromAsync drains an async generator');

  const fromPromises = await Array.fromAsync([Promise.resolve('a'), Promise.resolve('b')]);
  assert(fromPromises.join('') === 'ab', 'fromAsync awaits an array of promises');

  const fromValues = await Array.fromAsync([1, 2, 3]);
  assert(fromValues.length === 3 && fromValues[1] === 2, 'fromAsync of plain values');

  const doubled = await Array.fromAsync(ticks(), (v: number, i: number) => v * 10 + i);
  console.log(doubled);
  assert(doubled.join(',') === '10,21,32', 'fromAsync maps with the index');

  const awaited = await Array.fromAsync([1, 2], async (v: number) => v + 100);
  assert(awaited[0] === 101 && awaited[1] === 102, 'fromAsync awaits an async mapFn');

  let caught = '';
  try {
    await Array.fromAsync([Promise.resolve(1), new Promise<number>((_resolve, reject) => reject(new Error('boom')))]);
  } catch (e) {
    caught = (e as Error).message;
  }
  assert(caught === 'boom', 'fromAsync rejects with the first rejection');
}

main();
