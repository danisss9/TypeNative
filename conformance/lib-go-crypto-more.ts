import * as dsa from 'go:crypto/dsa';
import * as hpke from 'go:crypto/hpke';
import * as mlkem from 'go:crypto/mlkem';
import * as mlkemtest from 'go:crypto/mlkem/mlkemtest';
import * as ecdh from 'go:crypto/ecdh';
import * as rand from 'go:crypto/rand';
import * as sha256 from 'go:crypto/sha256';
import * as bytes from 'go:bytes';

// crypto/dsa (deprecated): generate, sign, verify.
const priv = new dsa.PrivateKey();
dsa.GenerateParameters(priv.Parameters, rand.Reader, dsa.L1024N160);
dsa.GenerateKey(priv, rand.Reader);
const digest = sha256.Sum256(bytes.NewBufferString('dsa').Bytes());
const [r, s] = dsa.Sign(rand.Reader, priv, digest);
assert(dsa.Verify(priv.PublicKey, digest, r, s) === true, 'dsa sign/verify');

// crypto/hpke: single-shot seal / open with DHKEM(X25519).
const kem = hpke.DHKEM(ecdh.X25519());
const recipient = kem.GenerateKey();
const info = bytes.NewBufferString('typenative').Bytes();
const message = bytes.NewBufferString('secret').Bytes();
const sealed = hpke.Seal(recipient.PublicKey(), hpke.HKDFSHA256(), hpke.AES128GCM(), info, message);
const opened = hpke.Open(recipient, hpke.HKDFSHA256(), hpke.AES128GCM(), info, sealed);
assert(bytes.Equal(opened, message) === true, 'hpke Seal/Open');

// crypto/mlkem/mlkemtest: deterministic encapsulation.
const dk = mlkem.GenerateKey768();
const seed = new Uint8Array(32);
const [k1, c1] = mlkemtest.Encapsulate768(dk.EncapsulationKey(), seed);
const [k2, c2] = mlkemtest.Encapsulate768(dk.EncapsulationKey(), seed);
assert(bytes.Equal(k1, k2) === true && bytes.Equal(c1, c2) === true, 'mlkemtest deterministic');
assert(bytes.Equal(dk.Decapsulate(c1), k1) === true, 'mlkemtest decapsulates');
