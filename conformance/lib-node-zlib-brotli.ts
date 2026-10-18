import zlib, { brotliCompressSync, brotliDecompressSync, createBrotliCompress, createBrotliDecompress, constants } from 'node:zlib';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { buffer } from 'node:stream/consumers';

const text = 'brotli squeezes text '.repeat(60);
const packed = brotliCompressSync(text);
assert(packed.length < text.length / 4, 'brotliCompressSync compresses');
assert(brotliDecompressSync(packed).toString() === text, 'brotli round trip');
assert(brotliCompressSync('hello').toString('hex') === '0b028068656c6c6f03', 'same bytes as Node for a short input');

const fast = brotliCompressSync(Buffer.from(text), { params: { [constants.BROTLI_PARAM_QUALITY]: 1 } });
const fastest = brotliCompressSync(text, { params: { [constants.BROTLI_PARAM_QUALITY]: 0 } });
assert(brotliDecompressSync(fast).toString() === text, 'params: quality');
assert(fastest.length > fast.length && fast.length > packed.length, 'lower quality compresses less');
assert(constants.BROTLI_MAX_QUALITY === 11 && constants.BROTLI_PARAM_QUALITY === 1, 'Brotli constants');

let code = '';
let errno = 0;
try {
  brotliDecompressSync(Buffer.from('not brotli data'));
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
  errno = (e as NodeJS.ErrnoException).errno ?? 0;
}
assert(code === 'ERR__ERROR_FORMAT_PADDING_2' && errno === -15, 'invalid input throws Node’s decoder error');

let truncated = '';
try {
  brotliDecompressSync(packed.subarray(0, 3));
} catch (e) {
  truncated = (e as NodeJS.ErrnoException).code ?? '';
}
assert(truncated === 'Z_BUF_ERROR', 'truncated input throws Z_BUF_ERROR');

const order: string[] = [];
zlib.brotliCompress(text, (err, result) => {
  assert(err === null && result.length === packed.length, 'brotliCompress(buf, cb)');
  zlib.brotliDecompress(result, (err2, plain) => {
    assert(err2 === null && plain.toString() === text, 'brotliDecompress(buf, cb)');
    order.push('callback');
  });
});
order.push('sync');

async function main() {
  const compressAsync = promisify(zlib.brotliCompress);
  const decompressAsync = promisify(zlib.brotliDecompress);
  const roundTrip = await decompressAsync(await compressAsync('promised brotli'));
  assert(roundTrip.toString() === 'promised brotli', 'promisify(brotliCompress) round trip');

  const compressor = createBrotliCompress();
  const compressed = buffer(compressor);
  await pipeline(Readable.from([text], { objectMode: false }), compressor);
  const bytes = await compressed;
  assert(brotliDecompressSync(bytes).toString() === text, 'createBrotliCompress');

  const decompressor = createBrotliDecompress();
  const plain = buffer(decompressor);
  decompressor.end(packed);
  assert((await plain).toString() === text, 'createBrotliDecompress');
  assert(order[0] === 'sync', 'callbacks run after the current code');
}
main();
