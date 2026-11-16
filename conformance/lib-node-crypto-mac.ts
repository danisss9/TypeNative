// crypto.randomUUIDv7, createMac (HMAC, KMAC, CMAC), getMacs
import * as crypto from 'node:crypto';

const v7 = crypto.randomUUIDv7();
console.log(v7);
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v7), 'a version 7 UUID');
const stamp = parseInt(v7.replace(/-/g, '').slice(0, 12), 16);
assert(Math.abs(stamp - Date.now()) < 60000, 'its first 48 bits are the time in ms');

const key = Buffer.from('secretkey');
const hmac = crypto.createMac('hmac', key, { digest: 'sha256' }).update('da').update('ta').final('hex');
assert(hmac === crypto.createHmac('sha256', key).update('data').digest('hex'), 'hmac matches createHmac');
assert(crypto.createMac('kmac128', key).update('data').final('hex') === '9671f96f662a12e499123089fdb896d186a3c6e2dd3b2220982860440b112d30', 'kmac128');
const kmac256 = crypto.createMac('kmac256', key, { outputLength: 16, customization: Buffer.from('c') }).update('data').final('hex');
assert(kmac256 === '2952043a25137faf77733bda78847960', 'kmac256 with options');
const cmac = crypto.createMac('cmac', Buffer.alloc(32, 1), { cipher: 'aes-256-cbc' }).update('data').final('base64');
assert(cmac === 'Kv7S6p7+Caah+AO7Loxsgw==', 'aes-256 cmac');
assert(crypto.createMac('cmac', Buffer.alloc(16, 1), { cipher: 'aes-128-cbc' }).update('data').final('hex') === 'f3346600cd81405c757d154341c4ee75', 'aes-128 cmac');
assert(crypto.createMac('hmac', key, { digest: 'sha1' }).final().length === 20, 'final() gives bytes');
let code = '';
try {
  crypto.createMac('hmac', key);
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
}
assert(code === 'ERR_INVALID_ARG_VALUE', 'hmac needs a digest');
const macs = crypto.getMacs();
assert(macs.includes('hmac') && macs.includes('kmac256') && macs.includes('cmac'), 'getMacs');
