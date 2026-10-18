import zlib from 'node:zlib';
import { promisify } from 'node:util';

const text = 'callback compression '.repeat(40);
const order: string[] = [];

zlib.gzip(text, (err, gz) => {
  assert(err === null && gz[0] === 0x1f && gz[1] === 0x8b, 'gzip(buf, cb)');
  zlib.gunzip(gz, (err2, plain) => {
    assert(err2 === null && plain.toString() === text, 'gunzip(buf, cb)');
    order.push('gzip');
  });
});

zlib.deflate(Buffer.from(text), { level: 1 }, (err, deflated) => {
  assert(err === null && deflated[0] === 0x78, 'deflate(buf, options, cb)');
  zlib.unzip(deflated, (err2, plain) => {
    assert(err2 === null && plain.toString() === text, 'unzip(buf, cb) detects zlib format');
  });
});

zlib.deflateRaw(text, (err, raw) => {
  zlib.inflateRaw(raw, (err2, plain) => {
    assert(err === null && err2 === null && plain.toString() === text, 'deflateRaw / inflateRaw callbacks');
  });
});

zlib.inflate(Buffer.from('definitely not zlib'), (err, _result) => {
  assert(err !== null && (err as NodeJS.ErrnoException).code === 'Z_DATA_ERROR', 'inflate passes a Z_DATA_ERROR to the callback');
});
order.push('sync');

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

async function main() {
  const packed = await gzipAsync('promised data');
  const unpacked = await gunzipAsync(packed);
  assert(unpacked.toString() === 'promised data', 'promisify(zlib.gzip) round trip');
  let code = '';
  try {
    await gunzipAsync(Buffer.from('nope'));
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code === 'Z_DATA_ERROR', 'promisified gunzip rejects bad input');
  assert(order[0] === 'sync', 'callbacks run after the current code');
}
main();
