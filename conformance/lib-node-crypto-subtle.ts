import { webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Buffer.from(b).toString('hex');

async function main(): Promise<void> {
  // digest
  const digest = await crypto.subtle.digest('SHA-256', enc.encode('abc'));
  console.log('digest', hex(digest));
  assert(hex(digest) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 digest');

  // HMAC: generate, sign, verify, export
  const hmacKey = await subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
  console.log('hmac key', hmacKey.type, hmacKey.algorithm.name, hmacKey.algorithm.length, hmacKey.usages.join(','));
  assert(hmacKey.type === 'secret' && hmacKey.algorithm.length === 512, 'HMAC key');
  const mac = await subtle.sign('HMAC', hmacKey, enc.encode('data'));
  assert(mac.byteLength === 32 && (await subtle.verify('HMAC', hmacKey, mac, enc.encode('data'))), 'HMAC sign / verify');
  assert(!(await subtle.verify('HMAC', hmacKey, mac, enc.encode('other'))), 'HMAC rejects other data');
  const rawHmac = await subtle.exportKey('raw', hmacKey);
  assert(rawHmac.byteLength === 64, 'raw export');

  // Known HMAC vector through importKey
  const imported = await subtle.importKey('raw', enc.encode('key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const vector = await subtle.sign('HMAC', imported, enc.encode('The quick brown fox jumps over the lazy dog'));
  assert(hex(vector) === 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8', 'HMAC test vector');
  try {
    await subtle.exportKey('raw', imported);
    assert(false, 'non-extractable keys do not export');
  } catch (err) {
    console.log('export error', (err as Error).name);
  }

  // AES-GCM / AES-CBC / AES-CTR
  const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const sealed = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('aad') }, aes, enc.encode('hello gcm'));
  assert(sealed.byteLength === 9 + 16, 'GCM appends a 16-byte tag');
  const opened = await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('aad') }, aes, sealed);
  assert(Buffer.from(opened).toString() === 'hello gcm', 'AES-GCM round trip');
  try {
    await subtle.decrypt({ name: 'AES-GCM', iv }, aes, sealed);
    assert(false, 'wrong AAD fails');
  } catch (err) {
    console.log('gcm error', (err as Error).name);
  }
  const cbcKey = await subtle.importKey('raw', new Uint8Array(16), 'AES-CBC', true, ['encrypt', 'decrypt']);
  const cbc = await subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, cbcKey, enc.encode('sixteen byte msg'));
  assert(hex(cbc) === '8020a34efb4bfaad65c4baf2bc8fcef93cbe800fda94d213718ac5dee8bf1560', 'AES-CBC with a zero key and IV');
  assert(Buffer.from(await subtle.decrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, cbcKey, cbc)).toString() === 'sixteen byte msg', 'AES-CBC decrypt');
  const ctrKey = await subtle.generateKey({ name: 'AES-CTR', length: 128 }, false, ['encrypt', 'decrypt']);
  const counter = new Uint8Array(16);
  const ctr = await subtle.encrypt({ name: 'AES-CTR', counter, length: 64 }, ctrKey, enc.encode('stream'));
  assert(Buffer.from(await subtle.decrypt({ name: 'AES-CTR', counter, length: 64 }, ctrKey, ctr)).toString() === 'stream', 'AES-CTR');

  // ECDSA / Ed25519 / RSA signatures
  const ecdsa = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const ecSig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, ecdsa.privateKey, enc.encode('ec'));
  assert(ecSig.byteLength === 64, 'ECDSA signatures are r || s');
  assert(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, ecdsa.publicKey, ecSig, enc.encode('ec')), 'ECDSA verify');
  const ed = await subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const edSig = await subtle.sign('Ed25519', ed.privateKey, enc.encode('ed'));
  assert(await subtle.verify('Ed25519', ed.publicKey, edSig, enc.encode('ed')), 'Ed25519');
  const rsa = await subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 1024, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const rsaSig = await subtle.sign('RSASSA-PKCS1-v1_5', rsa.privateKey, enc.encode('rsa'));
  assert(await subtle.verify('RSASSA-PKCS1-v1_5', rsa.publicKey, rsaSig, enc.encode('rsa')), 'RSASSA-PKCS1-v1_5');
  console.log('key pair usages', rsa.publicKey.usages.join(','), '/', rsa.privateKey.usages.join(','));

  // spki / pkcs8 / jwk round trips
  const spki = await subtle.exportKey('spki', ecdsa.publicKey);
  const reimported = await subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
  assert(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, reimported, ecSig, enc.encode('ec')), 'spki import');
  const jwk = await subtle.exportKey('jwk', ecdsa.privateKey);
  console.log('jwk', jwk.kty, jwk.crv, jwk.ext);
  assert(jwk.kty === 'EC' && typeof jwk.d === 'string', 'private jwk');
  const fromJwk = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  assert(fromJwk.type === 'private', 'jwk import');
  const pkcs8 = await subtle.exportKey('pkcs8', ed.privateKey);
  assert(pkcs8.byteLength === 48, 'Ed25519 pkcs8');

  // RSA-OAEP
  const oaep = await subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 1024, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    false,
    ['encrypt', 'decrypt']
  );
  const ciphertext = await subtle.encrypt({ name: 'RSA-OAEP' }, oaep.publicKey, enc.encode('oaep'));
  assert(Buffer.from(await subtle.decrypt({ name: 'RSA-OAEP' }, oaep.privateKey, ciphertext)).toString() === 'oaep', 'RSA-OAEP');

  // PBKDF2 / HKDF / ECDH / X25519 derivation
  const password = await subtle.importKey('raw', enc.encode('password'), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
  const pbkdf2 = await subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('salt'), iterations: 1, hash: 'SHA-1' }, password, 160);
  assert(hex(pbkdf2) === '0c60c80f961f0e71f3a9b524af6012062fe037a6', 'PBKDF2 RFC 6070 vector');
  const derivedAes = await subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('salt'), iterations: 1000, hash: 'SHA-256' },
    password,
    { name: 'AES-GCM', length: 128 },
    true,
    ['encrypt']
  );
  assert(derivedAes.algorithm.length === 128 && (await subtle.exportKey('raw', derivedAes)).byteLength === 16, 'deriveKey');
  const ikm = await subtle.importKey('raw', enc.encode('input key'), 'HKDF', false, ['deriveBits']);
  const hkdf = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('salt'), info: enc.encode('info') }, ikm, 256);
  assert(hkdf.byteLength === 32, 'HKDF');
  const a = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const b = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const ab = await subtle.deriveBits({ name: 'ECDH', public: b.publicKey }, a.privateKey, 256);
  const ba = await subtle.deriveBits({ name: 'ECDH', public: a.publicKey }, b.privateKey, 256);
  assert(hex(ab) === hex(ba), 'ECDH deriveBits');
  const xa = await subtle.generateKey('X25519', false, ['deriveBits']);
  const xb = await subtle.generateKey('X25519', false, ['deriveBits']);
  assert(hex(await subtle.deriveBits({ name: 'X25519', public: xb.publicKey }, xa.privateKey, 256)) === hex(await subtle.deriveBits({ name: 'X25519', public: xa.publicKey }, xb.privateKey, 256)), 'X25519');

  // wrapKey / unwrapKey
  const wrapped = await subtle.wrapKey('raw', hmacKey, aes, { name: 'AES-GCM', iv });
  const unwrapped = await subtle.unwrapKey('raw', wrapped, aes, { name: 'AES-GCM', iv }, { name: 'HMAC', hash: 'SHA-256' }, true, ['sign']);
  assert(hex(await subtle.exportKey('raw', unwrapped)) === hex(rawHmac), 'wrap / unwrap');
  console.log('done');
}

main();
