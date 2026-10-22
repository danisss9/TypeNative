// AES key wrap ciphers: id-aes*-wrap (RFC 3394) and id-aes*-wrap-pad (RFC 5649)
import { createCipheriv, createDecipheriv, getCiphers } from 'node:crypto';

function wrap(alg: string, key: Buffer, iv: Buffer, data: Buffer): string {
  const c = createCipheriv(alg, key, iv);
  return Buffer.concat([c.update(data), c.final()]).toString('hex');
}

function unwrap(alg: string, key: Buffer, iv: Buffer, data: Buffer): string {
  const d = createDecipheriv(alg, key, iv);
  return Buffer.concat([d.update(data), d.final()]).toString('hex');
}

const kek = Buffer.from('000102030405060708090A0B0C0D0E0F', 'hex');
const keyData = Buffer.from('00112233445566778899AABBCCDDEEFF', 'hex');
const iv = Buffer.from('A6A6A6A6A6A6A6A6', 'hex');
// RFC 3394 4.1
assert(wrap('id-aes128-wrap', kek, iv, keyData) === '1fa68b0a8112b447aef34bd8fb5a7b829d3e862371d2cfe5', 'RFC 3394 vector');
assert(unwrap('aes128-wrap', kek, iv, Buffer.from('1fa68b0a8112b447aef34bd8fb5a7b829d3e862371d2cfe5', 'hex')) === keyData.toString('hex'), 'unwrap');

// RFC 5649 with padding (20-byte key, 7-byte key)
const kek192 = Buffer.from('5840df6e29b02af1ab493b705bf16ea1ae8338f4dcc176a8', 'hex');
const padIv = Buffer.from('A65959A6', 'hex');
assert(wrap('id-aes192-wrap-pad', kek192, padIv, Buffer.from('c37b7e6492584340bed12207808941155068f738', 'hex')) === '138bdeaa9b8fa7fc61f97742e72248ee5ae6ae5360d1ae6a5f54f373fa543b6a', 'RFC 5649 vector');
assert(wrap('id-aes192-wrap-pad', kek192, padIv, Buffer.from('466f7250617369', 'hex')) === 'afbeb0f07dfbf5419200f2ccb50bb24f', 'RFC 5649 single block');
assert(unwrap('id-aes192-wrap-pad', kek192, padIv, Buffer.from('afbeb0f07dfbf5419200f2ccb50bb24f', 'hex')) === '466f7250617369', 'unwrap with padding');

const kek256 = Buffer.alloc(32, 7);
const secret = Buffer.alloc(32, 9);
const wrapped = Buffer.from(wrap('aes256-wrap', kek256, iv, secret), 'hex');
assert(wrapped.length === 40 && unwrap('aes256-wrap', kek256, iv, wrapped) === secret.toString('hex'), 'aes256 round trip');

let message = '';
try {
  unwrap('aes256-wrap', kek256, iv, Buffer.alloc(40));
} catch (e: any) {
  message = e.message;
}
assert(message === 'Trying to add data in unsupported state', `a bad wrap fails: ${message}`);
assert(getCiphers().includes('id-aes128-wrap-pad'), 'listed by getCiphers');
console.log('key wrap ok');
