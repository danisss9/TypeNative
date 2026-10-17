import { Worker, isMainThread, parentPort, workerData, threadId, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';

interface Job {
  numbers: number[];
  label: string;
}

if (isMainThread) {
  assert(parentPort === null && threadId === 0, 'main thread');

  // MessageChannel within one process
  const { port1, port2 } = new MessageChannel();
  port2.postMessage({ queued: true });
  const received = receiveMessageOnPort(port1);
  assert(received !== undefined && received.message.queued === true, 'receiveMessageOnPort');
  port1.on('message', (msg) => {
    console.log('port1 got', msg.text);
    assert(msg.text === 'over the channel', 'MessageChannel');
    port1.close();
  });
  port2.postMessage({ text: 'over the channel' });

  // A worker running this program: workerData in, messages both ways
  const job: Job = { numbers: [1, 2, 3, 4], label: 'sum' };
  const worker = new Worker(new URL(import.meta.url), { workerData: job });
  const events: string[] = [];
  worker.on('online', () => events.push('online'));
  worker.on('message', (msg) => {
    events.push(`message:${msg.kind}`);
    if (msg.kind === 'ready') {
      worker.postMessage({ kind: 'square', value: 12, payload: Buffer.from('hi') });
      return;
    }
    if (msg.kind === 'squared') {
      // Buffers arrive as Uint8Arrays (as in Node)
      const echo = Buffer.from(msg.echo as Uint8Array).toString();
      console.log('worker squared:', msg.value, 'sum:', msg.sum, 'buffer:', echo);
      assert(msg.value === 144 && msg.sum === 10 && echo === 'hi!', 'round trip');
      worker.postMessage({ kind: 'stop' });
    }
  });
  worker.on('error', (err) => assert(false, `worker error: ${err}`));
  worker.on('exit', (code) => {
    console.log('worker exited with', code, events.join(','));
    assert(code === 0, 'exit code');
    assert(events.join(',') === 'online,message:ready,message:squared', 'worker events');
  });
} else {
  const job = workerData as Job;
  const sum = job.numbers.reduce((a, b) => a + b, 0);
  console.log(`worker ${threadId} started (${job.label})`);
  parentPort!.postMessage({ kind: 'ready' });
  parentPort!.on('message', (msg) => {
    if (msg.kind === 'square') {
      const echo = Buffer.concat([Buffer.from(msg.payload as Uint8Array), Buffer.from('!')]);
      parentPort!.postMessage({ kind: 'squared', value: msg.value * msg.value, sum: sum, echo: echo });
      return;
    }
    if (msg.kind === 'stop') parentPort!.close();
  });
}
