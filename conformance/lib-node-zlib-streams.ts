import { createGzip, createGunzip, gunzipSync, gzipSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { buffer } from 'node:stream/consumers';

async function main() {
  const text = 'stream me '.repeat(100);
  const gzip = createGzip();
  const compressed = buffer(gzip);
  await pipeline(Readable.from([text], { objectMode: false }), gzip);
  const bytes = await compressed;
  assert(bytes[0] === 0x1f && gunzipSync(bytes).toString() === text, 'createGzip');

  const gunzip = createGunzip();
  const plain = buffer(gunzip);
  gunzip.end(gzipSync(text));
  assert((await plain).toString() === text, 'createGunzip');
}
main();
