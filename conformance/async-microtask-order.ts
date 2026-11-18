// Microtask order: await inside an async function nobody awaits suspends and
// resumes as a microtask (never synchronously), and .then/.catch/.finally
// callbacks run in microtask order before a later setTimeout(..., 0).

async function run(): Promise<void> {
  // 1. await Promise.resolve() inside an unawaited async function
  {
    const log: string[] = [];
    async function f(): Promise<void> {
      log.push('a1');
      await Promise.resolve();
      log.push('a2');
    }
    f();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer1');
        resolve();
      }, 0);
      log.push('sync1');
    });
    assert(log.join('|') === 'a1|sync1|a2|timer1', `case 1: ${log.join('|')}`);
  }

  // 2. await leaf() (inline-eligible leaf) inside an unawaited async function
  {
    const log: string[] = [];
    async function leaf(): Promise<number> {
      log.push('leaf');
      return 10;
    }
    async function caller(): Promise<void> {
      log.push('c1');
      const v = await leaf();
      log.push(`c2:${v}`);
    }
    caller();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer2');
        resolve();
      }, 0);
      log.push('sync2');
    });
    assert(log.join('|') === 'c1|leaf|sync2|c2:10|timer2', `case 2: ${log.join('|')}`);
  }

  // 3. await on a non-promise value inside an unawaited async function
  {
    const log: string[] = [];
    async function f(): Promise<void> {
      log.push('p1');
      await (1 as any);
      log.push('p2');
    }
    f();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer3');
        resolve();
      }, 0);
      log.push('sync3');
    });
    assert(log.join('|') === 'p1|sync3|p2|timer3', `case 3: ${log.join('|')}`);
  }

  // 4. .then on an unawaited async function with await, before setTimeout(..., 0)
  {
    const log: string[] = [];
    async function f(): Promise<string> {
      log.push('f1');
      await Promise.resolve();
      log.push('f2');
      return 'ok';
    }
    f().then((v) => log.push(`then:${v}`));
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer4');
        resolve();
      }, 0);
      log.push('sync4');
    });
    assert(log.join('|') === 'f1|sync4|f2|then:ok|timer4', `case 4: ${log.join('|')}`);
  }

  // 5. .then / .catch / .finally on settled promises before setTimeout(..., 0)
  {
    const log: string[] = [];
    Promise.resolve('r').then((v) => log.push(`pr:${v}`));
    Promise.reject(new Error('e')).catch((e: Error) => log.push(`pc:${e.message}`));
    Promise.resolve('f').finally(() => log.push('pf'));
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer5');
        resolve();
      }, 0);
      log.push('sync5');
    });
    assert(log.join('|') === 'sync5|pr:r|pc:e|pf|timer5', `case 5: ${log.join('|')}`);
  }

  // 6. queueMicrotask + multi-await + .then before setTimeout(..., 0)
  {
    const log: string[] = [];
    queueMicrotask(() => log.push('qm'));
    async function multi(): Promise<void> {
      log.push('m1');
      await Promise.resolve();
      log.push('m2');
      await Promise.resolve();
      log.push('m3');
    }
    multi().then(() => log.push('m-then'));
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer6');
        resolve();
      }, 0);
      log.push('sync6');
    });
    assert(log.join('|') === 'm1|sync6|qm|m2|m3|m-then|timer6', `case 6: ${log.join('|')}`);
  }

  // 7. dynamic (any-typed) promise .then/.catch/.finally before setTimeout(..., 0)
  {
    const log: string[] = [];
    const p: any = Promise.resolve('dyn');
    p.then((v: unknown) => log.push(`dt:${String(v)}`));
    const pr: any = Promise.reject(new Error('derr'));
    pr.catch((e: Error) => log.push(`dc:${e.message}`));
    const pf: any = Promise.resolve('df');
    pf.finally(() => log.push('df'));
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        log.push('timer7');
        resolve();
      }, 0);
      log.push('sync7');
    });
    assert(log.join('|') === 'sync7|dt:dyn|dc:derr|df|timer7', `case 7: ${log.join('|')}`);
  }
}

// 8. Top-level unawaited async function + .then before setTimeout(..., 0)
const topLog: string[] = [];
async function topFn(): Promise<string> {
  topLog.push('t1');
  await Promise.resolve();
  topLog.push('t2');
  return 'top';
}
topFn().then((v) => topLog.push(`t-then:${v}`));
setTimeout(() => {
  topLog.push('t-timer');
  assert(topLog.join('|') === 't1|t-sync|t2|t-then:top|t-timer', `case 8: ${topLog.join('|')}`);
}, 0);
topLog.push('t-sync');

run();
