// perf: `node:zlib` `gzipSync` / `gunzipSync`, `brotliCompressSync` / `brotliDecompressSync` and `zstdCompressSync` / `zstdDecompressSync`
import { performance } from 'node:perf_hooks';
import {
  gzipSync,
  gunzipSync,
  brotliCompressSync,
  brotliDecompressSync,
  zstdCompressSync,
  zstdDecompressSync
} from 'node:zlib';

const chunks: string[] = [];
for (let i = 0; i < 600; i++) {
  chunks.push(`{"id":${i},"name":"record-${i & 31}","active":${(i & 1) === 0},"tags":["alpha","beta","gamma"]}\n`);
}
const payload = Buffer.from(chunks.join(''), 'utf-8');

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 4; pass++) {
  const gz = gzipSync(payload);
  const ungz = gunzipSync(gz);
  total += ungz.length + ungz[pass & 255];

  const br = brotliCompressSync(payload);
  const unbr = brotliDecompressSync(br);
  total += unbr.length + unbr[pass & 255];

  const zs = zstdCompressSync(payload);
  const unzs = zstdDecompressSync(zs);
  total += unzs.length + unzs[pass & 255];
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
