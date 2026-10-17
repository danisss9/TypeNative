import * as ecdh from 'go:crypto/ecdh';
import * as ecdsa from 'go:crypto/ecdsa';
import * as elliptic from 'go:crypto/elliptic';
import * as mlkem from 'go:crypto/mlkem';
import * as x509 from 'go:crypto/x509';
import * as pkix from 'go:crypto/x509/pkix';
import * as tls from 'go:crypto/tls';
import * as rand from 'go:crypto/rand';
import * as sha256 from 'go:crypto/sha256';
import * as big from 'go:math/big';
import * as time from 'go:time';
import * as bytes from 'go:bytes';

// crypto/ecdh: both sides derive the same X25519 secret.
const alice = ecdh.X25519().GenerateKey(rand.Reader);
const bob = ecdh.X25519().GenerateKey(rand.Reader);
const s1 = alice.ECDH(bob.PublicKey());
const s2 = bob.ECDH(alice.PublicKey());
assert(s1.length === 32 && bytes.Equal(s1, s2) === true, 'ecdh shared secret');

// crypto/elliptic: curve parameters.
assert(elliptic.P256().Params().Name === 'P-256', 'elliptic P256 name');
assert(elliptic.P256().Params().BitSize === 256, 'elliptic P256 bit size');

// crypto/ecdsa: sign and verify a digest.
const key = ecdsa.GenerateKey(elliptic.P256(), rand.Reader);
const digest = sha256.Sum256(bytes.NewBufferString('message').Bytes());
const sig = ecdsa.SignASN1(rand.Reader, key, digest);
assert(ecdsa.VerifyASN1(key.PublicKey, digest, sig) === true, 'ecdsa verify');
const other = sha256.Sum256(bytes.NewBufferString('tampered').Bytes());
assert(ecdsa.VerifyASN1(key.PublicKey, other, sig) === false, 'ecdsa reject');

// crypto/mlkem: encapsulate / decapsulate agree.
const dk = mlkem.GenerateKey768();
const ek = dk.EncapsulationKey();
assert(ek.Bytes().length === mlkem.EncapsulationKeySize768, 'mlkem key size');
const [shared, ciphertext] = ek.Encapsulate();
assert(ciphertext.length === mlkem.CiphertextSize768, 'mlkem ciphertext size');
assert(bytes.Equal(dk.Decapsulate(ciphertext), shared) === true, 'mlkem shared key');

// crypto/x509 + crypto/x509/pkix: self-signed certificate round-trip.
const now = time.Now();
const template = new x509.Certificate({
  SerialNumber: big.NewInt(42),
  Subject: new pkix.Name({ CommonName: 'typenative', Organization: ['TypeNative'] }),
  NotBefore: now,
  NotAfter: now.Add(time.Hour),
  IsCA: true,
  BasicConstraintsValid: true,
  KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature,
  DNSNames: ['localhost']
});
const der = x509.CreateCertificate(rand.Reader, template, template, key.Public(), key);
const cert = x509.ParseCertificate(der);
assert(cert.Subject.CommonName === 'typenative', 'x509 subject CN');
assert(cert.Subject.Organization[0] === 'TypeNative', 'pkix organization');
assert(cert.SerialNumber.Int64() === 42, 'x509 serial');
assert(cert.DNSNames.length === 1 && cert.DNSNames[0] === 'localhost', 'x509 DNSNames');
cert.CheckSignatureFrom(cert);
const pool = x509.NewCertPool();
pool.AddCert(cert);
assert(cert.Subject.String() === 'CN=typenative,O=TypeNative', `pkix Name.String: ${cert.Subject.String()}`);

let x509threw = '';
try {
  x509.ParseCertificate([1, 2, 3]);
} catch (e) {
  x509threw = (e as Error).message;
}
assert(x509threw !== '', 'x509 parse error throws');

// crypto/tls: protocol metadata (a loopback handshake is a later phase).
assert(tls.VersionName(tls.VersionTLS13) === 'TLS 1.3', 'tls.VersionName');
assert(tls.CipherSuiteName(0x1301) === 'TLS_AES_128_GCM_SHA256', 'tls.CipherSuiteName');
assert(tls.CipherSuites().length > 0, 'tls.CipherSuites');
