import { deepStrictEqual, deepEqual, notDeepStrictEqual, rejects, doesNotReject } from 'node:assert';

deepStrictEqual({ a: [1, 2], b: { c: 'x' } }, { a: [1, 2], b: { c: 'x' } });
deepStrictEqual(new Map([['k', [1]]]), new Map([['k', [1]]]));
deepEqual({ n: 1 }, { n: '1' } as any);
notDeepStrictEqual({ n: 1 }, { n: '1' } as any);
notDeepStrictEqual([1, 2], [2, 1]);

let operator = '';
try {
  deepStrictEqual([1, 2, 3], [1, 2, 4]);
} catch (e) {
  operator = (e as any).operator;
}
assert(operator === 'deepStrictEqual', 'deepStrictEqual failure operator');

async function main() {
  await rejects(Promise.reject(new Error('nope')), /nope/);
  await doesNotReject(Promise.resolve(1));
  let unrejected = false;
  try {
    await rejects(Promise.resolve(2));
  } catch {
    unrejected = true;
  }
  assert(unrejected, 'rejects of a fulfilled promise fails');
}
main();
