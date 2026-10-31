// Function declarations inside functions: hoisted (callable before their
// declaration, mutually recursive), async and generator ones included
async function outer(n: number): Promise<string> {
  const before = isEven(n);
  function isEven(x: number): boolean {
    return x === 0 ? true : isOdd(x - 1);
  }
  function isOdd(x: number): boolean {
    return x === 0 ? false : isEven(x - 1);
  }
  async function twice(x: number): Promise<number> {
    return x * 2;
  }
  function* upTo(max: number) {
    for (let i = 0; i < max; i++) yield i;
  }
  const label = 'n';
  // (uses a local declared before it: defined where it stands)
  function describe(): string {
    return `${label}=${n}`;
  }
  let sum = 0;
  for (const v of upTo(4)) sum += v;
  return `${before} ${isOdd(n)} ${await twice(n)} ${sum} ${describe()}`;
}
outer(7).then((s) => assert(s === 'false true 14 6 n=7', `nested functions: ${s}`));
