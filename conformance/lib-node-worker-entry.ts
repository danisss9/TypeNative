// new Worker('./file.ts') / fork('./file.ts'): the other file is compiled into
// the binary as a second entry point, run in the child process instead of
// this program (whose top-level code runs only here)
import { Worker } from 'node:worker_threads';
import { fork } from 'node:child_process';

let mainRuns = 0;
mainRuns++;
assert(mainRuns === 1, 'the main program runs once, in the parent');

const worker = new Worker(new URL('./worker-entry-helper.ts', import.meta.url), { workerData: { factor: 3 } });
worker.once('message', (m: any) => {
  assert(m.result === 42 && m.mainThread === false && m.count === 1, `worker reply: ${JSON.stringify(m)}`);
  assert(m.threadId === worker.threadId, 'threadId');
  assert(JSON.stringify(m).startsWith('{"result":42,"mainThread":false,"threadId":'), `messages keep key order: ${JSON.stringify(m)}`);
  assert(JSON.stringify(m.tally) === '{"zeta":26,"alpha":1}', `records arrive in order: ${JSON.stringify(m.tally)}`);
  worker.terminate();

  const child = fork('./fork-entry-helper.ts', ['one', 'two']);
  child.on('message', (reply: any) => {
    assert(reply.reply === 'hello from the child' && reply.got === 'ping', `child reply: ${JSON.stringify(reply)}`);
    assert(reply.argv.join(',') === 'one,two', `child argv: ${reply.argv}`);
  });
  child.on('exit', (code) => {
    assert(code === 0, `child exit code ${code}`);
    console.log('entry points ok');
  });
  child.send('ping');
});
worker.postMessage(14);
