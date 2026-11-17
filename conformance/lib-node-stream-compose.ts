import { compose, Readable, Transform } from 'node:stream';

async function main(): Promise<void> {
  // compose() of async generator functions: a Duplex
  const upper = compose(
    async function* (source: AsyncIterable<any>) {
      for await (const chunk of source) yield String(chunk).toUpperCase();
    },
    async function* (source: AsyncIterable<string>) {
      for await (const chunk of source) yield `[${chunk}]`;
    }
  );
  const out: string[] = [];
  await new Promise<void>((resolve) => {
    upper.on('data', (chunk) => out.push(String(chunk)));
    upper.on('end', () => resolve());
    upper.write('ab');
    upper.end('cd');
  });
  console.log('duplex:', out.join(''));
  assert(out.join('') === '[AB][CD]', 'generator stages');

  // A source generator first: a readable
  const fromSource = compose(
    async function* () {
      yield 'x';
      yield 'y';
    },
    async function* (chunks: AsyncIterable<string>) {
      for await (const chunk of chunks) yield chunk + '!';
    }
  );
  const got: string[] = [];
  for await (const chunk of fromSource) got.push(String(chunk));
  console.log('source:', got.join(','));
  assert(got.join(',') === 'x!,y!', 'source generator');

  // An async function last: a writable, finished once the function returns
  let sunk = '';
  const sink = compose(
    async function* (chunks: AsyncIterable<any>) {
      for await (const chunk of chunks) yield String(chunk).repeat(2);
    },
    async function (chunks: AsyncIterable<string>) {
      for await (const chunk of chunks) sunk += chunk;
    }
  );
  await new Promise<void>((resolve) => {
    sink.on('finish', () => resolve());
    sink.write('q');
    sink.end('r');
  });
  console.log('sink:', sunk);
  assert(sunk === 'qqrr', 'async sink function');

  // Streams and generators mixed
  const mix = compose(
    new Transform({
      transform(chunk, _enc, cb) {
        cb(null, String(chunk) + '1');
      }
    }),
    async function* (chunks: AsyncIterable<any>) {
      for await (const chunk of chunks) yield String(chunk) + '2';
    }
  );
  const mixed: string[] = [];
  await new Promise<void>((resolve) => {
    mix.on('data', (chunk) => mixed.push(String(chunk)));
    mix.on('end', () => resolve());
    mix.end('z');
  });
  console.log('mixed:', mixed.join(','));
  assert(mixed.join(',') === 'z12', 'stream then generator');

  // readable.compose(generator)
  const doubled: string[] = [];
  const twice = Readable.from(['a', 'b']).compose(async function* (chunks: AsyncIterable<string>): AsyncGenerator<string> {
    for await (const text of chunks) yield text + text;
  });
  for await (const piece of twice) doubled.push(String(piece));
  assert(doubled.join(',') === 'aa,bb', 'readable.compose');
}

main();
