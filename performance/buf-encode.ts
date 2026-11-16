// perf: `Buffer` integer reads and writes, `hex` / `base64` / `utf8` conversion, `Buffer.concat`, `Uint8Array` `toHex` / `fromBase64` and `TextEncoder` / `TextDecoder`
import { performance } from 'node:perf_hooks';
import { Buffer } from 'node:buffer';

const text = 'héllo wörld, packets and frames: 0123456789 '.repeat(4);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const start = performance.now();
let total = 0;
for (let i = 0; i < 40_000; i++) {
  const buf = Buffer.alloc(64);
  for (let off = 0; off < 64; off += 4) buf.writeUInt32LE((i * 2654435761 + off) >>> 0, off);
  for (let off = 0; off < 64; off += 4) total += buf.readUInt32LE(off) & 255;
  const hex = buf.toString('hex');
  const b64 = buf.toString('base64');
  total += hex.length + b64.length + Buffer.from(b64, 'base64')[i & 63];
  const joined = Buffer.concat([buf, Buffer.from(text)]);
  // (only the text part: TypeNative decodes truncated UTF-8 sequences differently, see the README)
  total += joined.length + joined.toString('utf8', 64).length;
  const u8 = Uint8Array.fromBase64(b64);
  total += u8.toHex().length;
  const enc = encoder.encode(text);
  total += enc.length + decoder.decode(enc).length;
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
