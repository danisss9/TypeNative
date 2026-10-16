import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const key = Buffer.alloc(32, 7);
const iv = Buffer.alloc(16, 1);

const cbc = createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([cbc.update('attack at dawn'), cbc.final()]);
assert(encrypted.length === 16, 'cbc pads to the block size');
const cbcDecipher = createDecipheriv('aes-256-cbc', key, iv);
assert(Buffer.concat([cbcDecipher.update(encrypted), cbcDecipher.final()]).toString() === 'attack at dawn', 'cbc round trip');

const hexCipher = createCipheriv('aes-256-cbc', key, iv);
const hex = hexCipher.update('hello', 'utf8', 'hex') + hexCipher.final('hex');
const hexDecipher = createDecipheriv('aes-256-cbc', key, iv);
assert(hexDecipher.update(hex, 'hex', 'utf8') + hexDecipher.final('utf8') === 'hello', 'string encodings');

const ctr = createCipheriv('aes-128-ctr', key.subarray(0, 16), iv);
const streamed = ctr.update('stream');
assert(streamed.length === 6, 'ctr encrypts as it goes');
const ctrBack = createDecipheriv('aes-128-ctr', key.subarray(0, 16), iv);
assert(ctrBack.update(streamed).toString() === 'stream', 'ctr round trip');

const nonce = randomBytes(12);
const gcm = createCipheriv('aes-256-gcm', key, nonce);
gcm.setAAD(Buffer.from('header'));
const sealed = Buffer.concat([gcm.update('secret'), gcm.final()]);
const tag = gcm.getAuthTag();
assert(tag.length === 16, 'gcm auth tag');
const gcmDecipher = createDecipheriv('aes-256-gcm', key, nonce);
gcmDecipher.setAAD(Buffer.from('header'));
gcmDecipher.setAuthTag(tag);
assert(Buffer.concat([gcmDecipher.update(sealed), gcmDecipher.final()]).toString() === 'secret', 'gcm round trip');

const tampered = createDecipheriv('aes-256-gcm', key, nonce);
tampered.setAAD(Buffer.from('other'));
tampered.setAuthTag(tag);
let rejected = false;
try {
  tampered.update(sealed);
  tampered.final();
} catch {
  rejected = true;
}
assert(rejected, 'gcm rejects tampered data');
