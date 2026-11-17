// node:tls: PFX bundles, passphrase-protected keys, session tickets
// ('newSession' / 'resumeSession', getSession / isSessionReused), and the
// embedded rootCertificates bundle.
import * as tls from 'node:tls';

const PFX = Buffer.from("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", 'base64');
const CA = "-----BEGIN CERTIFICATE-----\nMIIDETCCAfmgAwIBAgIBATANBgkqhkiG9w0BAQsFADAqMRMwEQYDVQQKEwpUeXBl\nTmF0aXZlMRMwEQYDVQQDEwpUTiBUZXN0IENBMB4XDTIwMDEwMTAwMDAwMFoXDTQw\nMDEwMTAwMDAwMFowKjETMBEGA1UEChMKVHlwZU5hdGl2ZTETMBEGA1UEAxMKVE4g\nVGVzdCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOMlVs3HKxp0\ndFa/XSkG3bAsvy041IVYbuToD439r8JxeXhPGQq/jeVhWKi5TIBTm81PE+juaxDE\nQKfO78+5gVf6jrI6YwMJ5FkvhJOpHCTXTX37pGbUA5/b+hcXrzXqzjzVTP5HWJiW\njoBzJACAX9CK/sdBlMRm5DCHyTb+LzOT62Y78g5h1Nod6eKjEVmAqJXyuBaW+t/W\n0NTGAMK9XCmT8ZMV1Qiiim6y05zK0ET0uEDze0t3MAFTucjXbtZyV0v2yTm2+KcO\nXArlwsJmxkhMqbwhDSVe/vCFzVfT/zPFxp8t4Rok3UVgq5GOXywezxXHHbxAvAKp\n+wV8UpM+UTECAwEAAaNCMEAwDgYDVR0PAQH/BAQDAgKEMA8GA1UdEwEB/wQFMAMB\nAf8wHQYDVR0OBBYEFNF2qYCyVUrJwi3+RVXUoTWYP5fPMA0GCSqGSIb3DQEBCwUA\nA4IBAQAVabtRRV39pt32YypXK6LNaPDYiLAkiOpz7VVmOgoZiGsJibyErRki+dF8\naJbg/KthrU4FA526Pe9qK0kC7HkU5KArs0/ygDStLiXHXXMg6QDFa0dsxTjYr0aY\nflKirHyRSqrnJuKeIwuYB7YN/qQ+0lRE3tLfhb8Tp+pV8WVt09y7BuQ3E3fjGTDe\nN88UhV9jhJ4dbC3RV8+WM3yf6aB7qoMPg6kbyJFRGHLZhMuAwdfvj88m+eG0KI2o\ngLwi8SyILeHh3CaSB0o35o4zSuLu25c6SAlK1NJD5Tp6nnSG71ifw4m28f4fx+iN\nhlqsAePHF5N8meFP4E07VKGu1qLx\n-----END CERTIFICATE-----\n";
const LEAF = "-----BEGIN CERTIFICATE-----\nMIIDLDCCAhSgAwIBAgIBAjANBgkqhkiG9w0BAQsFADAqMRMwEQYDVQQKEwpUeXBl\nTmF0aXZlMRMwEQYDVQQDEwpUTiBUZXN0IENBMB4XDTIwMDEwMTAwMDAwMFoXDTQw\nMDEwMTAwMDAwMFowKTETMBEGA1UEChMKVHlwZU5hdGl2ZTESMBAGA1UEAxMJbG9j\nYWxob3N0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1K0Jg9IqGhuR\nYtAv3gssyXB8zaDW+NDkEJMb0RK21ClnkRdQjc5mecwqg65hFxvbEkZF8lc+IXev\nzkXPasPMo092cf0A1cecg8BbT4tvWf3SKmBGqeLX6AOtz3B5UqJ4IWqoDyvkSZID\nQDXUtdcQZQ4ypJbPmiTIxC3mq9kP/bvJY6hJRM+x0lop9azzmr7MGjHLvPc/Kwcv\nOz38Apvvo8BFgOTz0H+alF0zNntnPCd3bCPLi64Uez2fz5SuQaid5pdfRQdCiOSw\nuixSiIvlbpkyOG5GUpZ+IODvrWgNv2B9lJhoAQztQFz/sgkAOO5R58OVXr7DdRi/\nwT5qUm366QIDAQABo14wXDAOBgNVHQ8BAf8EBAMCBaAwEwYDVR0lBAwwCgYIKwYB\nBQUHAwEwHwYDVR0jBBgwFoAU0XapgLJVSsnCLf5FVdShNZg/l88wFAYDVR0RBA0w\nC4IJbG9jYWxob3N0MA0GCSqGSIb3DQEBCwUAA4IBAQCYpEp4iXqh1BsSvZLI6n5U\ntz5/3yKcPOdQ0WZqZ4hL+iCyPV6hhHpk7qave9B/2eMWXlDNoCe/UNzvqjCSqTwx\ntLPRE8hvylPSynFwaqrrF7Y6dmY0/RX32B1xLlY9/WteeagCxQ7KYze6fkNFu8ps\nTZcyQPqA63+zdNl1DiuWGpHwwAF9PuoBndVcskm7Fh1S8MwrcZ3G5gXbZiw7kX2F\njBAMGm4qst8+dn+E1199/oMxuBvy/DXAayHXDArRTvY7pamzttWkxo9Ydm6epaTz\nr9VTNZQwBqtNn8ImCps4vOEAG7VCFdbFJY6PmQ+6O7bQyf62ldpJQMmaFnI0OUHA\n-----END CERTIFICATE-----\n";
const ENC = "-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIFJTBfBgkqhkiG9w0BBQ0wUjAxBgkqhkiG9w0BBQwwJAQQKCsOADgR194GxmdP\nyANbZwICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEOiBTRkGurl60OeS\nYhkuNJIEggTAR3EUHltoar4+532wpBsJSE4/wdNjpayRiyIww33IGbrfPwvxXDG7\nAZIXipxcVq3J5Qgz/USlBrLLzwcceaZI427/YswuRAE8LHT8KA08LSQlH9Afy+rY\n3lDRKs9iGUYQ2Sb8cxP/3RjMDox5cl0qLPLMW/0tDCpD8OtzWq2FgnhWhq/9KBc+\n8BFlfQR3V+X/LsPsDls/nqG6f7k0Hjn6nIEQmeWi9bCPQEuJZmOS6v3nIetBWzRs\n6OjOV6BtUe3OGNcBQiRxEjRHZjDk1UlJbe+BTitODmW+CYZWyIFge9VIKCHbIQ43\n35J1Ie4NUDlK0TwSH91yNXnfPiJzD7r/5Fswla+lW+2mPSxYVTrDe+L6frXxmECZ\nh09xU4a8pTQr/DutmGq/J0taZb44F4s1hyGfM70BpHnnUG8VOf07txCICqq7j5Uz\nK7VnbgHTnpZJps+NNripkKYOIb6Os8I7YLT32hOF3ll0QaKruhGXAlnDLWPF5ND6\n0iBBacvk5xRcDNi5fdRhxd/H4JeAzfB/yXGLTNHgw5br8fur69aL0tg7NKC+IHMx\nJAivPaHR1CRclbYINY7YOL+qOoOMTR7hT5VKl/8mic/QR9/O5m3N41sz6TQe1+PK\n0rpGEn/ef7TgOXT5xyCksu4EKJfhaC+N/7W7dA2IZE5DzH29Vblz6veD1PEvzXRz\noVB/ucM9R5xbYK14+owN9WP0TNL1gAdmBLqIGI07HTOyD9xoIeL3faWG1EBkDDcs\nUgF6XrAhcs+AWlJgvJhvA0k4Eh7/JxRWkfYDH6gML4/8KyjJUIyRAzyekxkCthDt\nDMw2TVDHub2NL4RI8oo+G2K+5WrTRAZI7bR+k5+hOahERQsu6gCehHJYkOO12du2\nibc18hFqnGq+HLnbQ1TIMnby0ALJL/KH+E9P1jnwf5hp2xJU5AUxunzGOm9aQScu\ngv8qTDSKulA8ohfTBL3FfggLD4MFkdFPhYTHPFl5/8sIUWh12wZxICW1UNPb+R0g\nBCAy+6AGS534fqAg9o0O3byTDVDhupOXwsAnnWp/c6g1taGEP+ZpitHEM+DwpV/z\n1g6bmQXoyYwvbH2YY+9ho7q6zqcgQrMG1L6iPqPl+mRZwkXm+VTpsjeaMNToU3ij\n4RLGy8HSpu+Jujn/6uxQmQxe053GOve0iAW7DP+XEBhJY31z2+3E3iHy7av4Uwhp\nOZSWJshbBPwOZclGC64p6S3SN352P7P5MaNQ0DLMkc1fcPb2KFb+vN2vmqo+U0Jl\nn4fIDW0450IIhb0v0jCf+mFw/Deg2m4E++nesqyHmtAhjh2h8vrVSTvnHKtS06DV\nLJXitTaTuvqBHD8Uber6yQxxYVyDJTi30ysVt0Gy7WY3cL+D4D6Jwk5ZfPsyGjiU\nBGyJ3kj0K3PeE/1BeFwo7Iuv1b/lmToxi8dR2fyQpVaq1HDIb1Dxy8207KK5bqA9\ndJc+K26kGuaxz7lXS7ZaQrxeGPIFGQCCWwNJU6MT7r36uHnceZGpoBxnoRP+Qb+c\nzSyhfscSuS7BV+0dEUo4NrcIAixeG1BLxJUfffBW2YNBXMQPW3rsu9oyZVagV9Ef\noNZjc8ZnBxAuMnyZ9CaRzwtkQMQxQLgHfw==\n-----END ENCRYPTED PRIVATE KEY-----\n";

const codeOf = (fn: () => void): string => {
  try {
    fn();
  } catch (e) {
    return (e as NodeJS.ErrnoException).code ?? '';
  }
  return '';
};

// Mozilla's bundle, as Node embeds it
assert(tls.rootCertificates.length === 118, 'rootCertificates length');
assert(tls.rootCertificates.every((c) => c.startsWith('-----BEGIN CERTIFICATE-----') && c.includes('END CERTIFICATE-----')), 'PEMs');
assert(tls.rootCertificates.includes(CA) === false, 'our test CA is not a root');

// a PFX bundle and a passphrase-protected PEM key, through createSecureContext
assert(tls.createSecureContext({ pfx: PFX, passphrase: 'pfxpass' }) !== undefined, 'createSecureContext pfx');
assert(tls.createSecureContext({ key: ENC, cert: LEAF, passphrase: 'secret' }) !== undefined, 'createSecureContext passphrase');
assert(codeOf(() => tls.createSecureContext({ pfx: PFX, passphrase: 'wrong' })) === 'ERR_OSSL_PKCS12_MAC_VERIFY_FAILURE', 'a wrong PFX passphrase');
assert(codeOf(() => tls.createServer({ key: ENC, cert: LEAF })) === 'ERR_OSSL_CRYPTO_INTERRUPTED_OR_CANCELLED', 'an encrypted key needs its passphrase');

let stage = 0;
let newSessions = 0;
let resumed = 0;
let sawSession = false;
const server = tls.createServer({ pfx: [{ buf: PFX, passphrase: 'pfxpass' }] }, (socket) => {
  assert(socket.authorized === false && socket.encrypted, 'a server socket');
  assert(socket.getCertificate()!.subject.CN === 'localhost', 'the local certificate');
  socket.on('data', (data) => {
    socket.write('pong:' + data);
    if (stage === 2) socket.end();
  });
});
server.on('newSession', (id, data, cb) => {
  newSessions++;
  assert(id.length === 32 && data.length > 0, 'ticket data');
  cb();
});
server.on('resumeSession', (id, cb) => {
  resumed++;
  assert(id.length === 32, 'resumed id');
  cb(null, undefined);
});
server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as { port: number }).port;
  const first = tls.connect({ port, host: '127.0.0.1', ca: CA, servername: 'localhost' }, () => {
    assert(first.authorized && !first.isSessionReused(), 'the first handshake');
    stage = 1;
    let session: Buffer | undefined;
    first.on('session', (s) => {
      sawSession = true;
      session = s as Buffer;
    });
    first.write('ping');
    first.once('data', () => {
      setTimeout(() => {
        const ticket = session ?? first.getSession();
        assert(ticket !== undefined && ticket!.length > 0, 'getSession');
        stage = 2;
        const second = tls.connect({ port, host: '127.0.0.1', ca: CA, servername: 'localhost', session: ticket }, () => {
          assert(second.authorized && second.isSessionReused(), 'the resumed handshake');
          second.write('again');
          second.once('data', () => {
            setTimeout(() => {
              assert(sawSession, "the 'session' event");
              assert(newSessions > 0 && resumed === 1, "'newSession' / 'resumeSession'");
              second.end();
              first.end();
              server.close();
              console.log('tls pfx / sessions / roots');
            }, 20);
          });
        });
      }, 50);
    });
  });
});
