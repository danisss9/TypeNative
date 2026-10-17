import { Readable, Writable, Transform, compose } from 'node:stream';
import { gunzipSync } from 'node:zlib';

async function collect(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const parts: Uint8Array[] = [];
  for await (const chunk of stream) parts.push(chunk);
  return Buffer.concat(parts);
}

async function main(): Promise<void> {
  // TextEncoderStream / TextDecoderStream (a character split across chunks)
  const euro = Buffer.from('€uro', 'utf8');
  const decoded: string[] = [];
  await ReadableStream.from([euro.subarray(0, 2), euro.subarray(2)])
    .pipeThrough(new TextDecoderStream())
    .pipeTo(
      new WritableStream<string>({
        write(chunk) {
          decoded.push(chunk);
        }
      })
    );
  console.log('decoded:', decoded.join(''));
  assert(decoded.join('') === '€uro', 'TextDecoderStream joins split characters');
  const encoded = await collect(ReadableStream.from(['hé', 'llo']).pipeThrough(new TextEncoderStream()));
  assert(encoded.toString() === 'héllo' && encoded.length === 6, 'TextEncoderStream');
  assert(new TextDecoderStream().encoding === 'utf-8', 'encoding');

  // CompressionStream / DecompressionStream round trips
  for (const format of ['gzip', 'deflate', 'deflate-raw'] as const) {
    const packed = await collect(ReadableStream.from([Buffer.from('hello '.repeat(50))]).pipeThrough(new CompressionStream(format)));
    const unpacked = await collect(ReadableStream.from([packed]).pipeThrough(new DecompressionStream(format)));
    console.log(format, packed.length < 300, unpacked.length);
    assert(unpacked.toString() === 'hello '.repeat(50), `${format} round trip`);
    if (format === 'gzip') assert(gunzipSync(packed).toString() === 'hello '.repeat(50), 'zlib reads CompressionStream output');
  }

  // Readable.toWeb / Readable.fromWeb
  const web = Readable.toWeb(Readable.from(['a', 'b', 'c']));
  const fromNode: string[] = [];
  for await (const chunk of web) fromNode.push(String(chunk));
  console.log('toWeb:', fromNode.join(''));
  assert(fromNode.join('') === 'abc', 'Readable.toWeb');

  const node = Readable.fromWeb(ReadableStream.from(['x', 'y', 'z']), { objectMode: true });
  const fromWeb: string[] = [];
  for await (const chunk of node) fromWeb.push(chunk);
  console.log('fromWeb:', fromWeb.join(''));
  assert(fromWeb.join('') === 'xyz', 'Readable.fromWeb');

  // Writable.toWeb / Writable.fromWeb
  const sunk: string[] = [];
  const nodeSink = new Writable({
    write(chunk, _enc, cb) {
      sunk.push(chunk.toString());
      cb();
    }
  });
  const webWriter = Writable.toWeb(nodeSink).getWriter();
  await webWriter.write('one');
  await webWriter.write('two');
  await webWriter.close();
  assert(sunk.join(',') === 'one,two', 'Writable.toWeb');

  const webSunk: string[] = [];
  const nodeWriter = Writable.fromWeb(
    new WritableStream<Uint8Array>({
      write(chunk) {
        webSunk.push(Buffer.from(chunk).toString());
      }
    })
  );
  await new Promise<void>((resolve) => {
    nodeWriter.write('left');
    nodeWriter.end('right', () => resolve());
  });
  console.log('fromWeb writes:', webSunk.join(','));
  assert(webSunk.join(',') === 'left,right', 'Writable.fromWeb');

  // stream.compose: Node transforms and a web TransformStream in one Duplex
  const upper = new Transform({
    transform(chunk, _enc, cb) {
      cb(null, chunk.toString().toUpperCase());
    }
  });
  const exclaim = new TransformStream<Uint8Array, string>({
    transform(chunk, controller) {
      controller.enqueue(`${Buffer.from(chunk).toString()}!`);
    }
  });
  const composed = compose(upper, exclaim);
  const out: string[] = [];
  composed.on('data', (chunk) => out.push(String(chunk)));
  await new Promise<void>((resolve) => {
    composed.on('end', () => resolve());
    composed.write('hi');
    composed.end('yo');
  });
  // Chunk boundaries may merge on the way through
  console.log('compose:', out.join('').replace(/!/g, ''));
  assert(out.join('').replace(/!/g, '') === 'HIYO' && out.join('').endsWith('!'), 'compose');
}

main();
