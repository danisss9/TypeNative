import zlib, { gzipSync, gunzipSync, deflateSync, inflateSync, deflateRawSync, inflateRawSync, unzipSync, crc32 } from 'node:zlib';

const text = 'compress me '.repeat(50);
const gz = gzipSync(text);
assert(gz[0] === 0x1f && gz[1] === 0x8b && gz.length < text.length, 'gzip header and size');
assert(gunzipSync(gz).toString() === text, 'gzip round trip');
const deflated = deflateSync(Buffer.from(text), { level: 9 });
assert(deflated[0] === 0x78 && inflateSync(deflated).toString() === text, 'deflate (zlib format)');
assert(inflateRawSync(deflateRawSync(text)).toString() === text, 'raw deflate');
assert(unzipSync(gz).toString() === text && unzipSync(deflated).toString() === text, 'unzip detects the format');
assert(crc32('hello') === 907060870 && crc32('world', crc32('hello ')) === crc32('hello world'), 'crc32');
assert(zlib.constants.Z_BEST_COMPRESSION === 9, 'constants');

let code = '';
try {
  gunzipSync(Buffer.from('not gzip data'));
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
}
assert(code === 'Z_DATA_ERROR', 'invalid input throws Z_DATA_ERROR');
