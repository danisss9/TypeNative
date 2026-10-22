// readline.emitKeypressEvents: 'keypress' (str, key) events decoded from a
// stream's data (Node's key names, modifiers and escape sequences)
import { PassThrough } from 'node:stream';
import * as readline from 'node:readline';

const input = new PassThrough();
readline.emitKeypressEvents(input);
readline.emitKeypressEvents(input); // a second call is a no-op

const seen: string[] = [];
input.on('keypress', (str: string, key: readline.Key) => {
  const flags = (key.ctrl ? 'C' : '') + (key.meta ? 'M' : '') + (key.shift ? 'S' : '');
  seen.push(`${str ?? ''}|${key.name ?? ''}|${flags}|${JSON.stringify(key.sequence)}`);
});

input.write('aB1');
input.write('\r\n\t\x7f ');
input.write('\x03\x1a');
input.write('\x1b[A\x1b[B\x1bOC\x1b[1;5D');
input.write('\x1b[3~\x1b[5;2~\x1b[24;5~\x1b[Z\x1bOP');
input.write('\x1bx.é');
input.write('\x1b[');
input.write('H');

setTimeout(() => {
  const expected = [
    'a|a||"a"',
    'B|b|S|"B"',
    '1|1||"1"',
    '\r|return||"\\r"',
    '\n|enter||"\\n"',
    '\t|tab||"\\t"',
    '\x7f|backspace||"\x7f"',
    ' |space||" "',
    '\x03|c|C|"\\u0003"',
    '\x1a|z|C|"\\u001a"',
    '|up||"\\u001b[A"',
    '|down||"\\u001b[B"',
    '|right||"\\u001bOC"',
    '|left|C|"\\u001b[1;5D"',
    '|delete||"\\u001b[3~"',
    '|pageup|S|"\\u001b[5;2~"',
    '|f12|C|"\\u001b[24;5~"',
    '|tab|S|"\\u001b[Z"',
    '|f1||"\\u001bOP"',
    '|x|M|"\\u001bx"',
    '.|||"."',
    'é|||"é"',
    '|home||"\\u001b[H"'
  ];
  assert(seen.length === expected.length, `keypress count ${seen.length}`);
  for (let i = 0; i < expected.length; i++) {
    assert(seen[i] === expected[i], `key ${i}: ${seen[i]} (expected ${expected[i]})`);
  }

  // a lone ESC is the Escape key once no sequence follows it
  seen.length = 0;
  input.write('\x1b');
  setTimeout(() => {
    assert(seen.length === 1 && seen[0] === '|escape|M|"\\u001b"', `escape: ${seen.join(', ')}`);
    input.end();
    console.log('keypress ok');
  }, 700);
}, 50);
