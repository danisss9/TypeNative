// perf: `node:crypto` `createHash('sha256')`, `createHmac` and AES-256-GCM `createCipheriv` / `createDecipheriv`
import { performance } from 'node:perf_hooks';
import { createHash, createHmac, createCipheriv, createDecipheriv } from 'node:crypto';

const key = Buffer.alloc(32, 0x42);
const iv = Buffer.alloc(12, 0x24);
const payload = Buffer.alloc(4096);
for (let i = 0; i < payload.length; i++) payload[i] = (i * 31 + 7) & 255;

const start = performance.now();
let total = 0;
for (let pass = 0; pass < 4000; pass++) {
  const h = createHash('sha256').update(payload).digest();
  total += h[0] + h[31];

  const mac = createHmac('sha256', key).update(payload).digest();
  total += mac[0] + mac[31];

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  total += dec.length + dec[pass & 4095];
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
