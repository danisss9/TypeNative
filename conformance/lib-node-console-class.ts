import { Console } from 'node:console';
import { PassThrough } from 'node:stream';

const out = new PassThrough();
const err = new PassThrough();
let stdoutText = '';
let stderrText = '';
out.on('data', (chunk) => {
  stdoutText += String(chunk);
});
err.on('data', (chunk) => {
  stderrText += String(chunk);
});

const logger = new Console(out, err);
logger.log('count: %d', 3);
logger.info({ a: 1 });
logger.error('oops');
const objectForm = new Console({ stdout: out, stderr: err });
objectForm.warn('careful');

setTimeout(() => {
  assert(stdoutText === "count: 3\n{ a: 1 }\n", 'log / info write to stdout');
  assert(stderrText === 'oops\ncareful\n', 'error / warn write to stderr');
}, 50);
