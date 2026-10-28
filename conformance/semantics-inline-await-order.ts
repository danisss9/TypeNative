// Awaits inside an async callback run inline (here, inside als.run) resume in
// the order their promises settle, even when a busy loop makes every timer
// expire at once
import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage<string>();
const seen: string[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(id: string, delay: number): Promise<string> {
  return als.run(id, async () => {
    await sleep(delay);
    seen.push(`${id}=${als.getStore()}`);
    return id;
  });
}

async function main(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    seen.length = 0;
    const all = Promise.all([request('a', 30), request('b', 10), request('c', 20)]);
    const until = Date.now() + 50;
    while (Date.now() < until) {}
    const ids = await all;
    assert(ids.join(',') === 'a,b,c', 'Promise.all keeps input order');
    assert(seen.join(',') === 'b=b,c=c,a=a', `settlement order, got ${seen.join(',')}`);
  }
}

main();
