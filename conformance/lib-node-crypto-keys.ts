import crypto from 'node:crypto';

// The self-signed P-256 certificate of lib-node-tls.ts
const CERT = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBnDCCAUGgAwIBAgIUXEjmf68L//PSvfeG0sKBfa7wXUEwCgYIKoZIzj0EAwIw',
  'FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAxNzE4NTE1N1oYDzIxMjYwOTIz',
  'MTg1MTU3WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO',
  'PQMBBwNCAARY1NDgSaUwBm8T35pc9SFkV0IQfXKCZ1/eTUxCPUHwrLCzmOmGa7+C',
  'sOE1ymxwDSpfKg70OhdGWQm0ceUAqRFqo28wbTAdBgNVHQ4EFgQUc63MuYxj8gxs',
  'qnKjILfVod1e5KwwHwYDVR0jBBgwFoAUc63MuYxj8gxsqnKjILfVod1e5KwwDwYD',
  'VR0TAQH/BAUwAwEB/zAaBgNVHREEEzARgglsb2NhbGhvc3SHBH8AAAEwCgYIKoZI',
  'zj0EAwIDSQAwRgIhAJXDRYy6sItdqipwx+X7oGzomx9NtxetSMjqeN5fd1G4AiEA',
  'y76gM5xPrbYc01vZM8zNJidnsWdUtbQZxXH+u97KOrA=',
  '-----END CERTIFICATE-----'
].join('\n');

// generateKeyPairSync: KeyObjects
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
console.log('rsa', rsa.publicKey.type, rsa.privateKey.type, rsa.publicKey.asymmetricKeyType);
assert(rsa.publicKey.type === 'public' && rsa.privateKey.type === 'private', 'key object types');
const rsaDetails = rsa.publicKey.asymmetricKeyDetails!;
assert(rsaDetails.modulusLength === 1024 && rsaDetails.publicExponent === 65537n, 'rsa details');

const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
assert(ec.privateKey.asymmetricKeyType === 'ec' && ec.publicKey.asymmetricKeyDetails!.namedCurve === 'prime256v1', 'ec details');
const ed = crypto.generateKeyPairSync('ed25519');
const x = crypto.generateKeyPairSync('x25519');
console.log('types', ed.publicKey.asymmetricKeyType, x.privateKey.asymmetricKeyType);
assert(ed.publicKey.asymmetricKeyType === 'ed25519' && x.privateKey.asymmetricKeyType === 'x25519', 'okp types');

// Encoded pairs
const pem = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
assert(pem.publicKey.startsWith('-----BEGIN PUBLIC KEY-----\n') && pem.publicKey.endsWith('-----END PUBLIC KEY-----\n'), 'spki pem');
assert(pem.privateKey.startsWith('-----BEGIN PRIVATE KEY-----'), 'pkcs8 pem');
const der = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'der' }
});
console.log('der lengths', der.publicKey.length, der.privateKey.length);
assert(der.publicKey.length === 44 && der.privateKey.length === 48, 'ed25519 der sizes');

// Import / export round trips
const imported = crypto.createPrivateKey(pem.privateKey);
const derived = crypto.createPublicKey(imported);
assert(derived.export({ type: 'spki', format: 'pem' }) === pem.publicKey, 'public key derived from the private key');
assert(crypto.createPublicKey(pem.publicKey).equals(derived), 'equals');
const pkcs1 = rsa.privateKey.export({ type: 'pkcs1', format: 'pem' });
assert(pkcs1.startsWith('-----BEGIN RSA PRIVATE KEY-----'), 'pkcs1 export');
assert(crypto.createPrivateKey(pkcs1).equals(rsa.privateKey), 'pkcs1 import');
const sec1 = ec.privateKey.export({ type: 'sec1', format: 'der' });
assert(crypto.createPrivateKey({ key: sec1, format: 'der', type: 'sec1' }).equals(ec.privateKey), 'sec1 der import');
const spkiDer = rsa.publicKey.export({ type: 'spki', format: 'der' });
assert(crypto.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' }).equals(rsa.publicKey), 'spki der import');

// JWK
const jwk = ec.publicKey.export({ format: 'jwk' });
console.log('jwk', jwk.kty, jwk.crv, typeof jwk.x);
assert(jwk.kty === 'EC' && jwk.crv === 'P-256' && jwk.x!.length === 43, 'ec jwk');
const fromJwk = crypto.createPublicKey({ key: jwk, format: 'jwk' });
assert(fromJwk.equals(ec.publicKey), 'jwk import');
const edJwk = ed.privateKey.export({ format: 'jwk' });
assert(edJwk.kty === 'OKP' && edJwk.crv === 'Ed25519' && typeof edJwk.d === 'string', 'okp jwk');
assert(crypto.createPrivateKey({ key: edJwk, format: 'jwk' }).equals(ed.privateKey), 'okp jwk import');
const rsaJwk = rsa.privateKey.export({ format: 'jwk' });
assert(crypto.createPrivateKey({ key: rsaJwk, format: 'jwk' }).equals(rsa.privateKey), 'rsa jwk round trip');

// Secret keys
const secret = crypto.createSecretKey(Buffer.from('abc'));
console.log('secret', secret.type, secret.symmetricKeySize, secret.asymmetricKeyType);
assert(secret.symmetricKeySize === 3 && secret.asymmetricKeyType === undefined, 'secret key');
assert(secret.export().toString() === 'abc', 'secret export');
assert(secret.export({ format: 'jwk' }).k === 'YWJj', 'secret jwk');
assert(crypto.createSecretKey('616263', 'hex').equals(secret), 'secret from hex');
const hmacKey = crypto.generateKeySync('hmac', { length: 128 });
assert(hmacKey.symmetricKeySize === 16, 'generateKeySync');
try {
  crypto.createPrivateKey('not a key');
  assert(false, 'invalid keys throw');
} catch (err) {
  assert((err as NodeJS.ErrnoException).code === 'ERR_OSSL_UNSUPPORTED', 'unsupported key code');
}

// X509Certificate
const cert = new crypto.X509Certificate(CERT);
console.log('subject', cert.subject, '|', cert.subjectAltName);
assert(cert.subject === 'CN=localhost' && cert.issuer === 'CN=localhost', 'subject / issuer');
assert(cert.subjectAltName === 'DNS:localhost, IP Address:127.0.0.1', 'subjectAltName');
assert(cert.validFrom === 'Oct 17 18:51:57 2026 GMT' && cert.validTo === 'Sep 23 18:51:57 2126 GMT', 'validity');
assert(cert.fingerprint === '3E:70:34:35:0C:50:73:42:04:51:0F:3D:0E:4C:90:D7:7C:B7:A8:FB', 'fingerprint');
assert(cert.serialNumber === '5C48E67FAF0BFFF3D2BDF786D2C2817DAEF05D41', 'serialNumber');
assert(cert.ca, 'ca');
assert(cert.checkHost('localhost') === 'localhost' && cert.checkHost('example.com') === undefined, 'checkHost');
assert(cert.checkIP('127.0.0.1') === '127.0.0.1' && cert.checkIP('10.0.0.1') === undefined, 'checkIP');
assert(cert.publicKey.asymmetricKeyType === 'ec', 'certificate public key');
assert(cert.verify(cert.publicKey) && cert.checkIssued(cert), 'self-signed');
assert(!cert.verify(ec.publicKey), 'verify with another key');
assert(cert.toString().startsWith('-----BEGIN CERTIFICATE-----'), 'toString');
assert(cert.validFromDate.getUTCFullYear() === 2026, 'validFromDate');
let asyncDone = false;
crypto.generateKeyPair('ec', { namedCurve: 'P-384' }, (err, publicKey, privateKey) => {
  assert(err === null && publicKey.asymmetricKeyDetails!.namedCurve === 'secp384r1' && privateKey.type === 'private', 'generateKeyPair callback');
  asyncDone = true;
  console.log('generateKeyPair callback');
});
process.on('exit', () => assert(asyncDone, 'callback ran'));
