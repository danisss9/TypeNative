// node:test run({ files }): each file is compiled into the program as an entry
// point and runs in a child process; its events stream back on a TestsStream,
// renumbered across files, with the child's stdout as test:stdout events.
import { run } from 'node:test';
import { tap } from 'node:test/reporters';
import assert from 'node:assert';
import path from 'node:path';

async function main(): Promise<void> {
  // the child helper registers its failing test only when the parent asks
  process.env.TN_RUN_CHILD = '1';
  let passes = 0;
  let failures = 0;
  let childStdout = '';

  const stream = run({ files: [path.join(__dirname, 'run-child-helper.ts')] })
    .on('test:pass', (data) => {
      passes++;
      assert(['child passes', 'helper suite', 'inner'].includes(data.name), `pass name: ${data.name}`);
    })
    .on('test:fail', (data) => {
      failures++;
      assert(data.file !== undefined && data.file.endsWith('run-child-helper.ts'), `the fail event's file: ${data.file}`);
    })
    .on('test:stdout', (data) => {
      childStdout += data.message;
    });

  let text = '';
  for await (const chunk of stream.compose(tap)) text += chunk;

  assert(passes === 3, `pass events: ${passes}`);
  assert(failures === 1, `fail events: ${failures}`);
  assert(childStdout.includes('hello from the child'), `test:stdout: ${JSON.stringify(childStdout)}`);
  assert(text.includes('ok 1 - child passes'), `numbering: ${text}`);
  assert(text.includes('ok 2 - helper suite'), `suite numbering: ${text}`);
  assert(text.includes('not ok 3 - child fails'), `failure numbering: ${text}`);
  assert(text.includes('1..3') && text.includes('# fail 1'), `totals: ${text}`);
  assert(text.includes('# hello from the child'), `stdout in tap: ${text}`);

  console.log('test run ok');
}

main();
