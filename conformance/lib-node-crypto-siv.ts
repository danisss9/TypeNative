// AES-SIV (RFC 5297) and AES-GCM-SIV (RFC 8452) ciphers (values from the RFCs and Node 26.13)
import * as crypto from 'node:crypto';

const hex = (s: string) => Buffer.from(s, 'hex');
const messageOf = (f: () => void): string => {
  try {
    f();
  } catch (e) {
    return (e as Error).message;
  }
  return '';
};

// RFC 5297 A.1
const sivKey = hex('fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff');
const aad = hex('101112131415161718191a1b1c1d1e1f2021222324252627');
const siv = crypto.createCipheriv('aes-128-siv', sivKey, null);
siv.setAAD(aad);
const sivOut = Buffer.concat([siv.update(hex('112233445566778899aabbccddee')), siv.final()]);
console.log('siv', sivOut.toString('hex'), siv.getAuthTag().toString('hex'));
assert(sivOut.toString('hex') === '40c02b9690c4dc04daef7f6afe5c', 'siv ciphertext');
assert(siv.getAuthTag().toString('hex') === '85632d07c6e8f37f950acd320a2ecc93', 'siv tag (the synthetic IV)');

const dec = crypto.createDecipheriv('aes-128-siv', sivKey, null);
dec.setAuthTag(hex('85632d07c6e8f37f950acd320a2ecc93'));
dec.setAAD(aad);
assert(Buffer.concat([dec.update(sivOut), dec.final()]).toString('hex') === '112233445566778899aabbccddee', 'siv decrypts');

// each setAAD() is its own S2V component
const two = crypto.createCipheriv('aes-128-siv', Buffer.alloc(32, 1), null);
two.setAAD(Buffer.from('a'));
two.setAAD(Buffer.from('b'));
assert(two.update('hello').toString('hex') === '36398005bd', 'two AAD components');
assert(two.getAuthTag().toString('hex') === '4f94a02de25e06db04f7e5cc3b93b232', 'their tag');
const s256 = crypto.createCipheriv('aes-256-siv', Buffer.alloc(64, 9), null);
s256.setAAD(Buffer.alloc(0));
assert(s256.update('abc').toString('hex') === '004718', 'aes-256-siv');
assert(s256.getAuthTag().toString('hex') === '4a5ba3cacefcea8caa52056632177e2d', 'aes-256-siv tag');

const bad = crypto.createDecipheriv('aes-128-siv', sivKey, null);
bad.setAuthTag(Buffer.alloc(16));
assert(bad.update(sivOut).length === 0, 'a bad tag yields no plaintext');
assert(messageOf(() => bad.final()) === 'Unsupported state or unable to authenticate data', 'and fails final()');
const once = crypto.createCipheriv('aes-128-siv', sivKey, null);
once.update('a');
assert(messageOf(() => once.update('b')) === 'Trying to add data in unsupported state', 'siv takes one update()');
let code = '';
try {
  crypto.createCipheriv('aes-128-siv', Buffer.alloc(16), null);
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
}
assert(code === 'ERR_CRYPTO_INVALID_KEYLEN', 'siv keys are two AES keys');

// RFC 8452 C.1, then Node's own values
const empty = crypto.createCipheriv('aes-128-gcm-siv', hex('01000000000000000000000000000000'), hex('030000000000000000000000'));
empty.update(Buffer.alloc(0));
empty.final();
assert(empty.getAuthTag().toString('hex') === 'dc20e2d83f25705bb49e439eca56de25', 'gcm-siv RFC vector');
const gs = crypto.createCipheriv('aes-128-gcm-siv', Buffer.alloc(16, 2), Buffer.alloc(12, 4));
gs.setAAD(Buffer.from('a'));
gs.setAAD(Buffer.from('ad'));
const gsOut = Buffer.concat([gs.update('hello world'), gs.final()]);
console.log('gcm-siv', gsOut.toString('hex'), gs.getAuthTag().toString('hex'));
assert(gsOut.toString('hex') === '991085a15492309cd94798', 'gcm-siv ciphertext');
assert(gs.getAuthTag().toString('hex') === 'e899f090236590d2895579ac126df47d', 'gcm-siv tag (AAD calls concatenate)');
const g192 = crypto.createCipheriv('aes-192-gcm-siv', Buffer.alloc(24, 9), Buffer.alloc(12, 1));
const g192Out = g192.update('abcdefghijklmnopqrstuvwxyz0123456789');
g192.final();
assert(g192Out.toString('hex') === '23c2ee1585d221b7eb35a3316b030db1d4543e6a17f756378728d9b853abc4e4f0c51575', 'aes-192-gcm-siv');
assert(g192.getAuthTag().toString('hex') === '72d7ee871e000a375a456fc1f7c099f1', 'aes-192-gcm-siv tag');
const g256 = crypto.createCipheriv('aes-256-gcm-siv', Buffer.alloc(32, 8), Buffer.alloc(12, 1));
g256.setAAD(Buffer.from('header data here, longer than 16'));
const g256Out = g256.update('abcdefghijklmnopqrstuvwxyz0123456789');
g256.final();
assert(g256Out.toString('hex') === '72e5ae0c5aa8d82ce6bf3f5d567fe1fc489c82289293683529e67c3afd9cb967310f0891', 'aes-256-gcm-siv');
assert(g256.getAuthTag().toString('hex') === 'cecea6be2f102dabc60d805cb7e72cac', 'aes-256-gcm-siv tag');

const gd = crypto.createDecipheriv('aes-128-gcm-siv', Buffer.alloc(16, 2), Buffer.alloc(12, 4));
gd.setAAD(Buffer.from('aad'));
gd.setAuthTag(hex('e899f090236590d2895579ac126df47d'));
assert(Buffer.concat([gd.update(gsOut), gd.final()]).toString() === 'hello world', 'gcm-siv decrypts');
const gbad = crypto.createDecipheriv('aes-128-gcm-siv', Buffer.alloc(16, 2), Buffer.alloc(12, 4));
gbad.setAuthTag(Buffer.alloc(16));
gbad.update(gsOut);
assert(messageOf(() => gbad.final()) === 'Unsupported state or unable to authenticate data', 'a bad gcm-siv tag fails final()');
const ciphers = crypto.getCiphers();
assert(ciphers.includes('aes-256-gcm-siv') && ciphers.includes('aes-128-siv'), 'getCiphers');
