// node:crypto's extra key types, on vendored pure-Go modules: Ed448 and X448
// (github.com/cloudflare/circl) and secp256k1 (github.com/decred/dcrd), which
// Go's standard library does not have. The key objects themselves are handled
// in crypto_keys, which calls this code through function variables: the
// helper (and the vendored modules) are linked only into programs that
// read, generate or agree on asymmetric keys.
export const CRYPTO_CURVES_HELPER = `// node:crypto: Ed448 / X448 / secp256k1 (vendored, pure Go)
func init() {
	tnEd448FromSeed = tnEd448FromSeedImpl
	tnEd448Generate = tnEd448GenerateImpl
	tnEd448Sign = tnEd448SignImpl
	tnEd448Verify = tnEd448VerifyImpl
	tnX448FromSecret = tnX448FromSecretImpl
	tnX448Generate = tnX448GenerateImpl
	tnX448Shared = tnX448SharedImpl
	tnSecp256k1FromPrivate = tnSecp256k1FromPrivateImpl
	tnSecp256k1FromPublic = tnSecp256k1FromPublicImpl
	tnSecp256k1Generate = tnSecp256k1GenerateImpl
	tnSecp256k1Sign = tnSecp256k1SignImpl
	tnSecp256k1Verify = tnSecp256k1VerifyImpl
	tnSecp256k1Shared = tnSecp256k1SharedImpl
}

func tnEd448FromSeedImpl(seed []byte) *TnEd448Key {
	k := ed448.NewKeyFromSeed(seed)
	pub := k.Public().(ed448.PublicKey)
	return &TnEd448Key{seed: append([]byte{}, seed...), pub: append([]byte{}, pub...)}
}

func tnEd448GenerateImpl() *TnEd448Key {
	pub, priv, err := ed448.GenerateKey(cryptorand.Reader)
	if err != nil {
		panic(err)
	}
	return &TnEd448Key{seed: append([]byte{}, priv.Seed()...), pub: append([]byte{}, pub...)}
}

func tnEd448Public(k *TnEd448Key) []byte { return k.pub }

func tnEd448SignImpl(k *TnEd448Key, msg []byte) []byte {
	return ed448.Sign(ed448.NewKeyFromSeed(k.seed), msg, "")
}

func tnEd448VerifyImpl(pub []byte, msg, sig []byte) bool {
	return ed448.Verify(ed448.PublicKey(pub), msg, sig, "")
}

func tnX448FromSecretImpl(secret []byte) *TnX448Key {
	var s, p x448.Key
	copy(s[:], secret)
	x448.KeyGen(&p, &s)
	return &TnX448Key{secret: append([]byte{}, secret...), pub: append([]byte{}, p[:]...)}
}

func tnX448GenerateImpl() *TnX448Key {
	secret := make([]byte, x448.Size)
	cryptorand.Read(secret)
	return tnX448FromSecretImpl(secret)
}

func tnX448Public(k *TnX448Key) []byte { return k.pub }

func tnX448SharedImpl(secret, public []byte) []byte {
	var s, p, shared x448.Key
	copy(s[:], secret)
	copy(p[:], public)
	if !x448.Shared(&shared, &s, &p) {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to compute shared secret"))
	}
	return append([]byte{}, shared[:]...)
}

func tnSecp256k1FromPrivateImpl(priv []byte) *TnSecp256k1Key {
	key := secp256k1.PrivKeyFromBytes(priv)
	return &TnSecp256k1Key{priv: append([]byte{}, priv...), pub: key.PubKey().SerializeUncompressed(), curve: true}
}

func tnSecp256k1FromPublicImpl(pub []byte) *TnSecp256k1Key {
	key, err := secp256k1.ParsePubKey(pub)
	if err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to read asymmetric key"))
	}
	return &TnSecp256k1Key{pub: key.SerializeUncompressed(), curve: true}
}

func tnSecp256k1GenerateImpl() *TnSecp256k1Key {
	key, err := secp256k1.GeneratePrivateKey()
	if err != nil {
		panic(err)
	}
	return tnSecp256k1FromPrivateImpl(key.Serialize())
}

func tnSecp256k1Public(k *TnSecp256k1Key) []byte { return k.pub }

type tnExtraSig struct {
	R, S *tnbig.Int
}

// DER signature, as OpenSSL produces by default
func tnSecp256k1SignImpl(k *TnSecp256k1Key, digest []byte) []byte {
	sig := decredecdsa.Sign(secp256k1.PrivKeyFromBytes(k.priv), digest)
	if sig == nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to sign"))
	}
	rv, sv := sig.R(), sig.S()
	r, s := rv.Bytes(), sv.Bytes()
	der, _ := asn1.Marshal(tnExtraSig{R: new(tnbig.Int).SetBytes(r[:]), S: new(tnbig.Int).SetBytes(s[:])})
	return der
}

func tnSecp256k1VerifyImpl(pub []byte, digest, der []byte) bool {
	var sig tnExtraSig
	if _, err := asn1.Unmarshal(der, &sig); err != nil {
		return false
	}
	var r, s secp256k1.ModNScalar
	if r.SetByteSlice(sig.R.Bytes()) || s.SetByteSlice(sig.S.Bytes()) {
		return false
	}
	key, err := secp256k1.ParsePubKey(pub)
	if err != nil {
		return false
	}
	return decredecdsa.NewSignature(&r, &s).Verify(digest, key)
}

// The X coordinate of d·Q, as OpenSSL's ECDH returns it
func tnSecp256k1SharedImpl(priv, public []byte) []byte {
	key, err := secp256k1.ParsePubKey(public)
	if err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to compute shared secret"))
	}
	var point, result secp256k1.JacobianPoint
	key.AsJacobian(&point)
	var d secp256k1.ModNScalar
	d.SetByteSlice(priv)
	secp256k1.ScalarMultNonConst(&d, &point, &result)
	result.ToAffine()
	x := result.X.Bytes()
	return append([]byte{}, x[:]...)
}`;
