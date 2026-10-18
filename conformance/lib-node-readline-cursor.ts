import readline from 'node:readline';
import { PassThrough } from 'node:stream';

const out = new PassThrough();
let written = '';
out.on('data', (chunk) => {
  written += String(chunk);
});

readline.cursorTo(out, 4);
readline.cursorTo(out, 2, 5);
readline.moveCursor(out, -3, 2);
readline.moveCursor(out, 1, -1);
readline.clearLine(out, -1);
readline.clearLine(out, 1);
readline.clearLine(out, 0);
let called = false;
readline.clearScreenDown(out, () => {
  called = true;
});
const noop = readline.moveCursor(out, 0, 0);

setTimeout(() => {
  const esc = written.split('\x1b').join('ESC');
  assert(esc.startsWith('ESC[5GESC[6;3H'), 'cursorTo with and without y');
  assert(esc.includes('ESC[3DESC[2BESC[1CESC[1A'), 'moveCursor emits relative moves');
  assert(esc.includes('ESC[1KESC[0KESC[2K'), 'clearLine directions');
  assert(esc.endsWith('ESC[0J'), 'clearScreenDown');
  assert(called && noop === true, 'callbacks run; a zero move writes nothing');
}, 20);
