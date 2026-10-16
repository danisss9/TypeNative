import { createInterface } from 'node:readline';
import { Readable, PassThrough } from 'node:stream';

const lines: string[] = [];
const rl = createInterface({ input: Readable.from(['first\nsec', 'ond\r\nthird']) });
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  assert(lines.join('|') === 'first|second|third', "'line' events split chunks into lines");
});

const output = new PassThrough();
let prompted = '';
output.on('data', (chunk) => {
  prompted += String(chunk);
});
const asking = createInterface({ input: Readable.from(['Ana\n']), output });
asking.question('Name? ', (answer) => {
  assert(answer === 'Ana' && prompted === 'Name? ', 'question writes the query and answers with the next line');
  asking.close();
});

async function iterate() {
  const collected: string[] = [];
  const reader = createInterface({ input: Readable.from(['x\ny\n']) });
  for await (const line of reader) collected.push(line);
  assert(collected.join(',') === 'x,y', 'for await over an Interface');
}
iterate();
