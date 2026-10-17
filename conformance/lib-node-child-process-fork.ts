import { fork } from 'node:child_process';

if (process.argv[2] === 'child') {
  // The forked copy: answer messages until the parent says bye
  process.on('message', (msg: any) => {
    if (msg.cmd === 'square') process.send!({ result: msg.value * msg.value, list: [1, 'two', { three: 3 }] });
    if (msg.cmd === 'bye') process.disconnect();
  });
  process.send!({ ready: true, connected: process.connected });
} else {
  const child = fork(process.argv[1], ['child']);
  assert(child.connected, 'connected right after fork');
  const seen: string[] = [];
  child.on('message', (msg: any) => {
    if (msg.ready) {
      seen.push(`ready(connected=${msg.connected})`);
      child.send({ cmd: 'square', value: 7 });
    } else if (msg.result !== undefined) {
      seen.push(`result=${msg.result}`);
      assert(msg.list.length === 3 && msg.list[2].three === 3, 'JSON-like messages');
      child.send({ cmd: 'bye' }, (err) => assert(err === null, 'send callback'));
    }
  });
  child.on('disconnect', () => seen.push('disconnect'));
  child.on('exit', (code) => {
    console.log(seen.join(','), 'exit', code);
    assert(seen.join(',') === 'ready(connected=true),result=49,disconnect', 'message flow');
    assert(code === 0 && !child.connected, 'clean exit');
  });
}
