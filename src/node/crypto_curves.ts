// node:crypto's extra key types, on vendored pure-Go modules: Ed448 and X448
// (github.com/cloudflare/circl) and secp256k1 (github.com/decred/dcrd), which
// Go's standard library does not have. The key objects themselves are handled
// in crypto_keys; this helper only moves raw bytes.

export const CRYPTO_CURVES_HELPER = `// node:crypto: Ed448 / X448 / secp256k1 (vendored, pure Go)
type TnEd448Key struct {
	seed []byte
	pub  []byte
}

func tnEd448FromSeed(seed []byte) *TnEd448Key {
	k := ed448.NewKeyFromSeed(seed)
	pub := k.Public().(ed448.PublicKey)
	return &TnEd448Key{seed: append([]byte{}, seed...), pub: append([]byte{}, pub...)}
}

func tnEd448Generate() *TnEd448Key {
	pub, priv, err := ed448.GenerateKey(cryptorand.Reader)
	if err != nil {
		panic(err)
	}
	return &TnEd448Key{seed: append([]byte{}, priv.Seed()...), pub: append([]byte{}, pub...)}
}

func tnEd448Public(k *TnEd448Key) []byte { return k.pub }

func tnEd448Sign(k *TnEd448Key, msg []byte) []byte {
	return ed448.Sign(ed448.NewKeyFromSeed(k.seed), msg, "")
}

func tnEd448Verify(pub []byte, msg, sig []byte) bool {
	return ed448.Verify(ed448.PublicKey(pub), msg, sig, "")
}

type TnX448Key struct {
	secret []byte
	pub    []byte
}

func tnX448FromSecret(secret []byte) *TnX448Key {
	var s, p x448.Key
	copy(s[:], secret)
	x448.KeyGen(&p, &s)
	return &TnX448Key{secret: append([]byte{}, secret...), pub: append([]byte{}, p[:]...)}
}

func tnX448Generate() *TnX448Key {
	secret := make([]byte, x448.Size)
	cryptorand.Read(secret)
	return tnX448FromSecret(secret)
}

func tnX448Public(k *TnX448Key) []byte { return k.pub }

func tnX448Shared(secret, public []byte) []byte {
	var s, p, shared x448.Key
	copy(s[:], secret)
	copy(p[:], public)
	if !x448.Shared(&shared, &s, &p) {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to compute shared secret"))
	}
	return append([]byte{}, shared[:]...)
}

// secp256k1 is an EC key to Node (asymmetricKeyType 'ec', namedCurve secp256k1)
type TnSecp256k1Key struct {
	priv  []byte
	pub   []byte
	curve bool
}

func tnSecp256k1FromPrivate(priv []byte) *TnSecp256k1Key {
	key := secp256k1.PrivKeyFromBytes(priv)
	return &TnSecp256k1Key{priv: append([]byte{}, priv...), pub: key.PubKey().SerializeUncompressed(), curve: true}
}

func tnSecp256k1FromPublic(pub []byte) *TnSecp256k1Key {
	key, err := secp256k1.ParsePubKey(pub)
	if err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to read asymmetric key"))
	}
	return &TnSecp256k1Key{pub: key.SerializeUncompressed(), curve: true}
}

func tnSecp256k1Generate() *TnSecp256k1Key {
	key, err := secp256k1.GeneratePrivateKey()
	if err != nil {
		panic(err)
	}
	return tnSecp256k1FromPrivate(key.Serialize())
}

func tnSecp256k1Public(k *TnSecp256k1Key) []byte { return k.pub }

type tnExtraSig struct {
	R, S *tnbig.Int
}

// DER signature, as OpenSSL produces by default
func tnSecp256k1Sign(k *TnSecp256k1Key, digest []byte) []byte {
	sig := decredecdsa.Sign(secp256k1.PrivKeyFromBytes(k.priv), digest)
	if sig == nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to sign"))
	}
	rv, sv := sig.R(), sig.S()
	r, s := rv.Bytes(), sv.Bytes()
	der, _ := asn1.Marshal(tnExtraSig{R: new(tnbig.Int).SetBytes(r[:]), S: new(tnbig.Int).SetBytes(s[:])})
	return der
}

func tnSecp256k1Verify(pub []byte, digest, der []byte) bool {
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
func tnSecp256k1Shared(priv, public []byte) []byte {
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
