// Async Await
async function asyncFunc(): Promise<string> {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve('Async Result');
    }, 1000);
  });
}

async function run() {
  const result = await asyncFunc();
  console.log(result);
  assert(result === 'Async Result', 'Async result should be Async Result');
}

run();
