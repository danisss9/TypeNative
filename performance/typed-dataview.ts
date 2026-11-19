// perf: `DataView` little- and big-endian integer and float reads and writes over an `ArrayBuffer`
import { performance } from 'node:perf_hooks';

const count = 4096;
const stride = 16; // int32 LE (4) + uint32 BE (4) + float64 LE (8)
const buf = new ArrayBuffer(count * stride);
const view = new DataView(buf);

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 1500; pass++) {
  for (let i = 0; i < count; i++) {
    const off = i * stride;
    view.setInt32(off, i + pass, true);
    view.setUint32(off + 4, (i * 31 + pass) >>> 0, false);
    view.setFloat64(off + 8, (i + pass) * 0.25, true);
  }
  for (let i = 0; i < count; i++) {
    const off = i * stride;
    const a = view.getInt32(off, true);
    const b = view.getUint32(off + 4, false);
    const c = view.getFloat64(off + 8, true);
    total += (a & 255) + (b & 255) + Math.trunc(c);
  }
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
