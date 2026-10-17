import { Worker, isMainThread, workerData, BroadcastChannel } from 'node:worker_threads';

if (isMainThread) {
  // BroadcastChannel: instances with the same name (in this process)
  const a = new BroadcastChannel('news');
  const b = new BroadcastChannel('news');
  b.onmessage = (event: any) => {
    console.log('broadcast:', event.data);
    assert(event.data === 'hello', 'BroadcastChannel');
    a.close();
    b.close();
  };
  a.postMessage('hello');

  // An uncaught exception in a worker: 'error', then exit code 1
  const failing = new Worker(new URL(import.meta.url), { workerData: 'throw' });
  let sawError = false;
  failing.on('error', (err: any) => {
    sawError = true;
    console.log('worker error:', err.message);
    assert(err.message === 'worker failed on purpose', 'error message');
  });
  failing.on('exit', (code) => {
    console.log('failing worker exit code:', code);
    assert(sawError && code === 1, 'exit code 1 after an error');
  });

  // terminate() stops a worker that would run forever
  const looping = new Worker(new URL(import.meta.url), { workerData: 'loop' });
  looping.on('online', async () => {
    const code = await looping.terminate();
    console.log('terminated with', code);
    assert(code === 1, 'terminate resolves with exit code 1');
  });
} else if (workerData === 'throw') {
  throw new Error('worker failed on purpose');
} else {
  setInterval(() => {}, 1000);
}
