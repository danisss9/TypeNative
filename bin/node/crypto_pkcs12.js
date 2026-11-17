// PKCS#12 (PFX) bundles, on the vendored software.sslmate.com/src/go-pkcs12.
// Node 26's crypto.parsePKCS12 and node:tls's `pfx` option share this decoder.
export const CRYPTO_PKCS12_HELPER = `// node:crypto / node:tls: PKCS#12 (PFX)
func tnPkcs12Decode(data []byte, password string) (interface{}, *x509.Certificate, []*x509.Certificate, error) {
	key, cert, cas, err := pkcs12.DecodeChain(data, password)
	if err != nil && strings.Contains(err.Error(), "private key missing") {
		// a certificate-only archive: every certificate is one of the CA entries
		if certs, terr := pkcs12.DecodeTrustStore(data, password); terr == nil {
			return nil, nil, certs, nil
		}
	}
	return key, cert, cas, err
}

// The PEM a PFX's key and certificate chain make, for crypto/tls
func tnPkcs12KeyPair(data []byte, password string) ([]byte, []byte, error) {
	key, cert, cas, err := tnPkcs12Decode(data, password)
	if err != nil {
		return nil, nil, err
	}
	if key == nil || cert == nil {
		return nil, nil, errors.New("pkcs12: no private key")
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return nil, nil, err
	}
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: cert.Raw})
	for _, ca := range cas {
		certPEM = append(certPEM, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: ca.Raw})...)
	}
	return der, certPEM, nil
}`;
