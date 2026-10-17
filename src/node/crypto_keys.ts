// node:crypto keys and the rest of crypto: scrypt, callback forms, KeyObject
// (createPrivateKey / createPublicKey / createSecretKey, generateKeyPair,
// PEM / DER / JWK export), sign / verify, RSA encryption, ECDH and classic
// Diffie-Hellman, X509Certificate, primes, and webcrypto's subtle. Backed by
// Go's crypto packages (RSA, ECDSA P-256/384/521, Ed25519, X25519).

import { NodeRegistry, NodeCall, defineClass, defineHelper, getOption, isStringNode, isObjectLiteral, optionIsTrue } from './registry.js';

const cryptoKeysHelper = `// node:crypto keys
func tnCryptoArg(args []interface{}) interface{} {
	if len(args) > 0 {
		return args[0]
	}
	return nil
}

func tnCryptoNumber(v interface{}) (float64, bool) {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Float32, reflect.Float64:
		return rv.Float(), true
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(rv.Int()), true
	}
	return 0, false
}

// An options object's own "length" (TnGet falls back to the object's size)
func tnCryptoLength(obj interface{}) (float64, bool) {
	if m, ok := obj.(map[string]interface{}); ok {
		return tnCryptoNumber(m["length"])
	}
	rv := reflect.ValueOf(obj)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct && rv.Elem().FieldByName("length").IsValid() {
		return tnCryptoNumber(TnGet(obj, "length"))
	}
	return 0, false
}

func tnCryptoErr(r interface{}) *TnError {
	switch e := r.(type) {
	case *TnError:
		return e
	case error:
		return TnNodeError("Error", "", e.Error())
	}
	return TnNodeError("Error", "", fmt.Sprint(r))
}

// Runs work on a goroutine; cb(err, result) on the loop
func tnCryptoAsync(cb interface{}, work func() interface{}) {
	ctx := TnAsyncSnapshot()
	TnLoopRef()
	go func() {
		var result, failure interface{}
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			result = work()
		}()
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() {
				if failure != nil {
					TnInvoke(cb, tnCryptoErr(failure))
					return
				}
				TnInvoke(cb, nil, result)
			})
		})
	}()
}

func tnUnsupportedKey() *TnError {
	return TnNodeError("Error", "ERR_OSSL_UNSUPPORTED", "error:1E08010C:DECODER routines::unsupported")
}

// --- scrypt ---

func tnSalsa208(b *[16]uint32) {
	x := *b
	r := bits.RotateLeft32
	for i := 0; i < 8; i += 2 {
		x[4] ^= r(x[0]+x[12], 7)
		x[8] ^= r(x[4]+x[0], 9)
		x[12] ^= r(x[8]+x[4], 13)
		x[0] ^= r(x[12]+x[8], 18)
		x[9] ^= r(x[5]+x[1], 7)
		x[13] ^= r(x[9]+x[5], 9)
		x[1] ^= r(x[13]+x[9], 13)
		x[5] ^= r(x[1]+x[13], 18)
		x[14] ^= r(x[10]+x[6], 7)
		x[2] ^= r(x[14]+x[10], 9)
		x[6] ^= r(x[2]+x[14], 13)
		x[10] ^= r(x[6]+x[2], 18)
		x[3] ^= r(x[15]+x[11], 7)
		x[7] ^= r(x[3]+x[15], 9)
		x[11] ^= r(x[7]+x[3], 13)
		x[15] ^= r(x[11]+x[7], 18)
		x[1] ^= r(x[0]+x[3], 7)
		x[2] ^= r(x[1]+x[0], 9)
		x[3] ^= r(x[2]+x[1], 13)
		x[0] ^= r(x[3]+x[2], 18)
		x[6] ^= r(x[5]+x[4], 7)
		x[7] ^= r(x[6]+x[5], 9)
		x[4] ^= r(x[7]+x[6], 13)
		x[5] ^= r(x[4]+x[7], 18)
		x[11] ^= r(x[10]+x[9], 7)
		x[8] ^= r(x[11]+x[10], 9)
		x[9] ^= r(x[8]+x[11], 13)
		x[10] ^= r(x[9]+x[8], 18)
		x[12] ^= r(x[15]+x[14], 7)
		x[13] ^= r(x[12]+x[15], 9)
		x[14] ^= r(x[13]+x[12], 13)
		x[15] ^= r(x[14]+x[13], 18)
	}
	for i := range b {
		b[i] += x[i]
	}
}

func tnBlockMix(b []uint32, y []uint32, r int) {
	var x [16]uint32
	copy(x[:], b[(2*r-1)*16:])
	for i := 0; i < 2*r; i++ {
		for j := 0; j < 16; j++ {
			x[j] ^= b[i*16+j]
		}
		tnSalsa208(&x)
		copy(y[i*16:], x[:])
	}
	for i := 0; i < r; i++ {
		copy(b[i*16:], y[2*i*16:2*i*16+16])
		copy(b[(i+r)*16:], y[(2*i+1)*16:(2*i+1)*16+16])
	}
}

func tnROMix(block []byte, r int, n int) {
	words := 32 * r
	x := make([]uint32, words)
	y := make([]uint32, words)
	v := make([]uint32, words*n)
	for i := range x {
		x[i] = binary.LittleEndian.Uint32(block[i*4:])
	}
	for i := 0; i < n; i++ {
		copy(v[i*words:], x)
		tnBlockMix(x, y, r)
	}
	for i := 0; i < n; i++ {
		j := int(x[(2*r-1)*16] & uint32(n-1))
		for k := 0; k < words; k++ {
			x[k] ^= v[j*words+k]
		}
		tnBlockMix(x, y, r)
	}
	for i := range x {
		binary.LittleEndian.PutUint32(block[i*4:], x[i])
	}
}

// scryptSync(password, salt, keylen, { N | cost, r | blockSize, p | parallelization, maxmem })
func TnScryptSync(password interface{}, salt interface{}, keylen float64, options ...interface{}) []byte {
	n, r, p, maxmem := 16384, 8, 1, 32<<20
	if opts := tnCryptoArg(options); opts != nil {
		for _, name := range []string{"N", "cost"} {
			if v, ok := tnCryptoNumber(TnGet(opts, name)); ok {
				n = int(v)
			}
		}
		for _, name := range []string{"r", "blockSize"} {
			if v, ok := tnCryptoNumber(TnGet(opts, name)); ok {
				r = int(v)
			}
		}
		for _, name := range []string{"p", "parallelization"} {
			if v, ok := tnCryptoNumber(TnGet(opts, name)); ok {
				p = int(v)
			}
		}
		if v, ok := tnCryptoNumber(TnGet(opts, "maxmem")); ok {
			maxmem = int(v)
		}
	}
	if n < 2 || n&(n-1) != 0 || r < 1 || p < 1 {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_SCRYPT_PARAMS", "Invalid scrypt params: N must be a power of 2 greater than 1"))
	}
	if 128*n*r > maxmem {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_SCRYPT_PARAMS", "Invalid scrypt params: memory limit exceeded"))
	}
	pw := string(tnCryptoBytes(password, ""))
	b, _ := pbkdf2.Key(sha256.New, pw, tnCryptoBytes(salt, ""), 1, p*128*r)
	for i := 0; i < p; i++ {
		tnROMix(b[i*128*r:(i+1)*128*r], r, n)
	}
	out, _ := pbkdf2.Key(sha256.New, pw, b, 1, int(keylen))
	return out
}

// randomFillSync(buffer, offset?, size?)
func TnRandomFillSync(buf []byte, args ...float64) []byte {
	start, end := 0, len(buf)
	if len(args) > 0 {
		start = int(args[0])
	}
	if len(args) > 1 {
		end = start + int(args[1])
	}
	if start < 0 || end > len(buf) || start > end {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"offset\\" is out of range."))
	}
	cryptorand.Read(buf[start:end])
	return buf
}

// --- KeyObject ---

type TnKeyObject struct {
	type_  string
	secret []byte
	pub    tncrypto.PublicKey
	priv   tncrypto.PrivateKey
}

func tnPublicOf(priv tncrypto.PrivateKey) tncrypto.PublicKey {
	switch k := priv.(type) {
	case *rsa.PrivateKey:
		return &k.PublicKey
	case *ecdsa.PrivateKey:
		return &k.PublicKey
	case ed25519.PrivateKey:
		return k.Public()
	case *ecdh.PrivateKey:
		return k.PublicKey()
	}
	return nil
}

func tnPrivateKeyObject(priv tncrypto.PrivateKey) *TnKeyObject {
	return &TnKeyObject{type_: "private", priv: priv, pub: tnPublicOf(priv)}
}

// A key argument: PEM / DER bytes, a KeyObject / CryptoKey, or { key, format, type, encoding }
type tnKeyInput struct {
	data   []byte
	format string
	typ    string
	jwk    interface{}
	object *TnKeyObject
}

func tnReadKeyInput(v interface{}) tnKeyInput {
	in := tnKeyInput{format: "pem"}
	switch x := v.(type) {
	case *TnKeyObject:
		in.object = x
		return in
	case *TnCryptoKey:
		in.object = x.key
		return in
	case string:
		in.data = []byte(x)
		return in
	case []byte:
		in.data = x
		if !bytes.HasPrefix(bytes.TrimSpace(x), []byte("-----")) {
			in.format = "der"
		}
		return in
	}
	if v == nil || TnIsNil(v) {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"key\\" argument must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey. Received undefined"))
	}
	if f, ok := TnGet(v, "format").(string); ok && f != "" {
		in.format = f
	}
	if t, ok := TnGet(v, "type").(string); ok {
		in.typ = t
	}
	switch k := TnGet(v, "key").(type) {
	case *TnKeyObject:
		in.object = k
	case *TnCryptoKey:
		in.object = k.key
	case string:
		enc, _ := TnGet(v, "encoding").(string)
		if enc != "" && in.format != "pem" {
			in.data = TnBufferFromString(k, enc)
		} else {
			in.data = []byte(k)
		}
	case []byte:
		in.data = k
	default:
		if in.format == "jwk" {
			in.jwk = k
		} else {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"key.key\\" property must be of type string or an instance of ArrayBuffer, Buffer, TypedArray, DataView, KeyObject, or CryptoKey."))
		}
	}
	return in
}

func tnParsePrivateDER(der []byte, typ string) (tncrypto.PrivateKey, error) {
	switch typ {
	case "pkcs1":
		return x509.ParsePKCS1PrivateKey(der)
	case "sec1":
		return x509.ParseECPrivateKey(der)
	case "pkcs8":
		return x509.ParsePKCS8PrivateKey(der)
	}
	if k, err := x509.ParsePKCS8PrivateKey(der); err == nil {
		return k, nil
	}
	if k, err := x509.ParsePKCS1PrivateKey(der); err == nil {
		return k, nil
	}
	return x509.ParseECPrivateKey(der)
}

func tnParsePublicDER(der []byte, typ string) (tncrypto.PublicKey, error) {
	if typ == "pkcs1" {
		return x509.ParsePKCS1PublicKey(der)
	}
	if k, err := x509.ParsePKIXPublicKey(der); err == nil {
		return k, nil
	}
	if typ == "" {
		if k, err := x509.ParsePKCS1PublicKey(der); err == nil {
			return k, nil
		}
		if c, err := x509.ParseCertificate(der); err == nil {
			return c.PublicKey, nil
		}
	}
	priv, err := tnParsePrivateDER(der, "")
	if err != nil {
		return nil, err
	}
	return tnPublicOf(priv), nil
}

// Private key from PEM blocks (PRIVATE KEY / RSA PRIVATE KEY / EC PRIVATE KEY) or DER
func tnParsePrivateKey(in tnKeyInput) tncrypto.PrivateKey {
	if in.jwk != nil {
		_, priv := tnKeyFromJWK(in.jwk)
		if priv == nil {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_JWK", "Invalid JWK private key"))
		}
		return priv
	}
	der, typ := in.data, in.typ
	if in.format == "pem" {
		rest := in.data
		found := false
		for !found {
			block, r := pem.Decode(rest)
			if block == nil {
				break
			}
			rest = r
			switch block.Type {
			case "PRIVATE KEY":
				der, typ, found = block.Bytes, "pkcs8", true
			case "RSA PRIVATE KEY":
				der, typ, found = block.Bytes, "pkcs1", true
			case "EC PRIVATE KEY":
				der, typ, found = block.Bytes, "sec1", true
			case "ENCRYPTED PRIVATE KEY":
				panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Encrypted private keys are not supported"))
			}
		}
		if !found {
			panic(tnUnsupportedKey())
		}
	}
	key, err := tnParsePrivateDER(der, typ)
	if err != nil {
		panic(tnUnsupportedKey())
	}
	return key
}

func tnParsePublicKey(in tnKeyInput) tncrypto.PublicKey {
	if in.jwk != nil {
		pub, _ := tnKeyFromJWK(in.jwk)
		return pub
	}
	if in.format != "pem" {
		key, err := tnParsePublicDER(in.data, in.typ)
		if err != nil {
			panic(tnUnsupportedKey())
		}
		return key
	}
	rest := in.data
	for {
		block, r := pem.Decode(rest)
		if block == nil {
			break
		}
		rest = r
		var key tncrypto.PublicKey
		var err error
		switch block.Type {
		case "PUBLIC KEY":
			key, err = x509.ParsePKIXPublicKey(block.Bytes)
		case "RSA PUBLIC KEY":
			key, err = x509.ParsePKCS1PublicKey(block.Bytes)
		case "CERTIFICATE":
			var c *x509.Certificate
			c, err = x509.ParseCertificate(block.Bytes)
			if err == nil {
				key = c.PublicKey
			}
		case "PRIVATE KEY", "RSA PRIVATE KEY", "EC PRIVATE KEY":
			key = tnPublicOf(tnParsePrivateKey(tnKeyInput{data: pem.EncodeToMemory(block), format: "pem"}))
		default:
			continue
		}
		if err != nil {
			panic(tnUnsupportedKey())
		}
		return key
	}
	panic(tnUnsupportedKey())
}

// createPrivateKey(key)
func TnCreatePrivateKey(v interface{}) *TnKeyObject {
	in := tnReadKeyInput(v)
	if in.object != nil {
		if in.object.type_ != "private" {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", "Invalid key object type "+in.object.type_+", expected private."))
		}
		return in.object
	}
	return tnPrivateKeyObject(tnParsePrivateKey(in))
}

// createPublicKey(key): public keys, certificates, or the public half of a private key
func TnCreatePublicKey(v interface{}) *TnKeyObject {
	in := tnReadKeyInput(v)
	if in.object != nil {
		switch in.object.type_ {
		case "public":
			return in.object
		case "private":
			return &TnKeyObject{type_: "public", pub: in.object.pub}
		}
		panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", "Invalid key object type secret, expected private."))
	}
	return &TnKeyObject{type_: "public", pub: tnParsePublicKey(in)}
}

// createSecretKey(key, encoding?)
func TnCreateSecretKey(key interface{}, enc ...string) *TnKeyObject {
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	return &TnKeyObject{type_: "secret", secret: append([]byte{}, tnCryptoBytes(key, e)...)}
}

func (k *TnKeyObject) Get_type_() string { return k.type_ }

func tnAsymmetricType(pub tncrypto.PublicKey) string {
	switch p := pub.(type) {
	case *rsa.PublicKey:
		return "rsa"
	case *ecdsa.PublicKey:
		return "ec"
	case ed25519.PublicKey:
		return "ed25519"
	case *ecdh.PublicKey:
		if p.Curve() == ecdh.X25519() {
			return "x25519"
		}
		return "ec"
	}
	return ""
}

func (k *TnKeyObject) Get_asymmetricKeyType() *string {
	if k.type_ == "secret" {
		return nil
	}
	t := tnAsymmetricType(k.pub)
	return &t
}

func (k *TnKeyObject) Get_symmetricKeySize() *float64 {
	if k.type_ != "secret" {
		return nil
	}
	n := float64(len(k.secret))
	return &n
}

func tnOpenSSLCurve(name string) string {
	switch name {
	case "P-256":
		return "prime256v1"
	case "P-384":
		return "secp384r1"
	case "P-521":
		return "secp521r1"
	}
	return name
}

type TnKeyDetails struct {
	modulusLength  float64
	publicExponent *tnbig.Int
	namedCurve     string
}

func (k *TnKeyObject) Get_asymmetricKeyDetails() *TnKeyDetails {
	switch p := k.pub.(type) {
	case *rsa.PublicKey:
		return &TnKeyDetails{modulusLength: float64(p.N.BitLen()), publicExponent: tnbig.NewInt(int64(p.E))}
	case *ecdsa.PublicKey:
		return &TnKeyDetails{namedCurve: tnOpenSSLCurve(p.Curve.Params().Name)}
	case nil:
		return nil
	}
	return &TnKeyDetails{}
}

func tnB64u(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func tnJWK(pub tncrypto.PublicKey, priv tncrypto.PrivateKey) map[string]interface{} {
	m := map[string]interface{}{}
	switch p := pub.(type) {
	case *rsa.PublicKey:
		m["kty"] = "RSA"
		m["n"] = tnB64u(p.N.Bytes())
		m["e"] = tnB64u(tnbig.NewInt(int64(p.E)).Bytes())
		if k, ok := priv.(*rsa.PrivateKey); ok {
			k.Precompute()
			m["d"] = tnB64u(k.D.Bytes())
			if len(k.Primes) >= 2 {
				m["p"] = tnB64u(k.Primes[0].Bytes())
				m["q"] = tnB64u(k.Primes[1].Bytes())
				m["dp"] = tnB64u(k.Precomputed.Dp.Bytes())
				m["dq"] = tnB64u(k.Precomputed.Dq.Bytes())
				m["qi"] = tnB64u(k.Precomputed.Qinv.Bytes())
			}
		}
	case *ecdsa.PublicKey:
		size := (p.Curve.Params().BitSize + 7) / 8
		m["kty"] = "EC"
		m["crv"] = p.Curve.Params().Name
		m["x"] = tnB64u(p.X.FillBytes(make([]byte, size)))
		m["y"] = tnB64u(p.Y.FillBytes(make([]byte, size)))
		if k, ok := priv.(*ecdsa.PrivateKey); ok {
			m["d"] = tnB64u(k.D.FillBytes(make([]byte, size)))
		}
	case ed25519.PublicKey:
		m["kty"] = "OKP"
		m["crv"] = "Ed25519"
		m["x"] = tnB64u(p)
		if k, ok := priv.(ed25519.PrivateKey); ok {
			m["d"] = tnB64u(k.Seed())
		}
	case *ecdh.PublicKey:
		m["kty"] = "OKP"
		m["crv"] = "X25519"
		m["x"] = tnB64u(p.Bytes())
		if k, ok := priv.(*ecdh.PrivateKey); ok {
			m["d"] = tnB64u(k.Bytes())
		}
	}
	return m
}

func tnJWKBytes(jwk interface{}, key string) []byte {
	s, _ := TnGet(jwk, key).(string)
	if s == "" {
		return nil
	}
	b, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(s, "="))
	if err != nil {
		panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_JWK", "Invalid JWK data"))
	}
	return b
}

func tnNamedCurve(name string) elliptic.Curve {
	switch strings.ToLower(name) {
	case "p-256", "prime256v1", "secp256r1":
		return elliptic.P256()
	case "p-384", "secp384r1":
		return elliptic.P384()
	case "p-521", "secp521r1":
		return elliptic.P521()
	}
	panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_CURVE", "Invalid EC curve name"))
}

func tnBigFrom(b []byte) *tnbig.Int { return new(tnbig.Int).SetBytes(b) }

// Keys from a JWK object (RSA, EC, OKP Ed25519 / X25519)
func tnKeyFromJWK(jwk interface{}) (tncrypto.PublicKey, tncrypto.PrivateKey) {
	kty, _ := TnGet(jwk, "kty").(string)
	switch kty {
	case "RSA":
		pub := &rsa.PublicKey{N: tnBigFrom(tnJWKBytes(jwk, "n")), E: int(tnBigFrom(tnJWKBytes(jwk, "e")).Int64())}
		d := tnJWKBytes(jwk, "d")
		if d == nil {
			return pub, nil
		}
		priv := &rsa.PrivateKey{PublicKey: *pub, D: tnBigFrom(d), Primes: []*tnbig.Int{tnBigFrom(tnJWKBytes(jwk, "p")), tnBigFrom(tnJWKBytes(jwk, "q"))}}
		priv.Precompute()
		return &priv.PublicKey, priv
	case "EC":
		crv, _ := TnGet(jwk, "crv").(string)
		pub := &ecdsa.PublicKey{Curve: tnNamedCurve(crv), X: tnBigFrom(tnJWKBytes(jwk, "x")), Y: tnBigFrom(tnJWKBytes(jwk, "y"))}
		d := tnJWKBytes(jwk, "d")
		if d == nil {
			return pub, nil
		}
		priv := &ecdsa.PrivateKey{PublicKey: *pub, D: tnBigFrom(d)}
		return &priv.PublicKey, priv
	case "OKP":
		crv, _ := TnGet(jwk, "crv").(string)
		x, d := tnJWKBytes(jwk, "x"), tnJWKBytes(jwk, "d")
		switch crv {
		case "Ed25519":
			if d != nil {
				priv := ed25519.NewKeyFromSeed(d)
				return priv.Public(), priv
			}
			return ed25519.PublicKey(x), nil
		case "X25519":
			if d != nil {
				priv, err := ecdh.X25519().NewPrivateKey(d)
				if err == nil {
					return priv.PublicKey(), priv
				}
			} else if pub, err := ecdh.X25519().NewPublicKey(x); err == nil {
				return pub, nil
			}
		}
	}
	panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_JWK", "Invalid JWK data"))
}

func tnPEMOrDER(der []byte, block string, format string) interface{} {
	if format == "der" {
		return der
	}
	return string(pem.EncodeToMemory(&pem.Block{Type: block, Bytes: der}))
}

func tnKeyEncodingError(typ string) *TnError {
	return TnNodeError("Error", "ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS", "The selected key encoding "+typ+" is not supported for this key type.")
}

// export({ format: 'pem' | 'der' | 'jwk', type: 'spki' | 'pkcs1' | 'pkcs8' | 'sec1' })
func (k *TnKeyObject) export(options ...interface{}) interface{} {
	opts := tnCryptoArg(options)
	format, _ := TnGet(opts, "format").(string)
	typ, _ := TnGet(opts, "type").(string)
	switch k.type_ {
	case "secret":
		if format == "jwk" {
			return map[string]interface{}{"kty": "oct", "k": tnB64u(k.secret)}
		}
		return append([]byte{}, k.secret...)
	case "public":
		if format == "jwk" {
			return tnJWK(k.pub, nil)
		}
		if typ == "pkcs1" {
			pub, ok := k.pub.(*rsa.PublicKey)
			if !ok {
				panic(tnKeyEncodingError(typ))
			}
			return tnPEMOrDER(x509.MarshalPKCS1PublicKey(pub), "RSA PUBLIC KEY", format)
		}
		der, err := x509.MarshalPKIXPublicKey(k.pub)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return tnPEMOrDER(der, "PUBLIC KEY", format)
	}
	if c := TnGet(opts, "cipher"); c != nil && !TnIsNil(c) {
		panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Encrypted private key export is not supported"))
	}
	if format == "jwk" {
		return tnJWK(k.pub, k.priv)
	}
	switch typ {
	case "pkcs1":
		priv, ok := k.priv.(*rsa.PrivateKey)
		if !ok {
			panic(tnKeyEncodingError(typ))
		}
		return tnPEMOrDER(x509.MarshalPKCS1PrivateKey(priv), "RSA PRIVATE KEY", format)
	case "sec1":
		priv, ok := k.priv.(*ecdsa.PrivateKey)
		if !ok {
			panic(tnKeyEncodingError(typ))
		}
		der, err := x509.MarshalECPrivateKey(priv)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return tnPEMOrDER(der, "EC PRIVATE KEY", format)
	}
	der, err := x509.MarshalPKCS8PrivateKey(k.priv)
	if err != nil {
		panic(tnCryptoErr(err))
	}
	return tnPEMOrDER(der, "PRIVATE KEY", format)
}

func (k *TnKeyObject) equals(other *TnKeyObject) bool {
	if other == nil || k.type_ != other.type_ {
		return false
	}
	switch k.type_ {
	case "secret":
		return len(k.secret) == len(other.secret) && subtle.ConstantTimeCompare(k.secret, other.secret) == 1
	case "public":
		a, _ := x509.MarshalPKIXPublicKey(k.pub)
		b, _ := x509.MarshalPKIXPublicKey(other.pub)
		return bytes.Equal(a, b)
	}
	a, _ := x509.MarshalPKCS8PrivateKey(k.priv)
	b, _ := x509.MarshalPKCS8PrivateKey(other.priv)
	return bytes.Equal(a, b)
}

// KeyObject.from(cryptoKey)
func TnKeyObjectFrom(key *TnCryptoKey) *TnKeyObject { return key.key }

// --- key generation ---

func tnGenerateAsymmetric(kind string, options interface{}) tncrypto.PrivateKey {
	switch kind {
	case "rsa":
		bitsN, ok := tnCryptoNumber(TnGet(options, "modulusLength"))
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.modulusLength\\" property must be of type number. Received undefined"))
		}
		if e, ok := tnCryptoNumber(TnGet(options, "publicExponent")); ok && e != 65537 {
			panic(TnNodeError("Error", "ERR_CRYPTO_UNSUPPORTED_OPERATION", "Only the public exponent 65537 is supported"))
		}
		k, err := rsa.GenerateKey(cryptorand.Reader, int(bitsN))
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return k
	case "ec":
		name, _ := TnGet(options, "namedCurve").(string)
		k, err := ecdsa.GenerateKey(tnNamedCurve(name), cryptorand.Reader)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return k
	case "ed25519":
		_, k, _ := ed25519.GenerateKey(cryptorand.Reader)
		return k
	case "x25519":
		k, _ := ecdh.X25519().GenerateKey(cryptorand.Reader)
		return k
	}
	panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'type' must be a supported key type. Received '"+kind+"'"))
}

func tnEncodeKey(k *TnKeyObject, enc interface{}) interface{} {
	if enc == nil || TnIsNil(enc) {
		return k
	}
	return k.export(enc)
}

// generateKeyPairSync(type, options): KeyObjects, or encoded keys with
// publicKeyEncoding / privateKeyEncoding
func TnGenerateKeyPairSync(kind string, options ...interface{}) (interface{}, interface{}) {
	opts := tnCryptoArg(options)
	priv := tnPrivateKeyObject(tnGenerateAsymmetric(kind, opts))
	pub := &TnKeyObject{type_: "public", pub: priv.pub}
	return tnEncodeKey(pub, TnGet(opts, "publicKeyEncoding")), tnEncodeKey(priv, TnGet(opts, "privateKeyEncoding"))
}

type TnKeyPair struct {
	publicKey  *TnKeyObject
	privateKey *TnKeyObject
}

type TnKeyPairPem struct {
	publicKey  string
	privateKey string
}

type TnKeyPairDer struct {
	publicKey  []byte
	privateKey []byte
}

type TnKeyPairAny struct {
	publicKey  interface{}
	privateKey interface{}
}

func TnKeyPairOf(pub interface{}, priv interface{}) *TnKeyPair {
	return &TnKeyPair{publicKey: pub.(*TnKeyObject), privateKey: priv.(*TnKeyObject)}
}

func TnKeyPairPemOf(pub interface{}, priv interface{}) *TnKeyPairPem {
	p, _ := pub.(string)
	q, _ := priv.(string)
	return &TnKeyPairPem{publicKey: p, privateKey: q}
}

func TnKeyPairDerOf(pub interface{}, priv interface{}) *TnKeyPairDer {
	p, _ := pub.([]byte)
	q, _ := priv.([]byte)
	return &TnKeyPairDer{publicKey: p, privateKey: q}
}

func TnKeyPairAnyOf(pub interface{}, priv interface{}) *TnKeyPairAny {
	return &TnKeyPairAny{publicKey: pub, privateKey: priv}
}

// generateKeyPair(type, options?, cb(err, publicKey, privateKey))
func TnGenerateKeyPair(kind string, options interface{}, cb interface{}) {
	ctx := TnAsyncSnapshot()
	TnLoopRef()
	go func() {
		var pub, priv, failure interface{}
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			pub, priv = TnGenerateKeyPairSync(kind, options)
		}()
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() {
				if failure != nil {
					TnInvoke(cb, tnCryptoErr(failure))
					return
				}
				TnInvoke(cb, nil, pub, priv)
			})
		})
	}()
}

// generateKeySync('hmac' | 'aes', { length })
func TnGenerateKeySync(kind string, opts ...interface{}) *TnKeyObject {
	options := tnCryptoArg(opts)
	length, ok := tnCryptoLength(options)
	if !ok {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.length\\" property must be of type number. Received undefined"))
	}
	switch kind {
	case "aes":
		if length != 128 && length != 192 && length != 256 {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.length' must be one of: 128, 192, 256."))
		}
	case "hmac":
	default:
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'type' must be a supported key type. Received '"+kind+"'"))
	}
	return &TnKeyObject{type_: "secret", secret: TnRandomBytes(float64(int(length) / 8))}
}

// --- sign / verify ---

func tnCryptoHash(alg string) tncrypto.Hash {
	name := strings.ToLower(alg)
	name = strings.TrimPrefix(name, "rsa-")
	name = strings.TrimSuffix(name, "withrsaencryption")
	name = strings.ReplaceAll(name, "-", "")
	switch name {
	case "md5":
		return tncrypto.MD5
	case "sha1":
		return tncrypto.SHA1
	case "sha224":
		return tncrypto.SHA224
	case "sha256":
		return tncrypto.SHA256
	case "sha384":
		return tncrypto.SHA384
	case "sha512":
		return tncrypto.SHA512
	case "sha512224":
		return tncrypto.SHA512_224
	case "sha512256":
		return tncrypto.SHA512_256
	case "sha3224":
		return tncrypto.SHA3_224
	case "sha3256":
		return tncrypto.SHA3_256
	case "sha3384":
		return tncrypto.SHA3_384
	case "sha3512":
		return tncrypto.SHA3_512
	}
	panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_DIGEST", "Invalid digest: "+alg))
}

func tnDigest(h tncrypto.Hash, data []byte) []byte {
	w := h.New()
	w.Write(data)
	return w.Sum(nil)
}

// Signing options carried by { key, padding, saltLength, dsaEncoding }
type tnSignOptions struct {
	padding     int
	saltLength  int
	hasSalt     bool
	dsaEncoding string
}

func tnReadSignOptions(key interface{}) tnSignOptions {
	o := tnSignOptions{dsaEncoding: "der"}
	switch key.(type) {
	case string, []byte, *TnKeyObject, *TnCryptoKey, nil:
		return o
	}
	if v, ok := tnCryptoNumber(TnGet(key, "padding")); ok {
		o.padding = int(v)
	}
	if v, ok := tnCryptoNumber(TnGet(key, "saltLength")); ok {
		o.saltLength = int(v)
		o.hasSalt = true
	}
	if s, ok := TnGet(key, "dsaEncoding").(string); ok && s != "" {
		o.dsaEncoding = s
	}
	return o
}

func (o tnSignOptions) pss(h tncrypto.Hash) *rsa.PSSOptions {
	opts := &rsa.PSSOptions{SaltLength: rsa.PSSSaltLengthAuto, Hash: h}
	if o.hasSalt {
		switch o.saltLength {
		case -1:
			opts.SaltLength = rsa.PSSSaltLengthEqualsHash
		case -2, -3:
			opts.SaltLength = rsa.PSSSaltLengthAuto
		default:
			opts.SaltLength = o.saltLength
		}
	}
	return opts
}

type tnECSig struct {
	R, S *tnbig.Int
}

func tnDERToP1363(der []byte, size int) []byte {
	var sig tnECSig
	if _, err := asn1.Unmarshal(der, &sig); err != nil {
		panic(tnCryptoErr(err))
	}
	out := make([]byte, 2*size)
	sig.R.FillBytes(out[:size])
	sig.S.FillBytes(out[size:])
	return out
}

func tnP1363ToDER(raw []byte) []byte {
	half := len(raw) / 2
	der, _ := asn1.Marshal(tnECSig{R: tnBigFrom(raw[:half]), S: tnBigFrom(raw[half:])})
	return der
}

func tnHashName(alg interface{}) string {
	if s, ok := alg.(string); ok {
		return s
	}
	return ""
}

// sign(algorithm, data, key)
func TnSign(alg interface{}, data interface{}, key interface{}) []byte {
	k := TnCreatePrivateKey(key)
	msg := tnCryptoBytes(data, "")
	o := tnReadSignOptions(key)
	name := tnHashName(alg)
	if name == "" {
		name = "sha256"
	}
	switch p := k.priv.(type) {
	case *rsa.PrivateKey:
		h := tnCryptoHash(name)
		digest := tnDigest(h, msg)
		var sig []byte
		var err error
		if o.padding == 6 {
			sig, err = rsa.SignPSS(cryptorand.Reader, p, h, digest, o.pss(h))
		} else {
			sig, err = rsa.SignPKCS1v15(cryptorand.Reader, p, h, digest)
		}
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return sig
	case *ecdsa.PrivateKey:
		digest := tnDigest(tnCryptoHash(name), msg)
		sig, err := ecdsa.SignASN1(cryptorand.Reader, p, digest)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		if o.dsaEncoding == "ieee-p1363" {
			return tnDERToP1363(sig, (p.Curve.Params().BitSize+7)/8)
		}
		return sig
	case ed25519.PrivateKey:
		return ed25519.Sign(p, msg)
	}
	panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", "Invalid key type for signing: "+tnAsymmetricType(k.pub)))
}

// verify(algorithm, data, key, signature)
func TnVerify(alg interface{}, data interface{}, key interface{}, signature interface{}) bool {
	k := TnCreatePublicKey(key)
	msg := tnCryptoBytes(data, "")
	sig := tnCryptoBytes(signature, "")
	o := tnReadSignOptions(key)
	name := tnHashName(alg)
	if name == "" {
		name = "sha256"
	}
	switch p := k.pub.(type) {
	case *rsa.PublicKey:
		h := tnCryptoHash(name)
		digest := tnDigest(h, msg)
		if o.padding == 6 {
			return rsa.VerifyPSS(p, h, digest, sig, o.pss(h)) == nil
		}
		return rsa.VerifyPKCS1v15(p, h, digest, sig) == nil
	case *ecdsa.PublicKey:
		if o.dsaEncoding == "ieee-p1363" {
			sig = tnP1363ToDER(sig)
		}
		return ecdsa.VerifyASN1(p, tnDigest(tnCryptoHash(name), msg), sig)
	case ed25519.PublicKey:
		return ed25519.Verify(p, msg, sig)
	}
	panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", "Invalid key type for verification: "+tnAsymmetricType(k.pub)))
}

// createSign / createVerify
type TnSigner struct {
	alg  string
	data []byte
}

func TnCreateSign(alg string, options ...interface{}) *TnSigner {
	tnCryptoHash(alg)
	return &TnSigner{alg: alg}
}

func (s *TnSigner) update(data interface{}, enc ...string) *TnSigner {
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	s.data = append(s.data, tnCryptoBytes(data, e)...)
	return s
}

func (s *TnSigner) sign(key interface{}) []byte { return TnSign(s.alg, s.data, key) }

func (s *TnSigner) signString(key interface{}, enc string) string {
	return TnBufferToString(TnSign(s.alg, s.data, key), enc)
}

func (s *TnSigner) verify(key interface{}, signature interface{}, enc ...string) bool {
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	return TnVerify(s.alg, s.data, key, tnCryptoBytes(signature, e))
}

// --- RSA encryption ---

func tnRSAPublic(key interface{}) *rsa.PublicKey {
	k := TnCreatePublicKey(key)
	pub, ok := k.pub.(*rsa.PublicKey)
	if !ok {
		panic(TnNodeError("Error", "ERR_OSSL_EVP_OPERATION_NOT_SUPPORTED_FOR_THIS_KEYTYPE", "operation not supported for this keytype"))
	}
	return pub
}

func tnRSAPrivate(key interface{}) *rsa.PrivateKey {
	k := TnCreatePrivateKey(key)
	priv, ok := k.priv.(*rsa.PrivateKey)
	if !ok {
		panic(TnNodeError("Error", "ERR_OSSL_EVP_OPERATION_NOT_SUPPORTED_FOR_THIS_KEYTYPE", "operation not supported for this keytype"))
	}
	return priv
}

func tnRSAPadding(key interface{}, def int) (int, tncrypto.Hash, []byte) {
	padding := def
	h := tncrypto.SHA1
	var label []byte
	switch key.(type) {
	case string, []byte, *TnKeyObject, nil:
		return padding, h, label
	}
	if v, ok := tnCryptoNumber(TnGet(key, "padding")); ok {
		padding = int(v)
	}
	if s, ok := TnGet(key, "oaepHash").(string); ok && s != "" {
		h = tnCryptoHash(s)
	}
	if l := TnGet(key, "oaepLabel"); l != nil && !TnIsNil(l) {
		label = tnCryptoBytes(l, "")
	}
	return padding, h, label
}

// Textbook RSA with the public or private exponent, left-padded to the key size
func tnRSARaw(n *tnbig.Int, exp *tnbig.Int, data []byte) []byte {
	out := new(tnbig.Int).Exp(tnBigFrom(data), exp, n)
	return out.FillBytes(make([]byte, (n.BitLen()+7)/8))
}

func tnRSADecryptError() *TnError {
	return TnNodeError("Error", "ERR_OSSL_RSA_OAEP_DECODING_ERROR", "error:02000079:rsa routines::oaep decoding error")
}

func TnPublicEncrypt(key interface{}, data interface{}) []byte {
	pub := tnRSAPublic(key)
	padding, h, label := tnRSAPadding(key, 4)
	msg := tnCryptoBytes(data, "")
	var out []byte
	var err error
	switch padding {
	case 1:
		out, err = rsa.EncryptPKCS1v15(cryptorand.Reader, pub, msg)
	case 3:
		out = tnRSARaw(pub.N, tnbig.NewInt(int64(pub.E)), msg)
	default:
		out, err = rsa.EncryptOAEP(h.New(), cryptorand.Reader, pub, msg, label)
	}
	if err != nil {
		panic(TnNodeError("Error", "ERR_OSSL_RSA_DATA_TOO_LARGE_FOR_KEY_SIZE", "error:0200006E:rsa routines::data too large for key size"))
	}
	return out
}

func TnPrivateDecrypt(key interface{}, data interface{}) []byte {
	priv := tnRSAPrivate(key)
	padding, h, label := tnRSAPadding(key, 4)
	msg := tnCryptoBytes(data, "")
	var out []byte
	var err error
	switch padding {
	case 1:
		out, err = rsa.DecryptPKCS1v15(nil, priv, msg)
	case 3:
		out = tnRSARaw(priv.N, priv.D, msg)
	default:
		out, err = rsa.DecryptOAEP(h.New(), nil, priv, msg, label)
	}
	if err != nil {
		panic(tnRSADecryptError())
	}
	return out
}

func TnPrivateEncrypt(key interface{}, data interface{}) []byte {
	priv := tnRSAPrivate(key)
	padding, _, _ := tnRSAPadding(key, 1)
	msg := tnCryptoBytes(data, "")
	if padding == 3 {
		return tnRSARaw(priv.N, priv.D, msg)
	}
	out, err := rsa.SignPKCS1v15(nil, priv, 0, msg)
	if err != nil {
		panic(TnNodeError("Error", "ERR_OSSL_RSA_DATA_TOO_LARGE_FOR_KEY_SIZE", "error:0200006E:rsa routines::data too large for key size"))
	}
	return out
}

func TnPublicDecrypt(key interface{}, data interface{}) []byte {
	pub := tnRSAPublic(key)
	padding, _, _ := tnRSAPadding(key, 1)
	raw := tnRSARaw(pub.N, tnbig.NewInt(int64(pub.E)), tnCryptoBytes(data, ""))
	if padding == 3 {
		return raw
	}
	// 00 01 FF … FF 00 data
	if len(raw) < 11 || raw[0] != 0 || raw[1] != 1 {
		panic(TnNodeError("Error", "ERR_OSSL_RSA_PADDING_CHECK_FAILED", "error:02000072:rsa routines::padding check failed"))
	}
	i := 2
	for i < len(raw) && raw[i] == 0xFF {
		i++
	}
	if i >= len(raw) || raw[i] != 0 {
		panic(TnNodeError("Error", "ERR_OSSL_RSA_PADDING_CHECK_FAILED", "error:02000072:rsa routines::padding check failed"))
	}
	return append([]byte{}, raw[i+1:]...)
}

// --- ECDH / Diffie-Hellman ---

type TnECDH struct {
	name  string
	curve ecdh.Curve
	ec    elliptic.Curve
	priv  *ecdh.PrivateKey
}

func TnGetCurves() []string { return []string{"prime256v1", "secp384r1", "secp521r1"} }

func TnCreateECDH(name string) *TnECDH {
	switch strings.ToLower(name) {
	case "prime256v1", "secp256r1", "p-256":
		return &TnECDH{name: name, curve: ecdh.P256(), ec: elliptic.P256()}
	case "secp384r1", "p-384":
		return &TnECDH{name: name, curve: ecdh.P384(), ec: elliptic.P384()}
	case "secp521r1", "p-521":
		return &TnECDH{name: name, curve: ecdh.P521(), ec: elliptic.P521()}
	}
	panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_CURVE", "Invalid EC curve name"))
}

// Results of calls that return a Buffer or a string depending on their arguments
func tnAsBytes(v interface{}) []byte {
	b, _ := v.([]byte)
	return b
}

func tnAsString(v interface{}) string {
	s, _ := v.(string)
	return s
}

func tnEncodeOut(b []byte, enc []string) interface{} {
	if len(enc) > 0 && enc[0] != "" && enc[0] != "buffer" {
		return TnBufferToString(b, enc[0])
	}
	return b
}

func (e *TnECDH) publicBytes(format string) []byte {
	if e.priv == nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Failed to get ECDH public key"))
	}
	raw := e.priv.PublicKey().Bytes()
	if format == "compressed" {
		x, y := elliptic.Unmarshal(e.ec, raw)
		return elliptic.MarshalCompressed(e.ec, x, y)
	}
	return raw
}

func (e *TnECDH) generateKeys(args ...string) interface{} {
	k, err := e.curve.GenerateKey(cryptorand.Reader)
	if err != nil {
		panic(tnCryptoErr(err))
	}
	e.priv = k
	return e.getPublicKey(args...)
}

func (e *TnECDH) getPublicKey(args ...string) interface{} {
	format := ""
	if len(args) > 1 {
		format = args[1]
	}
	return tnEncodeOut(e.publicBytes(format), args)
}

func (e *TnECDH) getPrivateKey(args ...string) interface{} {
	if e.priv == nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Failed to get ECDH private key"))
	}
	return tnEncodeOut(e.priv.Bytes(), args)
}

func (e *TnECDH) setPrivateKey(key interface{}, enc ...string) {
	ee := ""
	if len(enc) > 0 {
		ee = enc[0]
	}
	k, err := e.curve.NewPrivateKey(tnCryptoBytes(key, ee))
	if err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_INVALID_KEYTYPE", "Private key is not valid for specified curve."))
	}
	e.priv = k
}

func (e *TnECDH) computeSecret(other interface{}, args ...string) interface{} {
	inEnc := ""
	if len(args) > 0 {
		inEnc = args[0]
	}
	raw := tnCryptoBytes(other, inEnc)
	if len(raw) > 0 && (raw[0] == 2 || raw[0] == 3) {
		x, y := elliptic.UnmarshalCompressed(e.ec, raw)
		if x == nil {
			panic(TnNodeError("Error", "ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Public key is not valid for specified curve"))
		}
		raw = elliptic.Marshal(e.ec, x, y)
	}
	pub, err := e.curve.NewPublicKey(raw)
	if err != nil || e.priv == nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Public key is not valid for specified curve"))
	}
	secret, err := e.priv.ECDH(pub)
	if err != nil {
		panic(tnCryptoErr(err))
	}
	if len(args) > 1 {
		return tnEncodeOut(secret, args[1:])
	}
	return secret
}

// diffieHellman({ privateKey, publicKey }): ec and x25519 KeyObjects
func TnDiffieHellman(options interface{}) []byte {
	priv, _ := TnGet(options, "privateKey").(*TnKeyObject)
	pub, _ := TnGet(options, "publicKey").(*TnKeyObject)
	if priv == nil || pub == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.privateKey\\" and \\"options.publicKey\\" properties must be KeyObjects"))
	}
	return tnECDHSecret(priv.priv, pub.pub)
}

func tnECDHSecret(privKey tncrypto.PrivateKey, pubKey tncrypto.PublicKey) []byte {
	var a *ecdh.PrivateKey
	var b *ecdh.PublicKey
	var err error
	switch k := privKey.(type) {
	case *ecdh.PrivateKey:
		a = k
	case *ecdsa.PrivateKey:
		a, err = k.ECDH()
	}
	switch k := pubKey.(type) {
	case *ecdh.PublicKey:
		b = k
	case *ecdsa.PublicKey:
		b, err = k.ECDH()
	}
	if a == nil || b == nil || err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_INCOMPATIBLE_KEY", "Incompatible key types for Diffie-Hellman"))
	}
	secret, err := a.ECDH(b)
	if err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_INCOMPATIBLE_KEY", "Incompatible key types for Diffie-Hellman: "+err.Error()))
	}
	return secret
}

var tnModpGroups = map[string]string{
	"modp1": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A63A3620FFFFFFFFFFFFFFFF",
	"modp2": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF",
	"modp5": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF",
	"modp14": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF",
	"modp15": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF",
	"modp16": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C934063199FFFFFFFFFFFFFFFF",
	"modp17": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DCC4024FFFFFFFFFFFFFFFF",
	"modp18": "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A92108011A723C12A787E6D788719A10BDBA5B2699C327186AF4E23C1A946834B6150BDA2583E9CA2AD44CE8DBBBC2DB04DE8EF92E8EFC141FBECAA6287C59474E6BC05D99B2964FA090C3A2233BA186515BE7ED1F612970CEE2D7AFB81BDD762170481CD0069127D5B05AA993B4EA988D8FDDC186FFB7DC90A6C08F4DF435C93402849236C3FAB4D27C7026C1D4DCB2602646DEC9751E763DBA37BDF8FF9406AD9E530EE5DB382F413001AEB06A53ED9027D831179727B0865A8918DA3EDBEBCF9B14ED44CE6CBACED4BB1BDB7F1447E6CC254B332051512BD7AF426FB8F401378CD2BF5983CA01C64B92ECF032EA15D1721D03F482D7CE6E74FEF6D55E702F46980C82B5A84031900B1C9E59E7C97FBEC7E8F323A97A7E36CC88BE0F1D45B7FF585AC54BD407B22B4154AACC8F6D7EBF48E1D814CC5ED20F8037E0A79715EEF29BE32806A1D58BB7C5DA76F550AA3D8A1FBFF0EB19CCB1A313D55CDA56C9EC2EF29632387FE8D76E3C0468043E8F663F4860EE12BF2D5B0B7474D6E694F91E6DBE115974A3926F12FEE5E438777CB6A932DF8CD8BEC4D073B931BA3BC832B68D9DD300741FA7BF8AFC47ED2576F6936BA424663AAB639C5AE4F5683423B4742BF1C978238F16CBE39D652DE3FDB8BEFC848AD922222E04A4037C0713EB57A81A23F0C73473FC646CEA306B4BCBC8862F8385DDFA9D4B7FA2C087E879683303ED5BDD3A062B3CF5B3A278A66D2A13F83F44F82DDF310EE074AB6A364597E899A0255DC164F31CC50846851DF9AB48195DED7EA1B1D510BD7EE74D73FAF36BC31ECFA268359046F4EB879F924009438B481C6CD7889A002ED5EE382BC9190DA6FC026E479558E4475677E9AA9E3050E2765694DFC81F56E880B96E7160C980DD98EDD3DFFFFFFFFFFFFFFFFF",
}

// Classic (finite-field) Diffie-Hellman
type TnDiffieHellmanGroup struct {
	p, g, priv, pub *tnbig.Int
	verifyError     float64
}

func tnDHNumber(v interface{}, enc string) *tnbig.Int {
	switch x := v.(type) {
	case float64:
		return tnbig.NewInt(int64(x))
	case *tnbig.Int:
		return x
	}
	return tnBigFrom(tnCryptoBytes(v, enc))
}

// createDiffieHellman(primeLength | prime, primeEncoding?, generator?, generatorEncoding?)
func TnCreateDiffieHellman(prime interface{}, args ...interface{}) *TnDiffieHellmanGroup {
	dh := &TnDiffieHellmanGroup{g: tnbig.NewInt(2)}
	rest := args
	enc := ""
	if len(rest) > 0 {
		if s, ok := rest[0].(string); ok {
			enc = s
			rest = rest[1:]
		}
	}
	if n, ok := prime.(float64); ok {
		p, err := cryptorand.Prime(cryptorand.Reader, int(n))
		if err != nil {
			panic(tnCryptoErr(err))
		}
		dh.p = p
	} else {
		dh.p = tnBigFrom(tnCryptoBytes(prime, enc))
	}
	if len(rest) > 0 && rest[0] != nil {
		genEnc := ""
		if len(rest) > 1 {
			genEnc, _ = rest[1].(string)
		}
		dh.g = tnDHNumber(rest[0], genEnc)
	}
	return dh
}

// getDiffieHellman(groupName) / createDiffieHellmanGroup
func TnGetDiffieHellman(name string) *TnDiffieHellmanGroup {
	hexPrime, ok := tnModpGroups[name]
	if !ok {
		panic(TnNodeError("Error", "ERR_CRYPTO_UNKNOWN_DH_GROUP", "Unknown DH group"))
	}
	p, _ := new(tnbig.Int).SetString(hexPrime, 16)
	return &TnDiffieHellmanGroup{p: p, g: tnbig.NewInt(2)}
}

func (d *TnDiffieHellmanGroup) size() int { return (d.p.BitLen() + 7) / 8 }

func (d *TnDiffieHellmanGroup) generateKeys(enc ...string) interface{} {
	if d.priv == nil {
		max := new(tnbig.Int).Sub(d.p, tnbig.NewInt(2))
		k, err := cryptorand.Int(cryptorand.Reader, max)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		d.priv = k.Add(k, tnbig.NewInt(1))
	}
	d.pub = new(tnbig.Int).Exp(d.g, d.priv, d.p)
	return tnEncodeOut(d.pub.Bytes(), enc)
}

func (d *TnDiffieHellmanGroup) computeSecret(other interface{}, args ...string) interface{} {
	inEnc := ""
	if len(args) > 0 {
		inEnc = args[0]
	}
	y := tnBigFrom(tnCryptoBytes(other, inEnc))
	secret := new(tnbig.Int).Exp(y, d.priv, d.p).FillBytes(make([]byte, d.size()))
	if len(args) > 1 {
		return tnEncodeOut(secret, args[1:])
	}
	return secret
}

func (d *TnDiffieHellmanGroup) getPrime(enc ...string) interface{}     { return tnEncodeOut(d.p.Bytes(), enc) }
func (d *TnDiffieHellmanGroup) getGenerator(enc ...string) interface{} { return tnEncodeOut(d.g.Bytes(), enc) }
func (d *TnDiffieHellmanGroup) getPublicKey(enc ...string) interface{} { return tnEncodeOut(d.pub.Bytes(), enc) }
func (d *TnDiffieHellmanGroup) getPrivateKey(enc ...string) interface{} {
	return tnEncodeOut(d.priv.Bytes(), enc)
}

func (d *TnDiffieHellmanGroup) setPublicKey(key interface{}, enc ...string) {
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	d.pub = tnBigFrom(tnCryptoBytes(key, e))
}

func (d *TnDiffieHellmanGroup) setPrivateKey(key interface{}, enc ...string) {
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	d.priv = tnBigFrom(tnCryptoBytes(key, e))
}

func (d *TnDiffieHellmanGroup) Get_verifyError() float64 { return d.verifyError }

// --- primes ---

func tnPrimeBig(v interface{}) *tnbig.Int {
	switch x := v.(type) {
	case *tnbig.Int:
		return x
	case float64:
		return tnbig.NewInt(int64(x))
	case nil:
		return nil
	}
	return tnBigFrom(tnCryptoBytes(v, ""))
}

// generatePrimeSync(size, { safe, add, rem, bigint })
func TnGeneratePrimeBig(size float64, options ...interface{}) *tnbig.Int {
	bitsN := int(size)
	if bitsN < 2 {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"size\\" is out of range. It must be >= 2."))
	}
	opts := tnCryptoArg(options)
	safe, _ := TnGet(opts, "safe").(bool)
	add := tnPrimeBig(TnGet(opts, "add"))
	rem := tnPrimeBig(TnGet(opts, "rem"))
	if add == nil && !safe {
		p, err := cryptorand.Prime(cryptorand.Reader, bitsN)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return p
	}
	if add != nil && rem == nil {
		rem = tnbig.NewInt(1)
		if safe {
			rem = tnbig.NewInt(3)
		}
	}
	limit := new(tnbig.Int).Lsh(tnbig.NewInt(1), uint(bitsN))
	for {
		c, err := cryptorand.Int(cryptorand.Reader, limit)
		if err != nil {
			panic(tnCryptoErr(err))
		}
		c.SetBit(c, bitsN-1, 1)
		if add != nil {
			c.Sub(c, new(tnbig.Int).Mod(c, add)).Add(c, rem)
			if c.BitLen() != bitsN {
				continue
			}
		} else {
			c.SetBit(c, 0, 1)
		}
		if !c.ProbablyPrime(20) {
			continue
		}
		if safe && !new(tnbig.Int).Rsh(c, 1).ProbablyPrime(20) {
			continue
		}
		return c
	}
}

func TnGeneratePrimeBytes(size float64, options ...interface{}) []byte {
	return TnGeneratePrimeBig(size, options...).Bytes()
}

// checkPrimeSync(candidate, { checks })
func TnCheckPrimeSync(candidate interface{}, options ...interface{}) bool {
	checks := 20
	if v, ok := tnCryptoNumber(TnGet(tnCryptoArg(options), "checks")); ok && v > 0 {
		checks = int(v)
	}
	return tnPrimeBig(candidate).ProbablyPrime(checks)
}

// --- X509Certificate ---

type TnX509Certificate struct {
	cert *x509.Certificate
}

func TnNewX509Certificate(data interface{}) *TnX509Certificate {
	raw := tnCryptoBytes(data, "")
	if block, _ := pem.Decode(raw); block != nil {
		raw = block.Bytes
	}
	c, err := x509.ParseCertificate(raw)
	if err != nil {
		panic(TnNodeError("Error", "ERR_OSSL_PEM_NO_START_LINE", "error:0480006C:PEM routines::no start line"))
	}
	return &TnX509Certificate{cert: c}
}

var tnX509Names = map[string]string{
	"2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.9": "street", "2.5.4.10": "O",
	"2.5.4.11": "OU", "2.5.4.5": "serialNumber", "2.5.4.17": "postalCode", "1.2.840.113549.1.9.1": "emailAddress",
	"0.9.2342.19200300.100.1.25": "DC", "0.9.2342.19200300.100.1.1": "UID",
}

// "C=US\\nO=Example\\nCN=example.com", in the certificate's order
func tnX509Name(name pkix.Name) string {
	lines := []string{}
	for _, attr := range name.Names {
		key := tnX509Names[attr.Type.String()]
		if key == "" {
			key = attr.Type.String()
		}
		lines = append(lines, key+"="+fmt.Sprint(attr.Value))
	}
	return strings.Join(lines, "\\n")
}

func tnX509Fingerprint(sum []byte) string {
	parts := make([]string, len(sum))
	for i, b := range sum {
		parts[i] = fmt.Sprintf("%02X", b)
	}
	return strings.Join(parts, ":")
}

func (x *TnX509Certificate) Get_subject() string { return tnX509Name(x.cert.Subject) }
func (x *TnX509Certificate) Get_issuer() string  { return tnX509Name(x.cert.Issuer) }

func (x *TnX509Certificate) Get_subjectAltName() *string {
	alt := []string{}
	for _, d := range x.cert.DNSNames {
		alt = append(alt, "DNS:"+d)
	}
	for _, ip := range x.cert.IPAddresses {
		alt = append(alt, "IP Address:"+ip.String())
	}
	for _, e := range x.cert.EmailAddresses {
		alt = append(alt, "email:"+e)
	}
	for _, u := range x.cert.URIs {
		alt = append(alt, "URI:"+u.String())
	}
	if len(alt) == 0 {
		return nil
	}
	s := strings.Join(alt, ", ")
	return &s
}

func (x *TnX509Certificate) Get_validFrom() string {
	return x.cert.NotBefore.UTC().Format("Jan _2 15:04:05 2006 GMT")
}
func (x *TnX509Certificate) Get_validTo() string {
	return x.cert.NotAfter.UTC().Format("Jan _2 15:04:05 2006 GMT")
}
func (x *TnX509Certificate) Get_validFromDate() time.Time { return x.cert.NotBefore }
func (x *TnX509Certificate) Get_validToDate() time.Time   { return x.cert.NotAfter }
func (x *TnX509Certificate) Get_fingerprint() string {
	sum := sha1.Sum(x.cert.Raw)
	return tnX509Fingerprint(sum[:])
}
func (x *TnX509Certificate) Get_fingerprint256() string {
	sum := sha256.Sum256(x.cert.Raw)
	return tnX509Fingerprint(sum[:])
}
func (x *TnX509Certificate) Get_fingerprint512() string {
	sum := sha512.Sum512(x.cert.Raw)
	return tnX509Fingerprint(sum[:])
}
func (x *TnX509Certificate) Get_serialNumber() string {
	s := strings.ToUpper(x.cert.SerialNumber.Text(16))
	if len(s)%2 == 1 {
		s = "0" + s
	}
	return s
}
func (x *TnX509Certificate) Get_ca() bool    { return x.cert.IsCA }
func (x *TnX509Certificate) Get_raw() []byte { return x.cert.Raw }
func (x *TnX509Certificate) Get_publicKey() *TnKeyObject {
	return &TnKeyObject{type_: "public", pub: x.cert.PublicKey}
}

func (x *TnX509Certificate) Get_keyUsage() []string {
	usages := []string{}
	for _, u := range x.cert.ExtKeyUsage {
		switch u {
		case x509.ExtKeyUsageServerAuth:
			usages = append(usages, "1.3.6.1.5.5.7.3.1")
		case x509.ExtKeyUsageClientAuth:
			usages = append(usages, "1.3.6.1.5.5.7.3.2")
		case x509.ExtKeyUsageCodeSigning:
			usages = append(usages, "1.3.6.1.5.5.7.3.3")
		case x509.ExtKeyUsageEmailProtection:
			usages = append(usages, "1.3.6.1.5.5.7.3.4")
		}
	}
	if len(usages) == 0 {
		return nil
	}
	return usages
}

func (x *TnX509Certificate) checkHost(name string, options ...interface{}) *string {
	if x.cert.VerifyHostname(name) != nil {
		return nil
	}
	return &name
}

func (x *TnX509Certificate) checkIP(ip string) *string {
	parsed := net.ParseIP(ip)
	for _, a := range x.cert.IPAddresses {
		if parsed != nil && a.Equal(parsed) {
			return &ip
		}
	}
	return nil
}

func (x *TnX509Certificate) checkEmail(email string, options ...interface{}) *string {
	for _, e := range x.cert.EmailAddresses {
		if strings.EqualFold(e, email) {
			return &email
		}
	}
	return nil
}

func (x *TnX509Certificate) checkIssued(other *TnX509Certificate) bool {
	return bytes.Equal(x.cert.RawIssuer, other.cert.RawSubject) && x.cert.CheckSignatureFrom(other.cert) == nil
}

// verify(publicKey): the certificate's signature checks out against the key
func (x *TnX509Certificate) verify(key *TnKeyObject) bool {
	c := x.cert
	var h tncrypto.Hash
	switch c.SignatureAlgorithm {
	case x509.SHA1WithRSA, x509.ECDSAWithSHA1:
		h = tncrypto.SHA1
	case x509.SHA256WithRSA, x509.ECDSAWithSHA256, x509.SHA256WithRSAPSS:
		h = tncrypto.SHA256
	case x509.SHA384WithRSA, x509.ECDSAWithSHA384, x509.SHA384WithRSAPSS:
		h = tncrypto.SHA384
	case x509.SHA512WithRSA, x509.ECDSAWithSHA512, x509.SHA512WithRSAPSS:
		h = tncrypto.SHA512
	}
	switch p := key.pub.(type) {
	case *rsa.PublicKey:
		digest := tnDigest(h, c.RawTBSCertificate)
		switch c.SignatureAlgorithm {
		case x509.SHA256WithRSAPSS, x509.SHA384WithRSAPSS, x509.SHA512WithRSAPSS:
			return rsa.VerifyPSS(p, h, digest, c.Signature, &rsa.PSSOptions{SaltLength: rsa.PSSSaltLengthEqualsHash}) == nil
		}
		return rsa.VerifyPKCS1v15(p, h, digest, c.Signature) == nil
	case *ecdsa.PublicKey:
		return ecdsa.VerifyASN1(p, tnDigest(h, c.RawTBSCertificate), c.Signature)
	case ed25519.PublicKey:
		return ed25519.Verify(p, c.RawTBSCertificate, c.Signature)
	}
	return false
}

func (x *TnX509Certificate) toString() string {
	return string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: x.cert.Raw}))
}

func (x *TnX509Certificate) toJSON() string { return x.toString() }

func (x *TnX509Certificate) toLegacyObject() map[string]interface{} {
	names := func(n pkix.Name) map[string]interface{} {
		m := map[string]interface{}{}
		for _, attr := range n.Names {
			key := tnX509Names[attr.Type.String()]
			if key == "" {
				key = attr.Type.String()
			}
			m[key] = fmt.Sprint(attr.Value)
		}
		return m
	}
	out := map[string]interface{}{
		"subject":        names(x.cert.Subject),
		"issuer":         names(x.cert.Issuer),
		"valid_from":     x.Get_validFrom(),
		"valid_to":       x.Get_validTo(),
		"fingerprint":    x.Get_fingerprint(),
		"fingerprint256": x.Get_fingerprint256(),
		"fingerprint512": x.Get_fingerprint512(),
		"serialNumber":   x.Get_serialNumber(),
		"ca":             x.cert.IsCA,
		"raw":            x.cert.Raw,
	}
	if alt := x.Get_subjectAltName(); alt != nil {
		out["subjectaltname"] = *alt
	}
	return out
}

// --- webcrypto (crypto.subtle) ---

type TnCryptoKey struct {
	type_       string
	extractable bool
	algorithm   map[string]interface{}
	usages      []string
	key         *TnKeyObject
}

func (k *TnCryptoKey) Get_type_() string                { return k.type_ }
func (k *TnCryptoKey) Get_extractable() bool            { return k.extractable }
func (k *TnCryptoKey) Get_algorithm() *TnKeyAlgorithm   { return tnKeyAlgorithm(k.algorithm) }

// CryptoKey#algorithm: { name, length, hash: { name }, namedCurve, modulusLength, publicExponent }
type TnKeyAlgorithm struct {
	name           string
	length         float64
	hash           *TnKeyAlgorithm
	namedCurve     string
	modulusLength  float64
	publicExponent []byte
}

func tnKeyAlgorithm(m map[string]interface{}) *TnKeyAlgorithm {
	a := &TnKeyAlgorithm{}
	a.name, _ = m["name"].(string)
	a.length, _ = m["length"].(float64)
	a.namedCurve, _ = m["namedCurve"].(string)
	a.modulusLength, _ = m["modulusLength"].(float64)
	a.publicExponent, _ = m["publicExponent"].([]byte)
	if h, ok := m["hash"].(map[string]interface{}); ok {
		a.hash = tnKeyAlgorithm(h)
	}
	return a
}
func (k *TnCryptoKey) Get_usages() []string             { return k.usages }

type TnCryptoKeyPair struct {
	publicKey  *TnCryptoKey
	privateKey *TnCryptoKey
}

func tnDOMError(name string, message string) *TnError { return TnNodeError(name, "", message) }

var tnSubtleNames = map[string]string{
	"AES-GCM": "AES-GCM", "AES-CBC": "AES-CBC", "AES-CTR": "AES-CTR", "HMAC": "HMAC",
	"RSASSA-PKCS1-V1_5": "RSASSA-PKCS1-v1_5", "RSA-PSS": "RSA-PSS", "RSA-OAEP": "RSA-OAEP",
	"ECDSA": "ECDSA", "ECDH": "ECDH", "ED25519": "Ed25519", "X25519": "X25519", "PBKDF2": "PBKDF2", "HKDF": "HKDF",
}

func tnAlgName(alg interface{}) string {
	if s, ok := alg.(string); ok {
		return s
	}
	n, _ := TnGet(alg, "name").(string)
	return n
}

func tnSubtleAlg(alg interface{}) string {
	name := tnSubtleNames[strings.ToUpper(tnAlgName(alg))]
	if name == "" {
		panic(tnDOMError("NotSupportedError", "Unrecognized algorithm name"))
	}
	return name
}

func tnSubtleHash(alg interface{}) string {
	name := strings.ToUpper(tnAlgName(alg))
	switch name {
	case "SHA-1", "SHA-256", "SHA-384", "SHA-512":
		return name
	}
	panic(tnDOMError("NotSupportedError", "Unrecognized algorithm name"))
}

func tnStrings(v interface{}) []string {
	out := []string{}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() {
		rv = rv.Elem()
	}
	if rv.Kind() == reflect.Slice {
		for i := 0; i < rv.Len(); i++ {
			out = append(out, fmt.Sprint(rv.Index(i).Interface()))
		}
	}
	return out
}

func tnFilterUsages(usages []string, allowed ...string) []string {
	out := []string{}
	for _, u := range usages {
		for _, a := range allowed {
			if u == a {
				out = append(out, u)
			}
		}
	}
	return out
}

func tnSubtle[T any](work func() T) chan T {
	ch := make(chan T, 1)
	func() {
		defer func() {
			if r := recover(); r != nil {
				if e, ok := r.(*TnError); ok && e.Get_name() == "Error" {
					r = tnDOMError("OperationError", e.message)
				}
				TnReject(ch, r)
			}
		}()
		ch <- work()
	}()
	return ch
}

func tnSubtleBytes(v interface{}) []byte {
	switch x := v.(type) {
	case []byte:
		return x
	case string:
		return []byte(x)
	}
	return TnAs[[]byte](v)
}

func TnSubtleDigest(alg interface{}, data interface{}) chan []byte {
	return tnSubtle(func() []byte {
		return tnDigest(tnCryptoHash(tnSubtleHash(alg)), tnSubtleBytes(data))
	})
}

func tnHMACLength(hash string) float64 {
	if hash == "SHA-384" || hash == "SHA-512" {
		return 1024
	}
	return 512
}

func tnSubtleGenerate(alg interface{}, extractable bool, usages interface{}) interface{} {
	name := tnSubtleAlg(alg)
	us := tnStrings(usages)
	switch name {
	case "HMAC":
		hash := tnSubtleHash(TnGet(alg, "hash"))
		length := tnHMACLength(hash)
		if n, ok := tnCryptoLength(alg); ok {
			length = n
		}
		return &TnCryptoKey{type_: "secret", extractable: extractable, usages: us,
			algorithm: map[string]interface{}{"name": name, "hash": map[string]interface{}{"name": hash}, "length": length},
			key:       &TnKeyObject{type_: "secret", secret: TnRandomBytes(float64(int(length) / 8))}}
	case "AES-GCM", "AES-CBC", "AES-CTR":
		length, _ := tnCryptoLength(alg)
		if length != 128 && length != 192 && length != 256 {
			panic(tnDOMError("OperationError", "AES key length must be 128, 192, or 256 bits"))
		}
		return &TnCryptoKey{type_: "secret", extractable: extractable, usages: us,
			algorithm: map[string]interface{}{"name": name, "length": length},
			key:       &TnKeyObject{type_: "secret", secret: TnRandomBytes(length / 8)}}
	}
	var priv tncrypto.PrivateKey
	algorithm := map[string]interface{}{"name": name}
	pubUsages, privUsages := []string{}, []string{}
	switch name {
	case "RSASSA-PKCS1-v1_5", "RSA-PSS", "RSA-OAEP":
		modulus, _ := tnCryptoNumber(TnGet(alg, "modulusLength"))
		if e := TnGet(alg, "publicExponent"); e != nil && !TnIsNil(e) && tnBigFrom(tnSubtleBytes(e)).Int64() != 65537 {
			panic(tnDOMError("OperationError", "Only the public exponent 65537 is supported"))
		}
		priv = tnGenerateAsymmetric("rsa", map[string]interface{}{"modulusLength": modulus})
		algorithm["modulusLength"] = modulus
		algorithm["publicExponent"] = []byte{1, 0, 1}
		algorithm["hash"] = map[string]interface{}{"name": tnSubtleHash(TnGet(alg, "hash"))}
		if name == "RSA-OAEP" {
			pubUsages, privUsages = tnFilterUsages(us, "encrypt", "wrapKey"), tnFilterUsages(us, "decrypt", "unwrapKey")
		} else {
			pubUsages, privUsages = tnFilterUsages(us, "verify"), tnFilterUsages(us, "sign")
		}
	case "ECDSA", "ECDH":
		curve, _ := TnGet(alg, "namedCurve").(string)
		priv = tnGenerateAsymmetric("ec", map[string]interface{}{"namedCurve": curve})
		algorithm["namedCurve"] = curve
		if name == "ECDSA" {
			pubUsages, privUsages = tnFilterUsages(us, "verify"), tnFilterUsages(us, "sign")
		} else {
			privUsages = tnFilterUsages(us, "deriveKey", "deriveBits")
		}
	case "Ed25519":
		priv = tnGenerateAsymmetric("ed25519", nil)
		pubUsages, privUsages = tnFilterUsages(us, "verify"), tnFilterUsages(us, "sign")
	case "X25519":
		priv = tnGenerateAsymmetric("x25519", nil)
		privUsages = tnFilterUsages(us, "deriveKey", "deriveBits")
	default:
		panic(tnDOMError("NotSupportedError", "Unable to generate a key for "+name))
	}
	k := tnPrivateKeyObject(priv)
	return &TnCryptoKeyPair{
		publicKey:  &TnCryptoKey{type_: "public", extractable: true, algorithm: algorithm, usages: pubUsages, key: &TnKeyObject{type_: "public", pub: k.pub}},
		privateKey: &TnCryptoKey{type_: "private", extractable: extractable, algorithm: algorithm, usages: privUsages, key: k},
	}
}

func TnSubtleGenerateKey(alg interface{}, extractable bool, usages interface{}) chan *TnCryptoKey {
	return tnSubtle(func() *TnCryptoKey {
		k, ok := tnSubtleGenerate(alg, extractable, usages).(*TnCryptoKey)
		if !ok {
			panic(tnDOMError("NotSupportedError", "The algorithm generates a key pair"))
		}
		return k
	})
}

func TnSubtleGenerateKeyPair(alg interface{}, extractable bool, usages interface{}) chan *TnCryptoKeyPair {
	return tnSubtle(func() *TnCryptoKeyPair {
		k, ok := tnSubtleGenerate(alg, extractable, usages).(*TnCryptoKeyPair)
		if !ok {
			panic(tnDOMError("NotSupportedError", "The algorithm generates a secret key"))
		}
		return k
	})
}

func TnSubtleGenerateAny(alg interface{}, extractable bool, usages interface{}) chan interface{} {
	return tnSubtle(func() interface{} { return tnSubtleGenerate(alg, extractable, usages) })
}

// The algorithm object of an imported key
func tnSubtleAlgorithm(name string, alg interface{}, k *TnKeyObject) map[string]interface{} {
	algorithm := map[string]interface{}{"name": name}
	switch name {
	case "HMAC":
		algorithm["hash"] = map[string]interface{}{"name": tnSubtleHash(TnGet(alg, "hash"))}
		algorithm["length"] = float64(len(k.secret) * 8)
		if n, ok := tnCryptoLength(alg); ok {
			algorithm["length"] = n
		}
	case "AES-GCM", "AES-CBC", "AES-CTR":
		algorithm["length"] = float64(len(k.secret) * 8)
	case "RSASSA-PKCS1-v1_5", "RSA-PSS", "RSA-OAEP":
		if p, ok := k.pub.(*rsa.PublicKey); ok {
			algorithm["modulusLength"] = float64(p.N.BitLen())
			algorithm["publicExponent"] = tnbig.NewInt(int64(p.E)).Bytes()
		}
		algorithm["hash"] = map[string]interface{}{"name": tnSubtleHash(TnGet(alg, "hash"))}
	case "ECDSA", "ECDH":
		if p, ok := k.pub.(*ecdsa.PublicKey); ok {
			algorithm["namedCurve"] = p.Curve.Params().Name
		}
	}
	return algorithm
}

func tnSubtleImport(format string, data interface{}, alg interface{}, extractable bool, usages interface{}) *TnCryptoKey {
	name := tnSubtleAlg(alg)
	var k *TnKeyObject
	secretAlg := name == "HMAC" || name == "PBKDF2" || name == "HKDF" || strings.HasPrefix(name, "AES-")
	switch format {
	case "raw":
		raw := tnSubtleBytes(data)
		switch {
		case secretAlg:
			k = &TnKeyObject{type_: "secret", secret: append([]byte{}, raw...)}
		case name == "ECDSA" || name == "ECDH":
			curve := tnNamedCurve(fmt.Sprint(TnGet(alg, "namedCurve")))
			x, y := elliptic.Unmarshal(curve, raw)
			if x == nil {
				panic(tnDOMError("DataError", "Invalid keyData"))
			}
			k = &TnKeyObject{type_: "public", pub: &ecdsa.PublicKey{Curve: curve, X: x, Y: y}}
		case name == "Ed25519":
			k = &TnKeyObject{type_: "public", pub: ed25519.PublicKey(append([]byte{}, raw...))}
		case name == "X25519":
			pub, err := ecdh.X25519().NewPublicKey(raw)
			if err != nil {
				panic(tnDOMError("DataError", "Invalid keyData"))
			}
			k = &TnKeyObject{type_: "public", pub: pub}
		}
	case "spki":
		pub, err := x509.ParsePKIXPublicKey(tnSubtleBytes(data))
		if err != nil {
			panic(tnDOMError("DataError", "Invalid keyData"))
		}
		k = &TnKeyObject{type_: "public", pub: pub}
	case "pkcs8":
		priv, err := x509.ParsePKCS8PrivateKey(tnSubtleBytes(data))
		if err != nil {
			panic(tnDOMError("DataError", "Invalid keyData"))
		}
		k = tnPrivateKeyObject(priv)
	case "jwk":
		if kty, _ := TnGet(data, "kty").(string); kty == "oct" {
			k = &TnKeyObject{type_: "secret", secret: tnJWKBytes(data, "k")}
		} else {
			pub, priv := tnKeyFromJWK(data)
			if priv != nil {
				k = tnPrivateKeyObject(priv)
			} else {
				k = &TnKeyObject{type_: "public", pub: pub}
			}
		}
	default:
		panic(tnDOMError("NotSupportedError", "Unsupported key format "+format))
	}
	if k == nil {
		panic(tnDOMError("NotSupportedError", "Unable to import a "+format+" key for "+name))
	}
	return &TnCryptoKey{type_: k.type_, extractable: extractable, usages: tnStrings(usages), algorithm: tnSubtleAlgorithm(name, alg, k), key: k}
}

func TnSubtleImportKey(format string, data interface{}, alg interface{}, extractable bool, usages interface{}) chan *TnCryptoKey {
	return tnSubtle(func() *TnCryptoKey { return tnSubtleImport(format, data, alg, extractable, usages) })
}

func tnSubtleExport(format string, key *TnCryptoKey) interface{} {
	if !key.extractable {
		panic(tnDOMError("InvalidAccessException", "key is not extractable"))
	}
	k := key.key
	switch format {
	case "raw":
		switch p := k.pub.(type) {
		case *ecdsa.PublicKey:
			return elliptic.Marshal(p.Curve, p.X, p.Y)
		case ed25519.PublicKey:
			return []byte(p)
		case *ecdh.PublicKey:
			return p.Bytes()
		}
		if k.type_ == "secret" {
			return append([]byte{}, k.secret...)
		}
	case "spki":
		if k.type_ == "public" {
			return k.export(map[string]interface{}{"type": "spki", "format": "der"})
		}
	case "pkcs8":
		if k.type_ == "private" {
			return k.export(map[string]interface{}{"type": "pkcs8", "format": "der"})
		}
	case "jwk":
		jwk, _ := k.export(map[string]interface{}{"format": "jwk"}).(map[string]interface{})
		jwk["ext"] = key.extractable
		ops := []interface{}{}
		for _, u := range key.usages {
			ops = append(ops, u)
		}
		jwk["key_ops"] = ops
		if length, ok := key.algorithm["length"].(float64); ok {
			switch key.algorithm["name"] {
			case "HMAC":
				hash, _ := TnGet(key.algorithm["hash"], "name").(string)
				jwk["alg"] = "HS" + strings.TrimPrefix(hash, "SHA-")
			case "AES-GCM":
				jwk["alg"] = fmt.Sprintf("A%dGCM", int(length))
			case "AES-CBC":
				jwk["alg"] = fmt.Sprintf("A%dCBC", int(length))
			case "AES-CTR":
				jwk["alg"] = fmt.Sprintf("A%dCTR", int(length))
			}
		}
		return jwk
	}
	panic(tnDOMError("NotSupportedError", "Unable to export a "+k.type_+" key as "+format))
}

func TnSubtleExportKey(format string, key *TnCryptoKey) chan []byte {
	return tnSubtle(func() []byte {
		b, ok := tnSubtleExport(format, key).([]byte)
		if !ok {
			panic(tnDOMError("NotSupportedError", "Unsupported key format "+format))
		}
		return b
	})
}

func TnSubtleExportAny(format string, key *TnCryptoKey) chan interface{} {
	return tnSubtle(func() interface{} { return tnSubtleExport(format, key) })
}

func tnKeyHash(key *TnCryptoKey, alg interface{}) tncrypto.Hash {
	if h := TnGet(alg, "hash"); h != nil {
		return tnCryptoHash(tnSubtleHash(h))
	}
	return tnCryptoHash(tnSubtleHash(key.algorithm["hash"]))
}

func tnSubtleSign(alg interface{}, key *TnCryptoKey, data []byte) []byte {
	name := tnSubtleAlg(alg)
	k := key.key
	switch name {
	case "HMAC":
		h := tnKeyHash(key, nil)
		mac := hmac.New(h.New, k.secret)
		mac.Write(data)
		return mac.Sum(nil)
	case "RSASSA-PKCS1-v1_5":
		h := tnKeyHash(key, nil)
		sig, err := rsa.SignPKCS1v15(cryptorand.Reader, k.priv.(*rsa.PrivateKey), h, tnDigest(h, data))
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return sig
	case "RSA-PSS":
		h := tnKeyHash(key, nil)
		salt, _ := tnCryptoNumber(TnGet(alg, "saltLength"))
		sig, err := rsa.SignPSS(cryptorand.Reader, k.priv.(*rsa.PrivateKey), h, tnDigest(h, data), &rsa.PSSOptions{SaltLength: int(salt), Hash: h})
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return sig
	case "ECDSA":
		priv := k.priv.(*ecdsa.PrivateKey)
		der, err := ecdsa.SignASN1(cryptorand.Reader, priv, tnDigest(tnCryptoHash(tnSubtleHash(TnGet(alg, "hash"))), data))
		if err != nil {
			panic(tnCryptoErr(err))
		}
		return tnDERToP1363(der, (priv.Curve.Params().BitSize+7)/8)
	case "Ed25519":
		return ed25519.Sign(k.priv.(ed25519.PrivateKey), data)
	}
	panic(tnDOMError("NotSupportedError", "Unable to sign with "+name))
}

func TnSubtleSign(alg interface{}, key *TnCryptoKey, data interface{}) chan []byte {
	return tnSubtle(func() []byte {
		if key.type_ == "public" {
			panic(tnDOMError("InvalidAccessError", "Unable to use this key to sign"))
		}
		return tnSubtleSign(alg, key, tnSubtleBytes(data))
	})
}

func TnSubtleVerify(alg interface{}, key *TnCryptoKey, signature interface{}, data interface{}) chan bool {
	return tnSubtle(func() bool {
		name := tnSubtleAlg(alg)
		k := key.key
		sig, msg := tnSubtleBytes(signature), tnSubtleBytes(data)
		switch name {
		case "HMAC":
			return hmac.Equal(tnSubtleSign(alg, key, msg), sig)
		case "RSASSA-PKCS1-v1_5":
			h := tnKeyHash(key, nil)
			return rsa.VerifyPKCS1v15(k.pub.(*rsa.PublicKey), h, tnDigest(h, msg), sig) == nil
		case "RSA-PSS":
			h := tnKeyHash(key, nil)
			salt, _ := tnCryptoNumber(TnGet(alg, "saltLength"))
			return rsa.VerifyPSS(k.pub.(*rsa.PublicKey), h, tnDigest(h, msg), sig, &rsa.PSSOptions{SaltLength: int(salt), Hash: h}) == nil
		case "ECDSA":
			return ecdsa.VerifyASN1(k.pub.(*ecdsa.PublicKey), tnDigest(tnCryptoHash(tnSubtleHash(TnGet(alg, "hash"))), msg), tnP1363ToDER(sig))
		case "Ed25519":
			return ed25519.Verify(k.pub.(ed25519.PublicKey), msg, sig)
		}
		panic(tnDOMError("NotSupportedError", "Unable to verify with "+name))
	})
}

func tnAESBlock(key *TnCryptoKey) cipher.Block {
	block, err := aes.NewCipher(key.key.secret)
	if err != nil {
		panic(tnDOMError("OperationError", err.Error()))
	}
	return block
}

func tnSubtleCrypt(alg interface{}, key *TnCryptoKey, data []byte, decrypt bool) []byte {
	name := tnSubtleAlg(alg)
	switch name {
	case "AES-GCM":
		iv := tnSubtleBytes(TnGet(alg, "iv"))
		tagBits := 128.0
		if n, ok := tnCryptoNumber(TnGet(alg, "tagLength")); ok {
			tagBits = n
		}
		aead, err := cipher.NewGCMWithTagSize(tnAESBlock(key), int(tagBits)/8)
		if err == nil && len(iv) != aead.NonceSize() {
			aead, err = cipher.NewGCMWithNonceSize(tnAESBlock(key), len(iv))
		}
		if err != nil {
			panic(tnDOMError("OperationError", err.Error()))
		}
		var aad []byte
		if a := TnGet(alg, "additionalData"); a != nil && !TnIsNil(a) {
			aad = tnSubtleBytes(a)
		}
		if decrypt {
			out, err := aead.Open(nil, iv, data, aad)
			if err != nil {
				panic(tnDOMError("OperationError", "The operation failed for an operation-specific reason"))
			}
			return out
		}
		return aead.Seal(nil, iv, data, aad)
	case "AES-CBC":
		iv := tnSubtleBytes(TnGet(alg, "iv"))
		block := tnAESBlock(key)
		if decrypt {
			if len(data) == 0 || len(data)%aes.BlockSize != 0 {
				panic(tnDOMError("OperationError", "The provided data is not a multiple of the block size"))
			}
			out := make([]byte, len(data))
			cipher.NewCBCDecrypter(block, iv).CryptBlocks(out, data)
			pad := int(out[len(out)-1])
			if pad == 0 || pad > aes.BlockSize {
				panic(tnDOMError("OperationError", "The operation failed for an operation-specific reason"))
			}
			return out[:len(out)-pad]
		}
		pad := aes.BlockSize - len(data)%aes.BlockSize
		padded := append(append([]byte{}, data...), bytes.Repeat([]byte{byte(pad)}, pad)...)
		out := make([]byte, len(padded))
		cipher.NewCBCEncrypter(block, iv).CryptBlocks(out, padded)
		return out
	case "AES-CTR":
		counter := tnSubtleBytes(TnGet(alg, "counter"))
		out := make([]byte, len(data))
		cipher.NewCTR(tnAESBlock(key), counter).XORKeyStream(out, data)
		return out
	case "RSA-OAEP":
		h := tnKeyHash(key, nil)
		var label []byte
		if l := TnGet(alg, "label"); l != nil && !TnIsNil(l) {
			label = tnSubtleBytes(l)
		}
		if decrypt {
			out, err := rsa.DecryptOAEP(h.New(), nil, key.key.priv.(*rsa.PrivateKey), data, label)
			if err != nil {
				panic(tnDOMError("OperationError", "The operation failed for an operation-specific reason"))
			}
			return out
		}
		out, err := rsa.EncryptOAEP(h.New(), cryptorand.Reader, key.key.pub.(*rsa.PublicKey), data, label)
		if err != nil {
			panic(tnDOMError("OperationError", err.Error()))
		}
		return out
	}
	panic(tnDOMError("NotSupportedError", "Unable to encrypt with "+name))
}

func TnSubtleEncrypt(alg interface{}, key *TnCryptoKey, data interface{}) chan []byte {
	return tnSubtle(func() []byte { return tnSubtleCrypt(alg, key, tnSubtleBytes(data), false) })
}

func TnSubtleDecrypt(alg interface{}, key *TnCryptoKey, data interface{}) chan []byte {
	return tnSubtle(func() []byte { return tnSubtleCrypt(alg, key, tnSubtleBytes(data), true) })
}

func tnSubtleDerive(alg interface{}, key *TnCryptoKey, length interface{}) []byte {
	name := tnSubtleAlg(alg)
	bitsN, hasLength := tnCryptoNumber(length)
	var out []byte
	switch name {
	case "PBKDF2":
		iterations, _ := tnCryptoNumber(TnGet(alg, "iterations"))
		h := tnCryptoHash(tnSubtleHash(TnGet(alg, "hash")))
		k, err := pbkdf2.Key(h.New, string(key.key.secret), tnSubtleBytes(TnGet(alg, "salt")), int(iterations), int(bitsN)/8)
		if err != nil {
			panic(tnDOMError("OperationError", err.Error()))
		}
		return k
	case "HKDF":
		h := tnCryptoHash(tnSubtleHash(TnGet(alg, "hash")))
		k, err := hkdf.Key(h.New, key.key.secret, tnSubtleBytes(TnGet(alg, "salt")), string(tnSubtleBytes(TnGet(alg, "info"))), int(bitsN)/8)
		if err != nil {
			panic(tnDOMError("OperationError", err.Error()))
		}
		return k
	case "ECDH", "X25519":
		pub, _ := TnGet(alg, "public").(*TnCryptoKey)
		if pub == nil {
			panic(tnDOMError("InvalidAccessError", "algorithm.public must be a public CryptoKey"))
		}
		out = tnECDHSecret(key.key.priv, pub.key.pub)
	default:
		panic(tnDOMError("NotSupportedError", "Unable to derive bits with "+name))
	}
	if hasLength && int(bitsN)/8 < len(out) {
		out = out[:int(bitsN)/8]
	}
	return out
}

func TnSubtleDeriveBits(alg interface{}, key *TnCryptoKey, length ...interface{}) chan []byte {
	return tnSubtle(func() []byte { return tnSubtleDerive(alg, key, tnCryptoArg(length)) })
}

func TnSubtleDeriveKey(alg interface{}, key *TnCryptoKey, derived interface{}, extractable bool, usages interface{}) chan *TnCryptoKey {
	return tnSubtle(func() *TnCryptoKey {
		length, ok := tnCryptoLength(derived)
		if !ok && strings.ToUpper(tnAlgName(derived)) == "HMAC" {
			length = tnHMACLength(tnSubtleHash(TnGet(derived, "hash")))
			ok = true
		}
		if !ok {
			panic(tnDOMError("OperationError", "derivedKeyAlgorithm.length is required"))
		}
		raw := tnSubtleDerive(alg, key, length)
		return tnSubtleImport("raw", raw, derived, extractable, usages)
	})
}

// wrapKey / unwrapKey: export + encrypt, decrypt + import
func TnSubtleWrapKey(format string, key *TnCryptoKey, wrapping *TnCryptoKey, alg interface{}) chan []byte {
	return tnSubtle(func() []byte {
		var data []byte
		if format == "jwk" {
			data = []byte(TnJSONStringify(tnSubtleExport(format, key), ""))
		} else {
			data = tnSubtleExport(format, key).([]byte)
		}
		return tnSubtleCrypt(alg, wrapping, data, false)
	})
}

func TnSubtleUnwrapKey(format string, wrapped interface{}, unwrapping *TnCryptoKey, alg interface{}, keyAlg interface{}, extractable bool, usages interface{}) chan *TnCryptoKey {
	return tnSubtle(func() *TnCryptoKey {
		data := tnSubtleCrypt(alg, unwrapping, tnSubtleBytes(wrapped), true)
		var keyData interface{} = data
		if format == "jwk" {
			var parsed interface{}
			if err := json.Unmarshal(data, &parsed); err != nil {
				panic(tnDOMError("DataError", "Invalid JWK data"))
			}
			keyData = parsed
		}
		return tnSubtleImport(format, keyData, keyAlg, extractable, usages)
	})
}`;

// Node-style async crypto calls: (…args, cb(err, result))
function asyncCall(r: NodeRegistry, key: string, goFn: string, result: string): void {
  r.functions[key] = (c: NodeCall) => {
    r.helper('nodeCryptoKeys');
    const cb = c.args[c.args.length - 1];
    const args = c.args.slice(0, c.args.length - 1).join(', ');
    return `tnCryptoAsync(${cb}, func() interface{} { return ${goFn}(${args}) })`;
  };
  r.paramTypers[key] = (_n: any[]) => ['*TnError', result];
}

// Which struct generateKeyPair returns: KeyObjects, PEM strings or DER buffers
function keyPairKind(options: any): string {
  if (!isObjectLiteral(options)) return 'obj';
  const enc = getOption(options, 'publicKeyEncoding') ?? getOption(options, 'privateKeyEncoding');
  if (!enc) return 'obj';
  const format = getOption(enc, 'format');
  if (format && isStringNode(format)) {
    if (format.text === 'pem') return 'pem';
    if (format.text === 'der') return 'der';
  }
  return 'any';
}

const KEY_PAIRS: Record<string, string[]> = {
  obj: ['TnKeyPairOf', '*TnKeyPair', '*TnKeyObject'],
  pem: ['TnKeyPairPemOf', '*TnKeyPairPem', 'string'],
  der: ['TnKeyPairDerOf', '*TnKeyPairDer', '[]byte'],
  any: ['TnKeyPairAnyOf', '*TnKeyPairAny', 'interface{}']
};

// The literal algorithm name of a webcrypto argument ('' when not literal)
function algorithmName(node: any): string {
  if (!node) return '';
  if (isStringNode(node)) return String(node.text).toUpperCase();
  const name = getOption(node, 'name');
  return name && isStringNode(name) ? String(name.text).toUpperCase() : '';
}

const SECRET_ALGORITHMS: Record<string, boolean> = { HMAC: true, 'AES-GCM': true, 'AES-CBC': true, 'AES-CTR': true };

export function registerCryptoKeys(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeCryptoKeys',
    [
      'bytes',
      'crypto',
      'crypto/aes',
      'crypto/cipher',
      'crypto/ecdh',
      'crypto/ecdsa',
      'crypto/ed25519',
      'crypto/elliptic',
      'crypto/hkdf',
      'crypto/hmac',
      'crypto/pbkdf2',
      'crypto/rand',
      'crypto/rsa',
      'crypto/sha1',
      'crypto/sha256',
      'crypto/sha512',
      'crypto/subtle',
      'crypto/x509',
      'crypto/x509/pkix',
      'encoding/asn1',
      'encoding/base64',
      'encoding/binary',
      'encoding/json',
      'encoding/pem',
      'fmt',
      'math/big',
      'math/bits',
      'net',
      'reflect',
      'strings',
      'time'
    ],
    ['nodeCrypto', 'error', 'buffer', 'dynamic', 'eventLoop', 'promise', 'nodeInvoke', 'jsonStringify'],
    cryptoKeysHelper
  );
  const use = () => r.helper('nodeCryptoKeys');
  const fn = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.functions[`crypto.${name}`] = (call: NodeCall) => {
      use();
      return emit(call);
    };
    if (result) r.results[`crypto.${name}`] = result;
  };

  // scrypt and callback forms
  fn('scryptSync', '[]byte', (c: NodeCall) => `TnScryptSync(${c.args.join(', ')})`);
  asyncCall(r, 'crypto.scrypt', 'TnScryptSync', '[]byte');
  asyncCall(r, 'crypto.pbkdf2', 'TnPbkdf2', '[]byte');
  asyncCall(r, 'crypto.hkdf', 'TnHkdf', '[]byte');
  asyncCall(r, 'crypto.randomFill', 'TnRandomFillSync', '[]byte');
  fn('randomFillSync', '[]byte', (c: NodeCall) => `TnRandomFillSync(${c.args.join(', ')})`);
  // randomBytes(n, cb?)
  r.functions['crypto.randomBytes'] = (c: NodeCall) => {
    r.helper('nodeCrypto');
    if (c.args.length < 2) return `TnRandomBytes(${c.args[0]})`;
    use();
    return `tnCryptoAsync(${c.args[1]}, func() interface{} { return TnRandomBytes(${c.args[0]}) })`;
  };
  r.typers['crypto.randomBytes'] = (c: NodeCall) => (c.nodes.length < 2 ? '[]byte' : '');
  r.paramTypers['crypto.randomBytes'] = (_n: any[]) => ['*TnError', '[]byte'];

  // KeyObject
  defineClass(
    r,
    'crypto.KeyObject',
    '*TnKeyObject',
    'class',
    'equals=bool',
    '',
    'type=string; asymmetricKeyType=*string; symmetricKeySize=*float64; asymmetricKeyDetails=*TnKeyDetails',
    ''
  );
  defineClass(r, 'crypto.AsymmetricKeyDetails', '*TnKeyDetails', 'class', '', 'modulusLength=float64; publicExponent=*tnbig.Int; namedCurve=string', '', '');
  r.typers['crypto.KeyObject#export'] = (c: NodeCall) => {
    const options = c.nodes[0];
    if (!options) return '[]byte';
    const format = getOption(options, 'format');
    if (format && isStringNode(format)) {
      if (format.text === 'der') return '[]byte';
      if (format.text === 'jwk') return 'interface{}';
      return 'string';
    }
    return isObjectLiteral(options) ? 'string' : 'interface{}';
  };
  r.methods['crypto.KeyObject#export'] = (c: NodeCall) => {
    const type = r.typers['crypto.KeyObject#export'](c);
    const call = `${c.recv}.export(${c.args.join(', ')})`;
    if (type === 'string') return `tnAsString(${call})`;
    if (type === '[]byte') return `tnAsBytes(${call})`;
    return call;
  };
  fn('createPrivateKey', '*TnKeyObject', (c: NodeCall) => `TnCreatePrivateKey(${c.args[0]})`);
  fn('createPublicKey', '*TnKeyObject', (c: NodeCall) => `TnCreatePublicKey(${c.args[0]})`);
  fn('createSecretKey', '*TnKeyObject', (c: NodeCall) => `TnCreateSecretKey(${c.args.join(', ')})`);
  fn('KeyObject.from', '*TnKeyObject', (c: NodeCall) => `TnKeyObjectFrom(${c.args[0]})`);

  // generateKeyPair(Sync) / generateKey(Sync)
  for (const kind of Object.keys(KEY_PAIRS)) {
    const [, goType, member] = KEY_PAIRS[kind];
    defineClass(r, `crypto.KeyPair_${kind}`, goType, 'class', '', `publicKey=${member}; privateKey=${member}`, '', '');
  }
  r.functions['crypto.generateKeyPairSync'] = (c: NodeCall) => {
    use();
    const [ctor] = KEY_PAIRS[keyPairKind(c.nodes[1])];
    return `${ctor}(TnGenerateKeyPairSync(${c.args.join(', ')}))`;
  };
  r.typers['crypto.generateKeyPairSync'] = (c: NodeCall) => KEY_PAIRS[keyPairKind(c.nodes[1])][1];
  r.functions['crypto.generateKeyPair'] = (c: NodeCall) => {
    use();
    const cb = c.args[c.args.length - 1];
    const options = c.args.length > 2 ? c.args[1] : 'nil';
    return `TnGenerateKeyPair(${c.args[0]}, ${options}, ${cb})`;
  };
  r.paramTypers['crypto.generateKeyPair'] = (nodes: any[]) => {
    const member = KEY_PAIRS[keyPairKind(nodes.length > 2 ? nodes[1] : undefined)][2];
    return ['*TnError', member, member];
  };
  fn('generateKeySync', '*TnKeyObject', (c: NodeCall) => `TnGenerateKeySync(${c.args.join(', ')})`);
  asyncCall(r, 'crypto.generateKey', 'TnGenerateKeySync', '*TnKeyObject');

  // sign / verify
  fn('sign', '[]byte', (c: NodeCall) => `TnSign(${c.args[0]}, ${c.args[1]}, ${c.args[2]})`);
  fn('verify', 'bool', (c: NodeCall) => `TnVerify(${c.args[0]}, ${c.args[1]}, ${c.args[2]}, ${c.args[3]})`);
  defineClass(r, 'crypto.Sign', '*TnSigner', 'class', 'update=*TnSigner; verify=bool', '', '', '');
  r.classes['crypto.Verify'] = r.classes['crypto.Sign'];
  fn('createSign', '*TnSigner', (c: NodeCall) => `TnCreateSign(${c.args.join(', ')})`);
  fn('createVerify', '*TnSigner', (c: NodeCall) => `TnCreateSign(${c.args.join(', ')})`);
  r.methods['crypto.Sign#sign'] = (c: NodeCall) =>
    c.args.length > 1 ? `${c.recv}.signString(${c.args[0]}, ${c.args[1]})` : `${c.recv}.sign(${c.args[0]})`;
  r.typers['crypto.Sign#sign'] = (c: NodeCall) => (c.nodes.length > 1 ? 'string' : '[]byte');

  // RSA encryption
  fn('publicEncrypt', '[]byte', (c: NodeCall) => `TnPublicEncrypt(${c.args[0]}, ${c.args[1]})`);
  fn('privateDecrypt', '[]byte', (c: NodeCall) => `TnPrivateDecrypt(${c.args[0]}, ${c.args[1]})`);
  fn('privateEncrypt', '[]byte', (c: NodeCall) => `TnPrivateEncrypt(${c.args[0]}, ${c.args[1]})`);
  fn('publicDecrypt', '[]byte', (c: NodeCall) => `TnPublicDecrypt(${c.args[0]}, ${c.args[1]})`);
  const constants: Record<string, number> = {
    RSA_PKCS1_PADDING: 1,
    RSA_NO_PADDING: 3,
    RSA_PKCS1_OAEP_PADDING: 4,
    RSA_PKCS1_PSS_PADDING: 6,
    RSA_PSS_SALTLEN_DIGEST: -1,
    RSA_PSS_SALTLEN_MAX_SIGN: -2,
    RSA_PSS_SALTLEN_AUTO: -2
  };
  r.objects['crypto.constants'] = true;
  for (const name of Object.keys(constants)) {
    const value = constants[name];
    r.values[`crypto.constants.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`crypto.constants.${name}`] = 'float64';
  }

  // ECDH / Diffie-Hellman
  // Methods with an optional output encoding return strings when it is given
  const encoded = (cls: string, method: string, encIndex: number) => {
    r.methods[`${cls}#${method}`] = (c: NodeCall) => {
      const call = `${c.recv}.${method}(${c.args.join(', ')})`;
      return c.args.length > encIndex ? `tnAsString(${call})` : `tnAsBytes(${call})`;
    };
    r.typers[`${cls}#${method}`] = (c: NodeCall) => (c.nodes.length > encIndex ? 'string' : '[]byte');
  };
  defineClass(r, 'crypto.ECDH', '*TnECDH', 'class', 'setPrivateKey=', '', '', '');
  for (const m of ['generateKeys', 'getPublicKey', 'getPrivateKey']) encoded('crypto.ECDH', m, 0);
  encoded('crypto.ECDH', 'computeSecret', 2);
  fn('createECDH', '*TnECDH', (c: NodeCall) => `TnCreateECDH(${c.args[0]})`);
  fn('getCurves', '[]string', (_c: NodeCall) => 'TnGetCurves()');
  fn('diffieHellman', '[]byte', (c: NodeCall) => `TnDiffieHellman(${c.args[0]})`);
  defineClass(r, 'crypto.DiffieHellman', '*TnDiffieHellmanGroup', 'class', 'setPublicKey=; setPrivateKey=', '', 'verifyError=float64', '');
  r.classes['crypto.DiffieHellmanGroup'] = r.classes['crypto.DiffieHellman'];
  for (const m of ['generateKeys', 'getPrime', 'getGenerator', 'getPublicKey', 'getPrivateKey']) encoded('crypto.DiffieHellman', m, 0);
  encoded('crypto.DiffieHellman', 'computeSecret', 2);
  fn('createDiffieHellman', '*TnDiffieHellmanGroup', (c: NodeCall) => `TnCreateDiffieHellman(${c.args.join(', ')})`);
  fn('getDiffieHellman', '*TnDiffieHellmanGroup', (c: NodeCall) => `TnGetDiffieHellman(${c.args[0]})`);
  fn('createDiffieHellmanGroup', '*TnDiffieHellmanGroup', (c: NodeCall) => `TnGetDiffieHellman(${c.args[0]})`);

  // Primes: ArrayBuffers, or bigints with { bigint: true }
  const primeIsBig = (options: any) => !!options && optionIsTrue(options, 'bigint');
  r.functions['crypto.generatePrimeSync'] = (c: NodeCall) => {
    use();
    return primeIsBig(c.nodes[1]) ? `TnGeneratePrimeBig(${c.args.join(', ')})` : `TnGeneratePrimeBytes(${c.args.join(', ')})`;
  };
  r.typers['crypto.generatePrimeSync'] = (c: NodeCall) => (primeIsBig(c.nodes[1]) ? '*tnbig.Int' : '[]byte');
  r.functions['crypto.generatePrime'] = (c: NodeCall) => {
    use();
    const cb = c.args[c.args.length - 1];
    const args = c.args.slice(0, c.args.length - 1).join(', ');
    const goFn = c.nodes.length > 2 && primeIsBig(c.nodes[1]) ? 'TnGeneratePrimeBig' : 'TnGeneratePrimeBytes';
    return `tnCryptoAsync(${cb}, func() interface{} { return ${goFn}(${args}) })`;
  };
  r.paramTypers['crypto.generatePrime'] = (nodes: any[]) => ['*TnError', nodes.length > 2 && primeIsBig(nodes[1]) ? '*tnbig.Int' : '[]byte'];
  fn('checkPrimeSync', 'bool', (c: NodeCall) => `TnCheckPrimeSync(${c.args.join(', ')})`);
  asyncCall(r, 'crypto.checkPrime', 'TnCheckPrimeSync', 'bool');

  // X509Certificate
  defineClass(
    r,
    'crypto.X509Certificate',
    '*TnX509Certificate',
    'class',
    'checkHost=*string; checkIP=*string; checkEmail=*string; checkIssued=bool; verify=bool; toString=string; toJSON=string; toLegacyObject=map[string]interface{}',
    '',
    'subject=string; issuer=string; subjectAltName=*string; validFrom=string; validTo=string; validFromDate=time.Time; validToDate=time.Time; fingerprint=string; fingerprint256=string; fingerprint512=string; serialNumber=string; ca=bool; raw=[]byte; publicKey=*TnKeyObject; keyUsage=[]string',
    ''
  );
  r.constructors['crypto.X509Certificate'] = (c: NodeCall) => {
    use();
    return `TnNewX509Certificate(${c.args[0]})`;
  };

  // webcrypto: crypto.subtle (also crypto.webcrypto.subtle and the global crypto)
  defineClass(r, 'crypto.CryptoKey', '*TnCryptoKey', 'class', '', '', 'type=string; extractable=bool; algorithm=*TnKeyAlgorithm; usages=[]string', '');
  defineClass(
    r,
    'crypto.KeyAlgorithm',
    '*TnKeyAlgorithm',
    'class',
    '',
    'name=string; length=float64; hash=*TnKeyAlgorithm; namedCurve=string; modulusLength=float64; publicExponent=[]byte',
    '',
    ''
  );
  r.globals['CryptoKey'] = 'crypto.CryptoKey';
  defineClass(r, 'crypto.CryptoKeyPair', '*TnCryptoKeyPair', 'class', '', 'publicKey=*TnCryptoKey; privateKey=*TnCryptoKey', '', '');
  r.objects['crypto.subtle'] = true;
  const subtle = (name: string, result: string, emit: (c: NodeCall) => string) => {
    r.functions[`crypto.subtle.${name}`] = (c: NodeCall) => {
      use();
      return emit(c);
    };
    if (result) r.results[`crypto.subtle.${name}`] = result;
  };
  subtle('digest', 'chan []byte', (c: NodeCall) => `TnSubtleDigest(${c.args.join(', ')})`);
  subtle('generateKey', '', (c: NodeCall) => {
    const name = algorithmName(c.nodes[0]);
    if (!name) return `TnSubtleGenerateAny(${c.args.join(', ')})`;
    return SECRET_ALGORITHMS[name] ? `TnSubtleGenerateKey(${c.args.join(', ')})` : `TnSubtleGenerateKeyPair(${c.args.join(', ')})`;
  });
  r.typers['crypto.subtle.generateKey'] = (c: NodeCall) => {
    const name = algorithmName(c.nodes[0]);
    if (!name) return 'chan interface{}';
    return SECRET_ALGORITHMS[name] ? 'chan *TnCryptoKey' : 'chan *TnCryptoKeyPair';
  };
  subtle('importKey', 'chan *TnCryptoKey', (c: NodeCall) => `TnSubtleImportKey(${c.args.join(', ')})`);
  const formatIsJwk = (node: any) => !(node && isStringNode(node) && node.text !== 'jwk');
  subtle('exportKey', '', (c: NodeCall) =>
    formatIsJwk(c.nodes[0]) ? `TnSubtleExportAny(${c.args.join(', ')})` : `TnSubtleExportKey(${c.args.join(', ')})`
  );
  r.typers['crypto.subtle.exportKey'] = (c: NodeCall) => (formatIsJwk(c.nodes[0]) ? 'chan interface{}' : 'chan []byte');
  subtle('sign', 'chan []byte', (c: NodeCall) => `TnSubtleSign(${c.args.join(', ')})`);
  subtle('verify', 'chan bool', (c: NodeCall) => `TnSubtleVerify(${c.args.join(', ')})`);
  subtle('encrypt', 'chan []byte', (c: NodeCall) => `TnSubtleEncrypt(${c.args.join(', ')})`);
  subtle('decrypt', 'chan []byte', (c: NodeCall) => `TnSubtleDecrypt(${c.args.join(', ')})`);
  subtle('deriveBits', 'chan []byte', (c: NodeCall) => `TnSubtleDeriveBits(${c.args.join(', ')})`);
  subtle('deriveKey', 'chan *TnCryptoKey', (c: NodeCall) => `TnSubtleDeriveKey(${c.args.join(', ')})`);
  subtle('wrapKey', 'chan []byte', (c: NodeCall) => `TnSubtleWrapKey(${c.args.join(', ')})`);
  subtle('unwrapKey', 'chan *TnCryptoKey', (c: NodeCall) => `TnSubtleUnwrapKey(${c.args.join(', ')})`);
}
