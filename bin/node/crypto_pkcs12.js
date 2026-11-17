// PKCS#12 (PFX) bundles, on the vendored software.sslmate.com/src/go-pkcs12.
// Node 26's crypto.parsePKCS12 and node:tls's `pfx` option share this decoder,
// reached through tnPkcs12Decode (crypto_pem): it is linked only into programs
// that call parsePKCS12 or may pass a `pfx` option.
export const CRYPTO_PKCS12_HELPER = `// node:crypto / node:tls: PKCS#12 (PFX)
func init() { tnPkcs12Decode = tnPkcs12DecodeImpl }

func tnPkcs12DecodeImpl(data []byte, password string) (interface{}, *x509.Certificate, []*x509.Certificate, error) {
	key, cert, cas, err := pkcs12.DecodeChain(data, password)
	if err != nil && strings.Contains(err.Error(), "private key missing") {
		// a certificate-only archive: every certificate is one of the CA entries
		if certs, terr := pkcs12.DecodeTrustStore(data, password); terr == nil {
			return nil, nil, certs, nil
		}
	}
	return key, cert, cas, err
}`;
