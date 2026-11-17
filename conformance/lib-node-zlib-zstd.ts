// node:zlib Zstd (Node 26.8): zstdCompress(Sync) / zstdDecompress(Sync),
// promisified forms, createZstdCompress / createZstdDecompress, constants and
// the decoder's error codes. Frames interoperate with Node's libzstd ones
// (decoding a blob Node wrote); compressed bytes are libzstd's, so sizes are
// only checked for their order
import { zstdCompressSync, zstdDecompressSync, zstdCompress, zstdDecompress, createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { promisify } from 'node:util';

function code(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

function after(ms: number, fn: () => void): Promise<void> {
  return new Promise((resolve) => setTimeout(() => { fn(); resolve(); }, ms));
}

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log(`FAIL ${label}`);
  }
}

const text = 'hello zstd world, hello zstd world, hello zstd world';
const big = Buffer.from('the quick brown fox jumps over the lazy dog '.repeat(96));

// ---- sync ----
const frame = zstdCompressSync(Buffer.from(text));
assert(frame.subarray(0, 4).toString('hex') === '28b52ffd', 'frame magic');
assert(zstdDecompressSync(frame).toString() === text, 'roundtrip');
assert(frame.length < text.length, 'compresses');
assert(zstdCompressSync(text).equals(frame), 'string input');
assert(zstdDecompressSync(Buffer.from('28b52ffd202f9d00005868656c6c6f20776f726c64020080d3014b11', 'hex')).toString() === 'hello hello hello hello hello world world world', "decodes Node's frame");
assert(zstdDecompressSync(zstdCompressSync(big)).length === big.length, 'big roundtrip');
assert(zstdCompressSync(Buffer.alloc(0)).toString('hex') === '28b52ffd2000010000', 'empty frame');
const l1 = zstdCompressSync(big, { level: 1 });
const l19 = zstdCompressSync(big, { level: 19 });
assert(zstdDecompressSync(l1).length === big.length && zstdDecompressSync(l19).length === big.length, 'levels roundtrip');
const w10 = zstdCompressSync(big, { params: { [constants.ZSTD_c_windowLog]: 10 } });
assert(zstdDecompressSync(w10).length === big.length && w10.length > l19.length, 'windowLog param');

// ---- errors (libzstd's codes) ----
assert(code(() => zstdDecompressSync(Buffer.alloc(0))) === 'Z_BUF_ERROR: unexpected end of file', 'empty input');
assert(code(() => zstdDecompressSync(Buffer.from([1, 2, 3, 4]))) === 'ZSTD_error_prefix_unknown: Unknown frame descriptor', 'bad magic');
assert(code(() => zstdDecompressSync(frame.subarray(0, 10))) === 'Z_BUF_ERROR: unexpected end of file', 'truncated');
const corrupt = Buffer.from(frame);
const at = corrupt.length - 5;
corrupt.writeUInt8(corrupt.readUInt8(at) ^ 255, at);
assert(code(() => zstdDecompressSync(corrupt)) === 'ZSTD_error_corruption_detected: Data corruption detected', 'corrupt body');

// trailing bytes after the last frame are ignored, a skippable frame is
// skipped, and consecutive frames concatenate, as libzstd does
assert(zstdDecompressSync(Buffer.concat([frame, Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0, 0, 0, 0])])).toString() === text, 'trailing garbage ignored');
const skippable = Buffer.concat([Buffer.from([0x50, 0x2a, 0x4d, 0x18, 0x04, 0, 0, 0, 1, 2, 3, 4]), frame]);
assert(zstdDecompressSync(skippable).toString() === text, 'skippable frame skipped');
assert(zstdDecompressSync(Buffer.concat([frame, frame])).toString() === text + text, 'two frames');

// ---- async: callback and promisified ----
const asyncResults: string[] = [];
async function main(): Promise<void> {
  await after(0, () => {
    zstdCompress(big, (err, out) => {
      assert(err === null && zstdDecompressSync(out).equals(big), 'callback compress');
      zstdDecompress(frame, (err2, back) => {
        assert(err2 === null && back.toString() === text, 'callback decompress');
        asyncResults.push('done');
      });
    });
  });
  const p1 = await promisify(zstdCompress)(Buffer.from(text));
  assert(p1.equals(frame), 'promisified compress');
  const p2 = await promisify(zstdDecompress)(frame);
  assert(p2.toString() === text, 'promisified decompress');

  // ---- streams ----
  const chunks: Buffer[] = [];
  const stream = createZstdCompress({ level: 3 });
  stream.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => stream.on('end', resolve));
  stream.write(text);
  stream.end();
  await done;
  const streamFrame = Buffer.concat(chunks);
  assert(streamFrame.subarray(0, 4).toString('hex') === '28b52ffd' && zstdDecompressSync(streamFrame).toString() === text, 'createZstdCompress');

  const back: Buffer[] = [];
  const decompressor = createZstdDecompress();
  decompressor.on('data', (c: Buffer) => back.push(c));
  const done2 = new Promise<void>((resolve) => decompressor.on('end', resolve));
  decompressor.write(streamFrame);
  decompressor.end();
  await done2;
  assert(Buffer.concat(back).toString() === text, 'createZstdDecompress');

  assert(constants.ZSTD_CLEVEL_DEFAULT === 3 && constants.ZSTD_c_compressionLevel === 100 && constants.ZSTD_error_corruption_detected === 20, 'constants');
  assert(asyncResults.length === 1 && failures === 0, failures === 0 ? 'ok' : `failures: ${failures}`);
}
main();
