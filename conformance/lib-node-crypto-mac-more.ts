// createMac: GMAC, Poly1305, SipHash, BLAKE2b / BLAKE2s MACs (values from Node 26.13)
import * as crypto from 'node:crypto';

const k32 = Buffer.alloc(32, 1);
const k16 = Buffer.alloc(16, 2);
const mac = (alg: string, key: Buffer, options?: { outputLength?: number; salt?: Buffer; customization?: Buffer; cipher?: string; iv?: Buffer }) =>
  crypto.createMac(alg, key, options).update('abc').final('hex');

const gmac = mac('gmac', k16, { cipher: 'aes-128-gcm', iv: Buffer.alloc(12) });
console.log('gmac', gmac);
assert(gmac === '21d2cf0ff934322a99d9a7c430ec4c0f', 'gmac');
assert(mac('poly1305', k32) === '57822929c8c6c527c8c6c527c8c6c527', 'poly1305');
const polyKey = Buffer.alloc(32);
for (let i = 0; i < 32; i++) polyKey[i] = i * 7 + 1;
const polyLong = crypto.createMac('poly1305', polyKey).update('z'.repeat(60)).update('z'.repeat(40)).final('hex');
assert(polyLong === '7f48cbc0f0008979384d791554faaf0f', 'poly1305 over several blocks');
assert(mac('siphash', k16) === '7635e796a5fc9af88cef687f21c43382', 'siphash-2-4, 128-bit output');
assert(mac('siphash', k16, { outputLength: 8 }) === '4bacd00c7871795f', 'siphash-2-4, 64-bit output');
assert(
  mac('blake2bmac', k32) ===
    '71bbf29813e1499323acf7b1899a911b2d429459139ee4b15468b45a9b5702d19dc05da86a7e2a587abdb17e0eb7738188f023e45ca18c9ea11f2b741108e6f9',
  'blake2bmac'
);
assert(mac('blake2bmac', k32, { outputLength: 32 }) === '8cc77af752046919e25cca7b87a17aaa67fb6aad75964f730a1c2178c986505c', 'blake2bmac outputLength');
assert(
  mac('blake2bmac', k32, { salt: Buffer.alloc(16, 5), customization: Buffer.alloc(16, 6) }) ===
    '2823862fa94ace47198e6a8d8a06a26aeb90ea17c1767a5fb678f212d4ba0074087271af7950872222e2d69fcef5a6a5c92193513af8bc16aed30ee7fbc7d829',
  'blake2bmac salt + personalization'
);
assert(mac('blake2smac', k32) === 'cc2b80f11299bdf9f7d3c77a4e696c87c15818e635d5d2ee083e9a36409365cc', 'blake2smac');
assert(
  mac('blake2smac', k16, { outputLength: 16, salt: Buffer.alloc(8, 5), customization: Buffer.alloc(8, 6) }) === '959d2ddacf1b7bf77e238c17f981a547',
  'blake2smac options'
);
const b2bLong = crypto.createMac('blake2bmac', k32).update('x'.repeat(300)).final('hex');
assert(
  b2bLong === '8cf3f9a73b579684bdce28f03fff9809a90f4b51053ff2ab64d4b6e2bab34f7ceeb18ec0b74f8314582c2c85e1488e179fdd6b5bd3e36d5d114964f0ecdd7271',
  'blake2bmac over several blocks'
);
assert(
  crypto.createMac('blake2smac', k32).update('y'.repeat(300)).final('hex') === 'a901c172a5dda846bcb489e359a2da808aa62bb8b06396b8cac18c52af660051',
  'blake2smac over several blocks'
);
assert(crypto.createMac('poly1305', k32).final().length === 16, 'final() gives bytes');

const codeOf = (f: () => void): string => {
  try {
    f();
  } catch (e) {
    return (e as NodeJS.ErrnoException).code ?? '';
  }
  return '';
};
assert(codeOf(() => crypto.createMac('gmac', k16, { iv: Buffer.alloc(12) })) === 'ERR_INVALID_ARG_VALUE', 'gmac needs a cipher');
assert(codeOf(() => crypto.createMac('gmac', k16, { cipher: 'aes-128-gcm' })) === 'ERR_INVALID_ARG_VALUE', 'gmac needs an iv');
assert(codeOf(() => crypto.createMac('poly1305', k16)) === 'ERR_OSSL_INVALID_KEY_LENGTH', 'poly1305 takes 32-byte keys');
assert(codeOf(() => crypto.createMac('siphash', k32)) === 'ERR_CRYPTO_OPERATION_FAILED', 'siphash takes 16-byte keys');
assert(codeOf(() => crypto.createMac('blake2bmac', Buffer.alloc(65))) === 'ERR_OSSL_INVALID_KEY_LENGTH', 'blake2b keys are at most 64 bytes');
const macs = crypto.getMacs();
assert(['gmac', 'poly1305', 'siphash', 'blake2bmac', 'blake2smac'].every((m) => macs.includes(m)), 'getMacs');
