// worker_threads: MessagePorts in a transferList (both ways), resourceLimits
// (and ERR_WORKER_OUT_OF_MEMORY), worker stdout: true / stderr: true streams
import { Worker, isMainThread, parentPort, workerData, resourceLimits, MessageChannel, MessagePort } from 'node:worker_threads';

if (isMainThread) {
  assert(JSON.stringify(resourceLimits) === '{}', `main thread resourceLimits: ${JSON.stringify(resourceLimits)}`);
  const log: string[] = [];

  // 3. (defined first: the steps run in order) a worker past its heap limit
  const oom = () => {
    const w3 = new Worker(__filename, { workerData: 'oom', resourceLimits: { maxOldGenerationSizeMb: 16 } });
    let code = '';
    w3.on('error', (e: any) => (code = e.code));
    w3.on('exit', (exit: number) => {
      assert(code === 'ERR_WORKER_OUT_OF_MEMORY' && exit === 1, `oom: ${code} ${exit}`);
      log.push('oom');
      console.log(log.join(', '));
      const text = log.join(',');
      assert(text.startsWith('streams,') && text.includes('port1 pong') && text.includes('port1 close') && text.includes('back hello'), text);
      assert(text.endsWith('w2 exit,oom'), text);
    });
  };
  // 2. a port goes to the worker, and the worker sends one back
  const ports = () => {
    const { port1, port2 } = new MessageChannel();
    const w2 = new Worker(__filename, { workerData: 'port' });
    let cloneError = '';
    try {
      w2.postMessage({ port: port2 });
    } catch (e: any) {
      cloneError = e.name;
    }
    assert(cloneError === 'DataCloneError', `a port outside the transferList: ${cloneError}`);
    w2.postMessage({ port: port2 }, [port2]);
    port2.postMessage('ignored: port2 is detached');
    port1.on('message', (m: any) => {
      log.push(`port1 ${m}`);
      if (m === 'pong') port1.close();
    });
    port1.on('close', () => log.push('port1 close'));
    port1.postMessage('ping');
    w2.on('message', (m: any) => {
      const back = m.back as MessagePort;
      back.on('message', (x: any) => {
        log.push(`back ${x}`);
        back.close();
      });
    });
    w2.on('exit', (code: number) => {
      assert(code === 0, `port worker exit ${code}`);
      log.push('w2 exit');
      oom();
    });
  };

  // 1. stdout / stderr streams and resourceLimits
  const w = new Worker(__filename, {
    workerData: 'limits',
    resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16, stackSizeMb: 8 },
    stdout: true,
    stderr: true
  });
  assert(w.resourceLimits.maxOldGenerationSizeMb === 64 && w.resourceLimits.codeRangeSizeMb === -1, 'parent view of the limits');
  let out = '';
  let err = '';
  w.stdout.on('data', (d: any) => (out += String(d)));
  w.stderr.on('data', (d: any) => (err += String(d)));
  w.on('exit', (code: number) => {
    assert(code === 0, `limits worker exit ${code}`);
    assert(out === 'worker limits 64 16 8\n', `worker stdout: ${JSON.stringify(out)}`);
    assert(err === 'to stderr\n', `worker stderr: ${JSON.stringify(err)}`);
    assert(JSON.stringify(w.resourceLimits) === '{}', 'limits are {} after exit');
    log.push('streams');
    ports();
  });

} else if (workerData === 'limits') {
  console.log(`worker limits ${resourceLimits.maxOldGenerationSizeMb} ${resourceLimits.maxYoungGenerationSizeMb} ${resourceLimits.stackSizeMb}`);
  console.error('to stderr');
} else if (workerData === 'port') {
  parentPort!.once('message', (msg: any) => {
    const port = msg.port as MessagePort;
    port.on('message', (m: any) => {
      assert(m === 'ping', `worker port got ${m}`);
      port.postMessage('pong');
    });
    let pending = 2;
    const done = () => {
      pending--;
      if (pending === 0) parentPort!.close();
    };
    port.on('close', done);
    const mc = new MessageChannel();
    parentPort!.postMessage({ back: mc.port1 }, [mc.port1]);
    mc.port2.postMessage('hello');
    mc.port2.on('close', done);
    mc.port2.start();
  });
} else {
  const hog: number[][] = [];
  for (;;) hog.push(new Array<number>(10000).fill(Math.random()));
}
