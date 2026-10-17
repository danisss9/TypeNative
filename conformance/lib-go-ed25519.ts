import * as ed25519 from 'go:crypto/ed25519';
import * as rand from 'go:crypto/rand';

const generated = ed25519.GenerateKey(rand.Reader);
assert(generated.length === 2, 'GenerateKey tuple');

const message = [104, 105];
const sig = ed25519.Sign(generated[1], message);
assert(ed25519.Verify(generated[0], message, sig) === true, 'Sign/Verify');
