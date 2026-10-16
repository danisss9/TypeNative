import { createReadStream, createWriteStream, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'tn-streams-'));
  const source = join(dir, 'source.txt');
  const target = join(dir, 'target.txt');

  const out = createWriteStream(source);
  out.write('line one\n');
  out.write(Buffer.from('line two\n'));
  out.end('end\n');
  await new Promise<void>((resolve) => out.on('finish', () => resolve()));
  assert(readFileSync(source, 'utf8') === 'line one\nline two\nend\n', 'createWriteStream');

  let text = '';
  const input = createReadStream(source, { encoding: 'utf8', highWaterMark: 4 });
  for await (const chunk of input) text += chunk;
  assert(text === 'line one\nline two\nend\n', 'createReadStream in small chunks');

  const partial = createReadStream(source, { start: 5, end: 7 });
  let part = '';
  for await (const chunk of partial) part += chunk.toString();
  assert(part === 'one', 'start / end');

  await pipeline(createReadStream(source), createWriteStream(target));
  assert(readFileSync(target, 'utf8') === readFileSync(source, 'utf8'), 'pipeline copies a file');

  let code = '';
  const missing = createReadStream(join(dir, 'missing.txt'));
  await new Promise<void>((resolve) => {
    missing.on('error', (err) => {
      code = (err as NodeJS.ErrnoException).code ?? '';
      resolve();
    });
    missing.resume();
  });
  assert(code === 'ENOENT', 'missing file errors with ENOENT');
  rmSync(dir, { recursive: true, force: true });
}
main();
