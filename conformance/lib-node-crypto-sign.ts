import crypto from 'node:crypto';

const data = Buffer.from('message to sign');
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const ed = crypto.generateKeyPairSync('ed25519');

// crypto.sign / crypto.verify
const rsaSig = crypto.sign('sha256', data, rsa.privateKey);
console.log('rsa signature bytes', rsaSig.length);
assert(rsaSig.length === 128 && crypto.verify('sha256', data, rsa.publicKey, rsaSig), 'RSA PKCS#1 v1.5');
assert(!crypto.verify('sha256', Buffer.from('tampered'), rsa.publicKey, rsaSig), 'RSA rejects other data');
// RSA signatures are deterministic: same input, same signature
assert(crypto.sign('sha256', data, rsa.privateKey).equals(rsaSig), 'deterministic PKCS#1 v1.5');
const pss = crypto.sign('sha256', data, { key: rsa.privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 });
assert(crypto.verify('sha256', data, { key: rsa.publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, pss), 'RSA-PSS');
assert(!crypto.verify('sha256', data, rsa.publicKey, pss), 'PSS signature is not PKCS#1 v1.5');
const ecSig = crypto.sign('sha256', data, ec.privateKey);
assert(crypto.verify('sha256', data, ec.publicKey, ecSig), 'ECDSA (DER)');
const p1363 = crypto.sign('sha256', data, { key: ec.privateKey, dsaEncoding: 'ieee-p1363' });
assert(p1363.length === 64 && crypto.verify('sha256', data, { key: ec.publicKey, dsaEncoding: 'ieee-p1363' }, p1363), 'ECDSA (IEEE P1363)');
const edSig = crypto.sign(null, data, ed.privateKey);
assert(edSig.length === 64 && crypto.verify(null, data, ed.publicKey, edSig), 'Ed25519');
// Keys as PEM strings; a private key verifies too
const pemKey = rsa.privateKey.export({ type: 'pkcs8', format: 'pem' });
assert(crypto.verify('sha256', data, pemKey, crypto.sign('sha256', data, pemKey)), 'PEM keys');

// createSign / createVerify
const signer = crypto.createSign('RSA-SHA256');
signer.update('message ');
signer.update('to sign');
const hexSig = signer.sign(rsa.privateKey, 'hex');
assert(hexSig === rsaSig.toString('hex'), 'createSign matches sign()');
const verifier = crypto.createVerify('sha256');
verifier.update(data);
assert(verifier.verify(rsa.publicKey, hexSig, 'hex'), 'createVerify');

// RSA encryption
const secret = Buffer.from('top secret');
const encrypted = crypto.publicEncrypt(rsa.publicKey, secret);
assert(encrypted.length === 128 && crypto.privateDecrypt(rsa.privateKey, encrypted).equals(secret), 'OAEP round trip');
const oaep256 = crypto.publicEncrypt({ key: rsa.publicKey, oaepHash: 'sha256' }, secret);
assert(crypto.privateDecrypt({ key: rsa.privateKey, oaepHash: 'sha256' }, oaep256).equals(secret), 'OAEP with SHA-256');
const signedRaw = crypto.privateEncrypt(rsa.privateKey, secret);
assert(crypto.publicDecrypt(rsa.publicKey, signedRaw).equals(secret), 'privateEncrypt / publicDecrypt');
try {
  crypto.privateDecrypt(rsa.privateKey, Buffer.alloc(128, 1));
  assert(false, 'garbage does not decrypt');
} catch (err) {
  console.log('decrypt error code', (err as NodeJS.ErrnoException).code !== undefined);
}

// ECDH
const alice = crypto.createECDH('prime256v1');
const bob = crypto.createECDH('prime256v1');
const alicePublic = alice.generateKeys();
const bobPublic = bob.generateKeys('hex', 'compressed');
assert(alicePublic.length === 65 && bobPublic.length === 66, 'uncompressed / compressed public keys');
const s1 = alice.computeSecret(bobPublic, 'hex', 'hex');
const s2 = bob.computeSecret(alicePublic).toString('hex');
console.log('ecdh secrets match', s1 === s2, s1.length);
assert(s1 === s2 && s1.length === 64, 'ECDH shared secret');
const carol = crypto.createECDH('secp384r1');
carol.setPrivateKey(alice.getPrivateKey().subarray(0, 32).toString('hex') + '00'.repeat(16), 'hex');
assert(carol.getPublicKey().length === 97, 'setPrivateKey');
assert(crypto.getCurves().includes('prime256v1'), 'getCurves');

// diffieHellman with KeyObjects (x25519 and ec)
const xa = crypto.generateKeyPairSync('x25519');
const xb = crypto.generateKeyPairSync('x25519');
const k1 = crypto.diffieHellman({ privateKey: xa.privateKey, publicKey: xb.publicKey });
const k2 = crypto.diffieHellman({ privateKey: xb.privateKey, publicKey: xa.publicKey });
assert(k1.length === 32 && k1.equals(k2), 'x25519 diffieHellman');
const ea = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
assert(crypto.diffieHellman({ privateKey: ea.privateKey, publicKey: ec.publicKey }).equals(crypto.diffieHellman({ privateKey: ec.privateKey, publicKey: ea.publicKey })), 'ec diffieHellman');

// Classic Diffie-Hellman (MODP group)
const g1 = crypto.getDiffieHellman('modp14');
const g2 = crypto.getDiffieHellman('modp14');
g1.generateKeys();
g2.generateKeys();
const d1 = g1.computeSecret(g2.getPublicKey());
const d2 = g2.computeSecret(g1.getPublicKey());
assert(d1.length === 256 && d1.equals(d2), 'modp14 shared secret');
assert(g1.getGenerator('hex') === '02' && g1.getPrime().length === 256, 'group parameters');
const custom = crypto.createDiffieHellman(g1.getPrime(), 2);
custom.generateKeys();
assert(custom.computeSecret(g1.getPublicKey()).equals(g1.computeSecret(custom.getPublicKey())), 'createDiffieHellman(prime, generator)');

// Primes
const prime = crypto.generatePrimeSync(64, { bigint: true });
console.log('prime bits', prime.toString(2).length);
assert(prime.toString(2).length === 64 && crypto.checkPrimeSync(prime), 'generatePrimeSync bigint');
const primeBytes = crypto.generatePrimeSync(32);
assert(primeBytes.byteLength === 4 && crypto.checkPrimeSync(Buffer.from(primeBytes)), 'generatePrimeSync ArrayBuffer');
assert(!crypto.checkPrimeSync(91n) && crypto.checkPrimeSync(97n), 'checkPrimeSync');
crypto.checkPrime(7919n, (err, result) => {
  assert(!err && result, 'checkPrime callback');
  console.log('checkPrime callback', result);
});
