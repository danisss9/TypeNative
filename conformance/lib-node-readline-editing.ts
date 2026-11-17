import { createInterface } from 'node:readline';
import { PassThrough, Writable } from 'node:stream';

// A terminal-mode Interface over a fake input stream: keypresses edit the line
const input = new PassThrough();
let screen = '';
const output = new Writable({
  write(chunk, _enc, cb) {
    screen += chunk.toString();
    cb();
  }
});
const lines: string[] = [];
const historyEvents: string[] = [];
const rl = createInterface({
  input,
  output,
  terminal: true,
  prompt: '$ ',
  historySize: 3,
  completer: (line: string): [string[], string] => {
    const all = ['help', 'hello', 'quit'];
    const hits = all.filter((c) => c.startsWith(line));
    return [hits.length > 0 ? hits : all, line];
  }
});
rl.on('line', (line: string) => lines.push(line));
rl.on('history', (history: string[]) => historyEvents.push(history.join('|')));

async function send(keys: string): Promise<void> {
  input.write(keys);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function main(): Promise<void> {
  assert(rl.terminal, 'terminal mode');
  await send('abc');
  assert(rl.line === 'abc' && rl.cursor === 3, 'typed text');
  await send('\x1b[D');
  await send('\x1b[D');
  await send('X');
  console.log('edit:', JSON.stringify(rl.line), rl.cursor, rl.getCursorPos().cols);
  assert(rl.line === 'aXbc' && rl.cursor === 2, 'left arrow, insert in the middle');
  assert(rl.getCursorPos().cols === 4 && rl.getCursorPos().rows === 0, 'getCursorPos counts the prompt');
  await send('\x7f');
  assert(rl.line === 'abc' && rl.cursor === 1, 'backspace');
  await send('\x1b[3~');
  assert(rl.line === 'ac' && rl.cursor === 1, 'delete');
  await send('\x01');
  assert(rl.cursor === 0, 'ctrl+a');
  await send('\x05');
  assert(rl.cursor === 2, 'ctrl+e');
  await send('\r');

  // History: up / down browse it, most recent first
  await send('one\r');
  await send('two\r');
  await send('two\r');
  await send('\x1b[A');
  assert(rl.line === 'two', 'up: the last line');
  await send('\x1b[A');
  assert(rl.line === 'one', 'up again (the duplicate is skipped)');
  await send('\x1b[B');
  assert(rl.line === 'two', 'down');
  await send('\x1b[B');
  assert(rl.line === '', 'down past the newest: the typed text');
  await send('\x1b[A\r');

  // Tab: a common prefix completes; one candidate completes fully
  await send('hel\t');
  assert(rl.line === 'hel', 'two candidates share "hel"');
  await send('p\r');
  await send('q\t');
  assert(rl.line === 'quit', 'single completion');

  // ctrl+u / ctrl+w / ctrl+k
  await send('\x15');
  assert(rl.line === '', 'ctrl+u');
  await send('foo bar\x17');
  assert(rl.line === 'foo ', 'ctrl+w');
  await send('\x01\x0b');
  assert(rl.line === '', 'ctrl+a, ctrl+k');
  await send('x\r');

  console.log('lines:', JSON.stringify(lines));
  console.log('history:', JSON.stringify(rl.history), historyEvents.length);
  assert(JSON.stringify(lines) === '["ac","one","two","two","two","help","x"]', 'lines');
  assert(JSON.stringify(rl.history) === '["x","help","two"]', 'history trimmed to historySize');
  assert(historyEvents.length === 7 && historyEvents[1] === 'one|ac', "'history' events");
  assert(screen.includes('$ two'), 'the line is redrawn with the prompt');
  rl.close();
}

main();
