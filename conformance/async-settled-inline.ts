// Async functions that never wait on anything pending (they await only
// other such functions) run on the caller's goroutine. What JS does must not
// change: the body runs before the caller goes on, `.then` callbacks run
// after the current code, a throw rejects the promise (caught by await's
// try/catch and by .catch), results of every type arrive, AsyncLocalStorage
// sees the store the call ran in, and they mix with async functions that do
// wait (a timer) and with recursive ones
import { AsyncLocalStorage } from 'node:async_hooks';

const log: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

async function leaf(n: number): Promise<number> {
  log.push(`leaf ${n}`);
  return n * 2;
}
async function twice(n: number): Promise<number> {
  const a = await leaf(n);
  const b = await leaf(a);
  return a + b;
}
async function fail(message: string): Promise<number> {
  log.push(`fail ${message}`);
  throw new Error(message);
}
async function guarded(message: string): Promise<string> {
  try {
    await fail(message);
    return 'no throw';
  } catch (e) {
    return `caught ${(e as Error).message}`;
  }
}
async function name(): Promise<string> {
  return `n${1 + 1}`;
}
async function nothing(): Promise<void> {
  log.push('nothing');
}
const als = new AsyncLocalStorage<string>();
async function store(): Promise<string> {
  return `store ${als.getStore() ?? 'none'}`;
}
async function slow(): Promise<number> {
  await new Promise<void>((resolve) => setTimeout(resolve, 2));
  return 5;
}
async function fact(n: number): Promise<number> {
  if (n <= 1) return 1;
  const rest = await fact(n - 1);
  return n * rest;
}

async function main(): Promise<void> {
  // 1. The body runs before the caller goes on
  const p = leaf(1);
  log.push('after call');
  check('sync part', log.join('|'), 'leaf 1|after call');
  check('value', await p, 2);
  log.length = 0;

  // 2. .then runs after the current code
  leaf(3).then((v) => log.push(`then ${v}`));
  log.push('sync');
  await leaf(0);
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  check('then order', log.join('|'), 'leaf 3|sync|leaf 0|then 6');
  log.length = 0;

  // 3. Chains, throws, every result type
  check('chain', await twice(2), 4 + 8);
  check('guarded', await guarded('boom'), 'caught boom');
  let caught = '';
  await fail('late').catch((e: Error) => {
    caught = e.message;
    return 0;
  });
  check('catch', caught, 'late');
  check('string', await name(), 'n2');
  await nothing();
  check('log', log.join('|'), 'leaf 2|leaf 4|fail boom|fail late|nothing');
  log.length = 0;

  // 4. AsyncLocalStorage: the store the call runs in
  check('store none', await store(), 'store none');
  check('store run', await als.run('s1', () => store()), 'store s1');
  check('store after', await store(), 'store none');

  // 5. Mixed with an async function that waits, and a recursive one
  const [a, b] = await Promise.all([slow(), twice(1)]);
  check('mixed', a + b, 5 + 2 + 4);
  check('fact', await fact(6), 720);
  console.log('ok');
}

main();
