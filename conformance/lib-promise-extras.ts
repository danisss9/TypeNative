// Promise.withResolvers / Promise.try; async arrows kept as values return promises
const later = async (): Promise<string> => 'async result';
const concise = async (n: number) => n * 2;
async function main(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<number>();
  setTimeout(() => resolve(42), 10);
  assert((await promise) === 42, 'withResolvers resolve');
  const r = Promise.withResolvers<string>();
  r.reject(new Error('nope'));
  let rejected = '';
  try { await r.promise; } catch (e) { rejected = (e as Error).message; }
  assert(rejected === 'nope', 'withResolvers reject');
  assert((await Promise.try(() => 7)) === 7, 'Promise.try value');
  assert((await Promise.try((a: number, b: number) => a + b, 2, 3)) === 5, 'Promise.try arguments');
  let thrown = '';
  try { await Promise.try((): number => { throw new Error('sync throw'); }); } catch (e) { thrown = (e as Error).message; }
  assert(thrown === 'sync throw', 'Promise.try rejects on a throw');
  assert((await Promise.try(later)) === 'async result', 'Promise.try with an async function');
  assert((await later()) === 'async result' && (await concise(21)) === 42, 'async arrows');
}
main();
