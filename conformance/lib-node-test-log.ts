// node:test t.log on run()'s TestsStream: a 'test:log' event (Node 26) with
// the message and the test's name, while the reporters show the message like
// t.diagnostic's
import { run } from 'node:test';
import { tap } from 'node:test/reporters';
import path from 'node:path';

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log('FAIL ' + label);
  }
}

async function main(): Promise<void> {
  const stream = run({ files: [path.join(__dirname, 'log-child-helper.ts')] });
  const events: Array<{ message: string; name: string }> = [];
  stream.on('test:log', (e: unknown) => {
    // (TypeNative's stream hands the event's data to listeners; Node wraps it)
    const wrapper = e as { data?: { message: string; name: string } };
    const d = wrapper.data ?? (e as { message: string; name: string });
    events.push({ message: d.message, name: d.name });
  });

  let text = '';
  for await (const chunk of stream.compose(tap)) text += chunk;

  assert(events.length === 1, `one test:log event (${events.length})`);
  if (events.length === 1) {
    assert(events[0].message === 'hello from t.log', `the message (${events[0].message})`);
    assert(events[0].name === 'logs', `the test's name (${events[0].name})`);
  }
  assert(text.includes('# hello from t.log'), `the report shows it: ${JSON.stringify(text.slice(0, 140))}`);

  console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
}
main();
