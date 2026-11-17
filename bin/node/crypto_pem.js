// Encrypted private keys: PKCS#8 PBES2 (PBKDF2 + AES-CBC, RFC 8018) and the
// legacy PEM DEK-Info headers (EVP_BytesToKey with MD5). Used by node:crypto's
// createPrivateKey / export and by node:tls's passphrase option.
export const CRYPTO_PEM_HELPER = `// node:crypto / node:tls: encrypted private keys
var (
	tnOIDPBES2     = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 5, 13}
	tnOIDPBKDF2    = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 5, 12}
	tnOIDHMACSHA1  = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 7}
	tnOIDHMACSHA22 = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 8}
	tnOIDHMACSHA25 = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 9}
	tnOIDHMACSHA38 = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 10}
	tnOIDHMACSHA51 = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 11}
	tnOIDAES128CBC = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 2}
	tnOIDAES192CBC = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 22}
	tnOIDAES256CBC = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 42}
	tnOIDDESEDE3PC = asn1.ObjectIdentifier{1, 2, 840, 113549, 3, 7}
)

type tnPBES2KDF struct {
	Salt      []byte
	Iter      int
	KeyLength int                      ` + "`asn1:\"optional\"`" + `
	PRF       pkix.AlgorithmIdentifier ` + "`asn1:\"optional\"`" + `
}

type tnPBES2Params struct {
	KDF pkix.AlgorithmIdentifier
	Enc pkix.AlgorithmIdentifier
}

type tnEncryptedPrivateKeyInfo struct {
	Algo pkix.AlgorithmIdentifier
	Data []byte
}

func tnPEMHashFactory(oid asn1.ObjectIdentifier) func() hash.Hash {
	switch {
	case oid == nil, oid.Equal(tnOIDHMACSHA1):
		return sha1.New
	case oid.Equal(tnOIDHMACSHA22):
		return sha256.New224
	case oid.Equal(tnOIDHMACSHA25):
		return sha256.New
	case oid.Equal(tnOIDHMACSHA38):
		return sha512.New384
	case oid.Equal(tnOIDHMACSHA51):
		return sha512.New
	}
	return nil
}

func tnPEMCipherBlock(oid asn1.ObjectIdentifier, key []byte) (cipher.Block, int) {
	switch oid.String() {
	case tnOIDAES128CBC.String(), tnOIDAES192CBC.String(), tnOIDAES256CBC.String():
		block, err := aes.NewCipher(key)
		if err != nil {
			return nil, 0
		}
		return block, aes.BlockSize
	case tnOIDDESEDE3PC.String():
		block, err := des.NewTripleDESCipher(key)
		if err != nil {
			return nil, 0
		}
		return block, des.BlockSize
	}
	return nil, 0
}

func tnPEMCBCDecrypt(blockCipher cipher.Block, iv, data []byte) ([]byte, bool) {
	if len(data) == 0 || len(data)%blockCipher.BlockSize() != 0 || len(iv) != blockCipher.BlockSize() {
		return nil, false
	}
	out := make([]byte, len(data))
	cipher.NewCBCDecrypter(blockCipher, iv).CryptBlocks(out, data)
	pad := int(out[len(out)-1])
	if pad == 0 || pad > blockCipher.BlockSize() || pad > len(out) {
		return nil, false
	}
	for _, b := range out[len(out)-pad:] {
		if int(b) != pad {
			return nil, false
		}
	}
	return out[:len(out)-pad], true
}

func tnPEMCBCEncrypt(blockCipher cipher.Block, iv, data []byte) []byte {
	pad := blockCipher.BlockSize() - len(data)%blockCipher.BlockSize()
	padded := append(append([]byte{}, data...), bytes.Repeat([]byte{byte(pad)}, pad)...)
	out := make([]byte, len(padded))
	cipher.NewCBCEncrypter(blockCipher, iv).CryptBlocks(out, padded)
	return out
}

func tnPEMRandom(n int) []byte {
	b := make([]byte, n)
	cryptorand.Read(b)
	return b
}

func tnPEMBadDecrypt() *TnError {
	return TnNodeError("Error", "ERR_OSSL_BAD_DECRYPT", "error:1C800064:Provider routines::bad decrypt")
}

func tnPEMMissingPassphrase() *TnError {
	return TnNodeError("Error", "ERR_OSSL_CRYPTO_INTERRUPTED_OR_CANCELLED", "error:07880109:common libcrypto routines::interrupted or cancelled")
}

// PKCS#8 EncryptedPrivateKeyInfo -> the plain PKCS#8 DER
func tnPEMDecryptPKCS8(der, passphrase []byte, havePass bool) []byte {
	var info tnEncryptedPrivateKeyInfo
	if _, err := asn1.Unmarshal(der, &info); err != nil {
		panic(TnNodeError("Error", "ERR_OSSL_ASN1_NOT_ENCRYPTED", "error:0680007B:asn1 encoding routines::not encrypted"))
	}
	if !info.Algo.Algorithm.Equal(tnOIDPBES2) {
		panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Unsupported private key encryption algorithm"))
	}
	if !havePass {
		panic(tnPEMMissingPassphrase())
	}
	var params tnPBES2Params
	if _, err := asn1.Unmarshal(info.Algo.Parameters.FullBytes, &params); err != nil || !params.KDF.Algorithm.Equal(tnOIDPBKDF2) {
		panic(tnPEMBadDecrypt())
	}
	var kdf tnPBES2KDF
	if _, err := asn1.Unmarshal(params.KDF.Parameters.FullBytes, &kdf); err != nil {
		panic(tnPEMBadDecrypt())
	}
	factory := tnPEMHashFactory(kdf.PRF.Algorithm)
	if factory == nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Unsupported PBKDF2 digest"))
	}
	var iv []byte
	if _, err := asn1.Unmarshal(params.Enc.Parameters.FullBytes, &iv); err != nil {
		panic(tnPEMBadDecrypt())
	}
	var keyLen int
	switch params.Enc.Algorithm.String() {
	case tnOIDAES128CBC.String():
		keyLen = 16
	case tnOIDAES192CBC.String():
		keyLen = 24
	case tnOIDAES256CBC.String():
		keyLen = 32
	case tnOIDDESEDE3PC.String():
		keyLen = 24
	default:
		panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Unsupported PBES2 cipher"))
	}
	if kdf.KeyLength > 0 {
		keyLen = kdf.KeyLength
	}
	key, err := pbkdf2.Key(factory, string(passphrase), kdf.Salt, kdf.Iter, keyLen)
	if err != nil {
		panic(tnPEMBadDecrypt())
	}
	block, _ := tnPEMCipherBlock(params.Enc.Algorithm, key)
	out, ok := tnPEMCBCDecrypt(block, iv, info.Data)
	if !ok {
		panic(tnPEMBadDecrypt())
	}
	return out
}

// The legacy PEM headers (Proc-Type: 4,ENCRYPTED / DEK-Info: AES-256-CBC,<iv>)
func tnPEMDecryptLegacy(block *pem.Block, passphrase []byte, havePass bool) []byte {
	if !havePass {
		panic(tnPEMMissingPassphrase())
	}
	dek := block.Headers["DEK-Info"]
	parts := strings.SplitN(dek, ",", 2)
	if len(parts) != 2 {
		panic(tnPEMBadDecrypt())
	}
	name := strings.ToUpper(strings.TrimSpace(parts[0]))
	iv, err := hex.DecodeString(strings.TrimSpace(parts[1]))
	if err != nil {
		panic(tnPEMBadDecrypt())
	}
	keyLen := 0
	switch name {
	case "AES-128-CBC":
		keyLen = 16
	case "AES-192-CBC":
		keyLen = 24
	case "AES-256-CBC":
		keyLen = 32
	case "DES-EDE3-CBC":
		keyLen = 24
	default:
		panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Unsupported PEM encryption algorithm: "+name))
	}
	// EVP_BytesToKey with MD5 and one iteration: the IV's first 8 bytes are the salt
	salt := iv
	if len(salt) > 8 {
		salt = salt[:8]
	}
	key := []byte{}
	var prev []byte
	for len(key) < keyLen {
		h := md5.New()
		h.Write(prev)
		h.Write(passphrase)
		h.Write(salt)
		prev = h.Sum(nil)
		key = append(key, prev...)
	}
	var blockCipher cipher.Block
	switch name {
	case "DES-EDE3-CBC":
		blockCipher, _ = des.NewTripleDESCipher(key)
	default:
		blockCipher, _ = aes.NewCipher(key)
	}
	if blockCipher == nil {
		panic(tnPEMBadDecrypt())
	}
	out, ok := tnPEMCBCDecrypt(blockCipher, iv, block.Bytes)
	if !ok {
		panic(tnPEMBadDecrypt())
	}
	return out
}

func tnPEMIsEncryptedPKCS8(der []byte) bool {
	var info tnEncryptedPrivateKeyInfo
	if _, err := asn1.Unmarshal(der, &info); err != nil {
		return false
	}
	return info.Algo.Algorithm.Equal(tnOIDPBES2)
}

func tnPEMEncrypted(block *pem.Block) bool {
	return block.Type == "ENCRYPTED PRIVATE KEY" || strings.Contains(strings.ToUpper(block.Headers["Proc-Type"]), "ENCRYPTED")
}

// An encrypted PEM block -> the decrypted one
func tnPEMDecryptBlock(block *pem.Block, passphrase []byte, havePass bool) *pem.Block {
	if block.Type == "ENCRYPTED PRIVATE KEY" {
		return &pem.Block{Type: "PRIVATE KEY", Bytes: tnPEMDecryptPKCS8(block.Bytes, passphrase, havePass)}
	}
	if !strings.Contains(strings.ToUpper(block.Headers["Proc-Type"]), "ENCRYPTED") {
		return block
	}
	return &pem.Block{Type: block.Type, Bytes: tnPEMDecryptLegacy(block, passphrase, havePass)}
}

// PBES2 encryption with PBKDF2-HMAC-SHA256, as OpenSSL writes it
func tnPEMEncryptPKCS8(der []byte, cipherName string, passphrase []byte) []byte {
	name := strings.ToLower(cipherName)
	var encOID asn1.ObjectIdentifier
	keyLen := 0
	switch name {
	case "aes-128-cbc", "aes128":
		encOID, keyLen = tnOIDAES128CBC, 16
	case "aes-192-cbc", "aes192":
		encOID, keyLen = tnOIDAES192CBC, 24
	case "aes-256-cbc", "aes256":
		encOID, keyLen = tnOIDAES256CBC, 32
	case "des-ede3-cbc", "des3":
		encOID, keyLen = tnOIDDESEDE3PC, 24
	default:
		panic(TnNodeError("Error", "ERR_CRYPTO_UNKNOWN_CIPHER", "Unknown cipher: "+cipherName))
	}
	salt := tnPEMRandom(8)
	iv := tnPEMRandom(16)
	if encOID.Equal(tnOIDDESEDE3PC) {
		iv = tnPEMRandom(8)
	}
	key, err := pbkdf2.Key(sha256.New, string(passphrase), salt, 2048, keyLen)
	if err != nil {
		panic(err)
	}
	block, _ := tnPEMCipherBlock(encOID, key)
	encrypted := tnPEMCBCEncrypt(block, iv, der)
	prf := pkix.AlgorithmIdentifier{Algorithm: tnOIDHMACSHA25, Parameters: asn1.RawValue{Tag: 5}}
	kdfParams, _ := asn1.Marshal(tnPBES2KDF{Salt: salt, Iter: 2048, PRF: prf})
	ivDER, _ := asn1.Marshal(iv)
	params, _ := asn1.Marshal(tnPBES2Params{
		KDF: pkix.AlgorithmIdentifier{Algorithm: tnOIDPBKDF2, Parameters: asn1.RawValue{FullBytes: kdfParams}},
		Enc: pkix.AlgorithmIdentifier{Algorithm: encOID, Parameters: asn1.RawValue{FullBytes: ivDER}},
	})
	out, _ := asn1.Marshal(tnEncryptedPrivateKeyInfo{
		Algo: pkix.AlgorithmIdentifier{Algorithm: tnOIDPBES2, Parameters: asn1.RawValue{FullBytes: params}},
		Data: encrypted,
	})
	return out
}`;
