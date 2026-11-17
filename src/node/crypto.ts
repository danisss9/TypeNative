// node:crypto (+ the global crypto): hashes / HMAC (md5, sha1, sha2, sha3),
// random bytes / UUIDs / ints, timingSafeEqual, PBKDF2 / HKDF, AES ciphers
// (cbc / ctr / gcm, SIV / GCM-SIV) and MACs (hmac, KMAC, CMAC, GMAC,
// Poly1305, SipHash, BLAKE2). Backed by Go's crypto packages.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { streamListenerTypes } from './stream.js';

const cryptoHelper = `// node:crypto
func tnHashFactory(alg string) func() hash.Hash {
	switch strings.ToLower(alg) {
	case "md5":
		return md5.New
	case "sha1", "sha-1":
		return sha1.New
	case "sha224", "sha-224":
		return sha256.New224
	case "sha256", "sha-256":
		return sha256.New
	case "sha384", "sha-384":
		return sha512.New384
	case "sha512", "sha-512":
		return sha512.New
	case "sha512-224":
		return sha512.New512_224
	case "sha512-256":
		return sha512.New512_256
	case "sha3-224":
		return func() hash.Hash { return sha3.New224() }
	case "sha3-256":
		return func() hash.Hash { return sha3.New256() }
	case "sha3-384":
		return func() hash.Hash { return sha3.New384() }
	case "sha3-512":
		return func() hash.Hash { return sha3.New512() }
	}
	panic(TnNodeError("Error", "ERR_OSSL_EVP_UNSUPPORTED", "Digest method not supported"))
}

func TnGetHashes() []string {
	return []string{"md5", "sha1", "sha224", "sha256", "sha3-224", "sha3-256", "sha3-384", "sha3-512", "sha384", "sha512", "sha512-224", "sha512-256"}
}

// Hash and Hmac objects (createHash / createHmac)
type TnHash struct {
	h         hash.Hash
	alg       string
	finalized bool
	hmac      bool
	// set when the hash is used as a stream (hashStream)
	stream interface{}
}

func TnCreateHash(alg string, options ...interface{}) *TnHash {
	return &TnHash{h: tnHashFactory(alg)(), alg: alg}
}

func TnCreateHmac(alg string, key interface{}, options ...interface{}) *TnHash {
	return &TnHash{h: hmac.New(tnHashFactory(alg), tnCryptoBytes(key, "")), alg: alg, hmac: true}
}

// Bytes of data passed to crypto APIs: strings in an encoding (utf8 by default) or Buffers
func tnCryptoBytes(v interface{}, enc string) []byte {
	switch x := v.(type) {
	case string:
		return TnBufferFromString(x, enc)
	case []byte:
		return x
	}
	return TnBufferFrom(v, enc)
}

func (h *TnHash) update(data interface{}, enc ...string) *TnHash {
	if h.finalized {
		panic(TnNodeError("Error", "ERR_CRYPTO_HASH_FINALIZED", "Digest already called"))
	}
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	h.h.Write(tnCryptoBytes(data, e))
	return h
}

func (h *TnHash) digestBytes() []byte {
	// a second hmac.digest() is empty; a second hash.digest() throws
	if h.finalized && h.hmac {
		return []byte{}
	}
	if h.finalized {
		panic(TnNodeError("Error", "ERR_CRYPTO_HASH_FINALIZED", "Digest already called"))
	}
	h.finalized = true
	return h.h.Sum(nil)
}

func (h *TnHash) digest() []byte { return h.digestBytes() }

func (h *TnHash) digestString(enc string) string { return TnBufferToString(h.digestBytes(), enc) }

// hash.copy(): the state so far, as an independent Hash
func (h *TnHash) copy() *TnHash {
	m, ok := h.h.(encoding.BinaryMarshaler)
	if !ok {
		panic(TnNodeError("Error", "ERR_CRYPTO_HASH_FINALIZED", "Digest already called"))
	}
	state, err := m.MarshalBinary()
	if err != nil {
		panic(err)
	}
	clone := tnHashFactory(h.alg)()
	clone.(encoding.BinaryUnmarshaler).UnmarshalBinary(state)
	return &TnHash{h: clone, alg: h.alg}
}

// crypto.hash(algorithm, data, outputEncoding = "hex")
func TnHashOnce(alg string, data interface{}, enc ...string) string {
	out := "hex"
	if len(enc) > 0 && enc[0] != "" {
		out = enc[0]
	}
	h := tnHashFactory(alg)()
	h.Write(tnCryptoBytes(data, ""))
	return TnBufferToString(h.Sum(nil), out)
}

func TnRandomBytes(n float64) []byte {
	b := make([]byte, int(n))
	if _, err := cryptorand.Read(b); err != nil {
		panic(err)
	}
	return b
}

func TnRandomUUID() string {
	b := TnRandomBytes(16)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	h := hex.EncodeToString(b)
	return h[0:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:32]
}

// randomInt([min,] max): min <= n < max
func TnRandomInt(a float64, b ...float64) float64 {
	min, max := 0.0, a
	if len(b) > 0 {
		min, max = a, b[0]
	}
	if max <= min {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"max\\" is out of range. It must be greater than the value of \\"min\\" ("+TnNumStr(min)+"). Received "+TnNumStr(max)))
	}
	n, err := cryptorand.Int(cryptorand.Reader, tnbig.NewInt(int64(max-min)))
	if err != nil {
		panic(err)
	}
	return min + float64(n.Int64())
}

func TnGetRandomValues(b []byte) []byte {
	if _, err := cryptorand.Read(b); err != nil {
		panic(err)
	}
	return b
}

func TnTimingSafeEqual(a []byte, b []byte) bool {
	if len(a) != len(b) {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH", "Input buffers must have the same byte length"))
	}
	return subtle.ConstantTimeCompare(a, b) == 1
}

func TnPbkdf2(password interface{}, salt interface{}, iterations float64, keylen float64, digest string) []byte {
	key, err := pbkdf2.Key(tnHashFactory(digest), string(tnCryptoBytes(password, "")), tnCryptoBytes(salt, ""), int(iterations), int(keylen))
	if err != nil {
		panic(TnNodeError("Error", "ERR_CRYPTO_INVALID_KEYLEN", err.Error()))
	}
	return key
}

func TnHkdf(digest string, ikm interface{}, salt interface{}, info interface{}, keylen float64) []byte {
	key, err := hkdf.Key(tnHashFactory(digest), tnCryptoBytes(ikm, ""), tnCryptoBytes(salt, ""), string(tnCryptoBytes(info, "")), int(keylen))
	if err != nil {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", err.Error()))
	}
	return key
}

// Ciphers: aes-{128,192,256}-{cbc,ctr,gcm}; GCM authenticates on final()
type TnCipher struct {
	decrypt     bool
	mode        string
	block       cipher.Block
	stream      cipher.Stream
	cbc         cipher.BlockMode
	aead        cipher.AEAD
	iv          []byte
	pending     []byte
	aad         []byte
	authTag     []byte
	autoPadding bool
	finalized   bool
	wrapped     bool
	// SIV / GCM-SIV: AAD components, one update() only
	aads       [][]byte
	updated    bool
	authFailed bool
}

func TnGetCiphers() []string {
	return []string{"aes-128-cbc", "aes-128-ctr", "aes-128-gcm", "aes-128-gcm-siv", "aes-128-siv", "aes-192-cbc", "aes-192-ctr", "aes-192-gcm", "aes-192-gcm-siv", "aes-192-siv",
		"aes-256-cbc", "aes-256-ctr", "aes-256-gcm", "aes-256-gcm-siv", "aes-256-siv",
		"aes128-wrap", "aes128-wrap-pad", "aes192-wrap", "aes192-wrap-pad", "aes256-wrap", "aes256-wrap-pad",
		"id-aes128-wrap", "id-aes128-wrap-pad", "id-aes192-wrap", "id-aes192-wrap-pad", "id-aes256-wrap", "id-aes256-wrap-pad"}
}

// AES key wrap (RFC 3394) and key wrap with padding (RFC 5649): the whole
// input goes through one update(), as with OpenSSL
func tnAESWrapRounds(block cipher.Block, a []byte, r [][]byte) []byte {
	n := len(r)
	buf := make([]byte, 16)
	for j := 0; j <= 5; j++ {
		for i := 1; i <= n; i++ {
			copy(buf, a)
			copy(buf[8:], r[i-1])
			block.Encrypt(buf, buf)
			t := uint64(n*j + i)
			for k := 0; k < 8; k++ {
				a[k] = buf[k] ^ byte(t>>(56-8*k))
			}
			copy(r[i-1], buf[8:])
		}
	}
	out := append([]byte{}, a...)
	for _, b := range r {
		out = append(out, b...)
	}
	return out
}

func tnAESUnwrapRounds(block cipher.Block, data []byte) ([]byte, []byte) {
	n := len(data)/8 - 1
	a := append([]byte{}, data[:8]...)
	r := make([][]byte, n)
	for i := range r {
		r[i] = append([]byte{}, data[8*(i+1):8*(i+2)]...)
	}
	buf := make([]byte, 16)
	for j := 5; j >= 0; j-- {
		for i := n; i >= 1; i-- {
			t := uint64(n*j + i)
			for k := 0; k < 8; k++ {
				buf[k] = a[k] ^ byte(t>>(56-8*k))
			}
			copy(buf[8:], r[i-1])
			block.Decrypt(buf, buf)
			copy(a, buf[:8])
			copy(r[i-1], buf[8:])
		}
	}
	plain := []byte{}
	for _, b := range r {
		plain = append(plain, b...)
	}
	return a, plain
}

func tnWrapState() *TnError {
	return TnNodeError("Error", "", "Trying to add data in unsupported state")
}

func (c *TnCipher) keyWrap(data []byte) []byte {
	if c.wrapped {
		panic(tnWrapState())
	}
	c.wrapped = true
	padded := c.mode == "wrap-pad"
	if !c.decrypt {
		if padded {
			aiv := append(append([]byte{}, c.iv...), byte(len(data)>>24), byte(len(data)>>16), byte(len(data)>>8), byte(len(data)))
			plain := append(append([]byte{}, data...), make([]byte, (8-len(data)%8)%8)...)
			if len(plain) == 8 {
				out := make([]byte, 16)
				c.block.Encrypt(out, append(aiv, plain...))
				return out
			}
			data = plain
			c.iv = aiv
		} else if len(data) < 16 || len(data)%8 != 0 {
			panic(tnWrapState())
		}
		r := make([][]byte, len(data)/8)
		for i := range r {
			r[i] = append([]byte{}, data[8*i:8*i+8]...)
		}
		return tnAESWrapRounds(c.block, append([]byte{}, c.iv...), r)
	}
	if len(data) < 16 || len(data)%8 != 0 {
		panic(tnWrapState())
	}
	var a, plain []byte
	if padded && len(data) == 16 {
		buf := make([]byte, 16)
		c.block.Decrypt(buf, data)
		a, plain = buf[:8], buf[8:]
	} else {
		a, plain = tnAESUnwrapRounds(c.block, data)
	}
	if !padded {
		if subtle.ConstantTimeCompare(a, c.iv) != 1 {
			panic(tnWrapState())
		}
		return plain
	}
	size := int(a[4])<<24 | int(a[5])<<16 | int(a[6])<<8 | int(a[7])
	if subtle.ConstantTimeCompare(a[:4], c.iv) != 1 || size > len(plain) || size <= len(plain)-8 {
		panic(tnWrapState())
	}
	for _, b := range plain[size:] {
		if b != 0 {
			panic(tnWrapState())
		}
	}
	return plain[:size]
}

// aes128-wrap / id-aes256-wrap-pad / …
func tnCreateWrapCipher(alg string, key interface{}, iv interface{}, decrypt bool) *TnCipher {
	name := strings.TrimPrefix(strings.ToLower(alg), "id-")
	mode := "wrap"
	if strings.HasSuffix(name, "-wrap-pad") {
		mode = "wrap-pad"
	}
	bits := strings.TrimSuffix(strings.TrimSuffix(strings.TrimPrefix(name, "aes"), "-pad"), "-wrap")
	k := tnCryptoBytes(key, "")
	if strconv.Itoa(len(k)*8) != bits {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", "Invalid key length"))
	}
	block, err := aes.NewCipher(k)
	if err != nil {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", "Invalid key length"))
	}
	ivBytes := []byte{0xA6, 0xA6, 0xA6, 0xA6, 0xA6, 0xA6, 0xA6, 0xA6}
	if mode == "wrap-pad" {
		ivBytes = []byte{0xA6, 0x59, 0x59, 0xA6}
	}
	if iv != nil && !TnIsNil(iv) {
		ivBytes = tnCryptoBytes(iv, "")
	}
	if len(ivBytes) != 8 && mode == "wrap" || len(ivBytes) != 4 && mode == "wrap-pad" {
		panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_IV", "Invalid initialization vector"))
	}
	return &TnCipher{decrypt: decrypt, mode: mode, block: block, iv: ivBytes}
}

func TnCreateCipher(alg string, key interface{}, iv interface{}, decrypt bool, options ...interface{}) *TnCipher {
	if strings.Contains(strings.ToLower(alg), "-wrap") {
		return tnCreateWrapCipher(alg, key, iv, decrypt)
	}
	parts := strings.Split(strings.ToLower(alg), "-")
	if len(parts) < 3 || parts[0] != "aes" {
		panic(TnNodeError("Error", "ERR_CRYPTO_UNKNOWN_CIPHER", "Unknown cipher"))
	}
	mode := strings.Join(parts[2:], "-")
	k := tnCryptoBytes(key, "")
	keyBits := len(k) * 8
	// AES-SIV takes two AES keys: one for S2V (CMAC), one for CTR
	if mode == "siv" {
		keyBits /= 2
	}
	if strconv.Itoa(keyBits) != parts[1] || mode == "siv" && len(k)%2 != 0 {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", "Invalid key length"))
	}
	var ivBytes []byte
	if iv != nil && !TnIsNil(iv) {
		ivBytes = tnCryptoBytes(iv, "")
	}
	switch mode {
	case "siv":
		if len(ivBytes) != 0 {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_IV", "Invalid initialization vector"))
		}
		return &TnCipher{decrypt: decrypt, mode: mode, pending: k}
	case "gcm-siv":
		if len(ivBytes) != 12 {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_IV", "Invalid initialization vector"))
		}
		return &TnCipher{decrypt: decrypt, mode: mode, pending: k, iv: ivBytes}
	}
	block, err := aes.NewCipher(k)
	if err != nil {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", "Invalid key length"))
	}
	c := &TnCipher{decrypt: decrypt, mode: mode, block: block, iv: ivBytes, autoPadding: true}
	switch c.mode {
	case "cbc":
		if len(c.iv) != aes.BlockSize {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_IV", "Invalid initialization vector"))
		}
		if decrypt {
			c.cbc = cipher.NewCBCDecrypter(block, c.iv)
		} else {
			c.cbc = cipher.NewCBCEncrypter(block, c.iv)
		}
	case "ctr":
		if len(c.iv) != aes.BlockSize {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_IV", "Invalid initialization vector"))
		}
		c.stream = cipher.NewCTR(block, c.iv)
	case "gcm":
		aead, err := cipher.NewGCMWithNonceSize(block, len(c.iv))
		if err != nil {
			panic(TnNodeError("TypeError", "ERR_CRYPTO_INVALID_IV", "Invalid initialization vector"))
		}
		c.aead = aead
	default:
		panic(TnNodeError("Error", "ERR_CRYPTO_UNKNOWN_CIPHER", "Unknown cipher"))
	}
	return c
}

func (c *TnCipher) process(data []byte) []byte {
	switch c.mode {
	case "wrap", "wrap-pad":
		return c.keyWrap(data)
	case "siv", "gcm-siv":
		return c.sivUpdate(data)
	case "ctr":
		out := make([]byte, len(data))
		c.stream.XORKeyStream(out, data)
		return out
	case "gcm":
		c.pending = append(c.pending, data...)
		return []byte{}
	}
	c.pending = append(c.pending, data...)
	n := len(c.pending) / aes.BlockSize * aes.BlockSize
	// Decryption keeps the last block back: it carries the padding
	if c.decrypt && c.autoPadding && n == len(c.pending) && n > 0 {
		n -= aes.BlockSize
	}
	out := make([]byte, n)
	c.cbc.CryptBlocks(out, c.pending[:n])
	c.pending = c.pending[n:]
	return out
}

func (c *TnCipher) finish() []byte {
	if c.finalized {
		panic(TnNodeError("Error", "ERR_CRYPTO_INVALID_STATE", "Unsupported state"))
	}
	c.finalized = true
	switch c.mode {
	case "ctr", "wrap", "wrap-pad":
		return []byte{}
	case "siv", "gcm-siv":
		return c.sivFinal()
	case "gcm":
		if c.decrypt {
			out, err := c.aead.Open(nil, c.iv, append(append([]byte{}, c.pending...), c.authTag...), c.aad)
			if err != nil {
				panic(TnNodeError("Error", "", "Unsupported state or unable to authenticate data"))
			}
			return out
		}
		sealed := c.aead.Seal(nil, c.iv, c.pending, c.aad)
		tagStart := len(sealed) - c.aead.Overhead()
		c.authTag = sealed[tagStart:]
		return sealed[:tagStart]
	}
	if c.decrypt {
		if len(c.pending) != aes.BlockSize && c.autoPadding {
			panic(TnNodeError("Error", "ERR_OSSL_WRONG_FINAL_BLOCK_LENGTH", "wrong final block length"))
		}
		if len(c.pending) == 0 {
			return []byte{}
		}
		out := make([]byte, len(c.pending))
		c.cbc.CryptBlocks(out, c.pending)
		if !c.autoPadding {
			return out
		}
		pad := int(out[len(out)-1])
		if pad == 0 || pad > aes.BlockSize {
			panic(TnNodeError("Error", "ERR_OSSL_BAD_DECRYPT", "bad decrypt"))
		}
		return out[:len(out)-pad]
	}
	if !c.autoPadding {
		if len(c.pending)%aes.BlockSize != 0 {
			panic(TnNodeError("Error", "ERR_OSSL_WRONG_FINAL_BLOCK_LENGTH", "data not multiple of block length"))
		}
		out := make([]byte, len(c.pending))
		c.cbc.CryptBlocks(out, c.pending)
		return out
	}
	pad := aes.BlockSize - len(c.pending)%aes.BlockSize
	padded := append(append([]byte{}, c.pending...), bytes.Repeat([]byte{byte(pad)}, pad)...)
	out := make([]byte, len(padded))
	c.cbc.CryptBlocks(out, padded)
	return out
}

// AES-CMAC (RFC 4493)
func tnCmac(block cipher.Block, msg []byte) []byte {
	shift := func(in []byte) []byte {
		out := make([]byte, 16)
		carry := byte(0)
		for i := 15; i >= 0; i-- {
			out[i] = in[i]<<1 | carry
			carry = in[i] >> 7
		}
		if in[0]&0x80 != 0 {
			out[15] ^= 0x87
		}
		return out
	}
	l := make([]byte, 16)
	block.Encrypt(l, l)
	k1 := shift(l)
	k2 := shift(k1)
	n := (len(msg) + 15) / 16
	complete := n > 0 && len(msg)%16 == 0
	if n == 0 {
		n = 1
	}
	last := make([]byte, 16)
	if complete {
		copy(last, msg[(n-1)*16:])
		for i := range last {
			last[i] ^= k1[i]
		}
	} else {
		rest := msg[(n-1)*16:]
		copy(last, rest)
		last[len(rest)] = 0x80
		for i := range last {
			last[i] ^= k2[i]
		}
	}
	x := make([]byte, 16)
	for i := 0; i < n-1; i++ {
		for j := 0; j < 16; j++ {
			x[j] ^= msg[i*16+j]
		}
		block.Encrypt(x, x)
	}
	for j := 0; j < 16; j++ {
		x[j] ^= last[j]
	}
	block.Encrypt(x, x)
	return x
}

// AES-SIV (RFC 5297): S2V over AES-CMAC, then CTR
func tnDbl(d []byte) []byte {
	out := make([]byte, 16)
	carry := byte(0)
	for i := 15; i >= 0; i-- {
		out[i] = d[i]<<1 | carry
		carry = d[i] >> 7
	}
	if d[0]&0x80 != 0 {
		out[15] ^= 0x87
	}
	return out
}

func tnS2V(block cipher.Block, aads [][]byte, plain []byte) []byte {
	d := tnCmac(block, make([]byte, 16))
	for _, a := range aads {
		c := tnCmac(block, a)
		d = tnDbl(d)
		subtle.XORBytes(d, d, c)
	}
	var t []byte
	if len(plain) >= 16 {
		t = append([]byte{}, plain...)
		subtle.XORBytes(t[len(t)-16:], t[len(t)-16:], d)
	} else {
		t = make([]byte, 16)
		copy(t, plain)
		t[len(plain)] = 0x80
		subtle.XORBytes(t, t, tnDbl(d))
	}
	return tnCmac(block, t)
}

func tnSIVCtr(block cipher.Block, v []byte, data []byte) []byte {
	q := append([]byte{}, v...)
	q[8] &= 0x7f
	q[12] &= 0x7f
	out := make([]byte, len(data))
	cipher.NewCTR(block, q).XORKeyStream(out, data)
	return out
}

func tnReverse(b []byte) []byte {
	out := make([]byte, len(b))
	for i := range b {
		out[len(b)-1-i] = b[i]
	}
	return out
}

// AES-GCM-SIV (RFC 8452): POLYVAL, computed through GHASH's bit-reflected field
func tnGFMul(x, y [2]uint64) [2]uint64 {
	var z [2]uint64
	v := y
	for i := 0; i < 128; i++ {
		word := x[i/64]
		if word>>(63-uint(i%64))&1 == 1 {
			z[0] ^= v[0]
			z[1] ^= v[1]
		}
		lsb := v[1] & 1
		v[1] = v[1]>>1 | v[0]<<63
		v[0] >>= 1
		if lsb == 1 {
			v[0] ^= 0xe1 << 56
		}
	}
	return z
}

func tnBE128(b []byte) [2]uint64 {
	return [2]uint64{binary.BigEndian.Uint64(b), binary.BigEndian.Uint64(b[8:])}
}

func tnPolyval(h []byte, data []byte) []byte {
	hr := tnBE128(tnReverse(h))
	// mulX in GHASH's field
	lsb := hr[1] & 1
	hr[1] = hr[1]>>1 | hr[0]<<63
	hr[0] >>= 1
	if lsb == 1 {
		hr[0] ^= 0xe1 << 56
	}
	var s [2]uint64
	for i := 0; i < len(data); i += 16 {
		x := tnBE128(tnReverse(data[i : i+16]))
		s[0] ^= x[0]
		s[1] ^= x[1]
		s = tnGFMul(s, hr)
	}
	out := make([]byte, 16)
	binary.BigEndian.PutUint64(out, s[0])
	binary.BigEndian.PutUint64(out[8:], s[1])
	return tnReverse(out)
}

func tnPad16(b []byte) []byte {
	out := append([]byte{}, b...)
	for len(out)%16 != 0 {
		out = append(out, 0)
	}
	return out
}

func tnGCMSIVKeys(key, nonce []byte) ([]byte, cipher.Block) {
	kb, _ := aes.NewCipher(key)
	derive := func(i uint32) []byte {
		in := make([]byte, 16)
		binary.LittleEndian.PutUint32(in, i)
		copy(in[4:], nonce)
		out := make([]byte, 16)
		kb.Encrypt(out, in)
		return out[:8]
	}
	auth := append(derive(0), derive(1)...)
	enc := []byte{}
	for i := uint32(2); len(enc) < len(key); i++ {
		enc = append(enc, derive(i)...)
	}
	eb, _ := aes.NewCipher(enc)
	return auth, eb
}

func tnGCMSIVTag(auth []byte, eb cipher.Block, nonce, aad, plain []byte) []byte {
	lengths := make([]byte, 16)
	binary.LittleEndian.PutUint64(lengths, uint64(len(aad))*8)
	binary.LittleEndian.PutUint64(lengths[8:], uint64(len(plain))*8)
	input := append(append(tnPad16(aad), tnPad16(plain)...), lengths...)
	s := tnPolyval(auth, input)
	for i := 0; i < 12; i++ {
		s[i] ^= nonce[i]
	}
	s[15] &= 0x7f
	tag := make([]byte, 16)
	eb.Encrypt(tag, s)
	return tag
}

func tnGCMSIVCtr(eb cipher.Block, tag, data []byte) []byte {
	ctr := append([]byte{}, tag...)
	ctr[15] |= 0x80
	out := make([]byte, len(data))
	ks := make([]byte, 16)
	for i := 0; i < len(data); i += 16 {
		eb.Encrypt(ks, ctr)
		end := i + 16
		if end > len(data) {
			end = len(data)
		}
		subtle.XORBytes(out[i:end], data[i:end], ks)
		binary.LittleEndian.PutUint32(ctr, binary.LittleEndian.Uint32(ctr)+1)
	}
	return out
}

// AES-SIV / AES-GCM-SIV take the whole message in one update(), as with
// OpenSSL; decryption reports a bad tag from final()
func (c *TnCipher) sivUpdate(data []byte) []byte {
	if c.updated {
		panic(TnNodeError("Error", "", "Trying to add data in unsupported state"))
	}
	c.updated = true
	key := c.pending
	if c.mode == "siv" {
		half := len(key) / 2
		mac, _ := aes.NewCipher(key[:half])
		ctr, _ := aes.NewCipher(key[half:])
		if !c.decrypt {
			c.authTag = tnS2V(mac, c.aads, data)
			return tnSIVCtr(ctr, c.authTag, data)
		}
		plain := []byte{}
		if len(c.authTag) == 16 {
			plain = tnSIVCtr(ctr, c.authTag, data)
		}
		if len(c.authTag) != 16 || subtle.ConstantTimeCompare(tnS2V(mac, c.aads, plain), c.authTag) != 1 {
			c.authFailed = true
			return []byte{}
		}
		return plain
	}
	auth, enc := tnGCMSIVKeys(key, c.iv)
	if !c.decrypt {
		c.authTag = tnGCMSIVTag(auth, enc, c.iv, c.aad, data)
		return tnGCMSIVCtr(enc, c.authTag, data)
	}
	if len(c.authTag) != 16 {
		c.authFailed = true
		return []byte{}
	}
	plain := tnGCMSIVCtr(enc, c.authTag, data)
	c.authFailed = subtle.ConstantTimeCompare(tnGCMSIVTag(auth, enc, c.iv, c.aad, plain), c.authTag) != 1
	return plain
}

func (c *TnCipher) sivFinal() []byte {
	if !c.updated {
		if c.mode == "siv" {
			panic(TnNodeError("Error", "", "Unsupported state or unable to authenticate data"))
		}
		c.sivUpdate([]byte{})
	}
	if c.authFailed {
		panic(TnNodeError("Error", "", "Unsupported state or unable to authenticate data"))
	}
	return []byte{}
}

func (c *TnCipher) update(data interface{}, inputEncoding ...string) []byte {
	enc := ""
	if len(inputEncoding) > 0 {
		enc = inputEncoding[0]
	}
	return c.process(tnCryptoBytes(data, enc))
}

func (c *TnCipher) updateString(data interface{}, inputEncoding string, outputEncoding string) string {
	return TnBufferToString(c.process(tnCryptoBytes(data, inputEncoding)), outputEncoding)
}

func (c *TnCipher) final() []byte { return c.finish() }

func (c *TnCipher) finalString(enc string) string { return TnBufferToString(c.finish(), enc) }

func (c *TnCipher) setAAD(aad []byte, options ...interface{}) *TnCipher {
	// SIV authenticates each setAAD() as its own component; GCM-SIV concatenates them
	c.aads = append(c.aads, append([]byte{}, aad...))
	if c.mode == "gcm-siv" {
		c.aad = append(c.aad, aad...)
		return c
	}
	c.aad = aad
	return c
}

func (c *TnCipher) setAuthTag(tag []byte) *TnCipher {
	c.authTag = tag
	return c
}

func (c *TnCipher) getAuthTag() []byte { return c.authTag }

func (c *TnCipher) setAutoPadding(pad ...bool) *TnCipher {
	c.autoPadding = len(pad) == 0 || pad[0]
	return c
}`;

// Hash / Hmac as streams (write / end / pipe / pipeline): a transform that
// hashes what is written and pushes the digest at the end, as in Node; only
// programs that use a hash as a stream carry it
const hashStreamHelper = `func (h *TnHash) tnStream() *TnStream {
	if h.stream == nil {
		s := TnNewTransform()
		s.goTransform = func(chunk []byte) {
			if !h.finalized {
				h.h.Write(chunk)
			}
		}
		s.goFlush = func() []byte { return h.digestBytes() }
		h.stream = s
	}
	return h.stream.(*TnStream)
}

func (h *TnHash) write(chunk interface{}, args ...interface{}) bool {
	return h.tnStream().write(chunk, args...)
}

func (h *TnHash) end(args ...interface{}) *TnStream { return h.tnStream().end(args...) }

func (h *TnHash) on(event string, fn interface{}) *TnEventEmitter { return h.tnStream().on(event, fn) }

func (h *TnHash) once(event string, fn interface{}) *TnEventEmitter {
	return h.tnStream().once(event, fn)
}

func (h *TnHash) read(size ...float64) interface{} { return h.tnStream().read(size...) }

func (h *TnHash) setEncoding(enc string) *TnStream { return h.tnStream().setEncoding(enc) }`;

const cryptoMacHelper = `// crypto.randomUUIDv7(): a millisecond Unix timestamp, then random bits
func TnRandomUUIDv7() string {
	b := TnRandomBytes(16)
	ms := uint64(time.Now().UnixMilli())
	for i := 0; i < 6; i++ {
		b[i] = byte(ms >> (40 - 8*i))
	}
	b[6] = (b[6] & 0x0f) | 0x70
	b[8] = (b[8] & 0x3f) | 0x80
	h := hex.EncodeToString(b)
	return h[0:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}

// crypto.createMac(algorithm, key, options): HMAC (options.digest), KMAC128 /
// KMAC256 (options.outputLength / customization), AES-CMAC (options.cipher),
// GMAC (options.cipher / iv), Poly1305, SipHash-2-4 (outputLength 8 / 16),
// BLAKE2b / BLAKE2s (outputLength, salt, customization: the personalization)
type TnMac struct {
	alg       string
	h         hash.Hash
	kmac      *sha3.SHAKE
	outLen    int
	cmac      cipher.Block
	gmac      cipher.AEAD
	key       []byte
	iv        []byte
	salt      []byte
	personal  []byte
	data      []byte
	finalized bool
}

func TnGetMacs() []string {
	return []string{"blake2bmac", "blake2smac", "cmac", "gmac", "hmac", "kmac-128", "kmac-256", "kmac128", "kmac256", "poly1305", "siphash"}
}

var tnBlake2Sigma = [10][16]byte{
	{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15},
	{14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3},
	{11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4},
	{7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8},
	{9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13},
	{2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9},
	{12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11},
	{13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10},
	{6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5},
	{10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0},
}

var tnBlake2bIV = [8]uint64{0x6a09e667f3bcc908, 0xbb67ae8584caa73b, 0x3c6ef372fe94f82b, 0xa54ff53a5f1d36f1, 0x510e527fade682d1, 0x9b05688c2b3e6c1f, 0x1f83d9abfb41bd6b, 0x5be0cd19137e2179}
var tnBlake2sIV = [8]uint32{0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19}

func tnMacKeyLengthError() *TnError {
	return TnNodeError("Error", "ERR_OSSL_INVALID_KEY_LENGTH", "error:1C800069:Provider routines::invalid key length")
}

func tnBlake2b(key, salt, personal, msg []byte, outLen int) []byte {
	var h [8]uint64
	h = tnBlake2bIV
	h[0] ^= 0x01010000 ^ uint64(len(key))<<8 ^ uint64(outLen)
	var s, p [16]byte
	copy(s[:], salt)
	copy(p[:], personal)
	h[4] ^= binary.LittleEndian.Uint64(s[0:])
	h[5] ^= binary.LittleEndian.Uint64(s[8:])
	h[6] ^= binary.LittleEndian.Uint64(p[0:])
	h[7] ^= binary.LittleEndian.Uint64(p[8:])
	data := msg
	if len(key) > 0 {
		block := make([]byte, 128)
		copy(block, key)
		data = append(block, msg...)
	}
	var t uint64
	compress := func(block []byte, last bool) {
		var m [16]uint64
		for i := range m {
			m[i] = binary.LittleEndian.Uint64(block[i*8:])
		}
		var v [16]uint64
		copy(v[:8], h[:])
		copy(v[8:], tnBlake2bIV[:])
		v[12] ^= t
		if last {
			v[14] = ^v[14]
		}
		g := func(a, b, c, d int, x, y uint64) {
			v[a] = v[a] + v[b] + x
			v[d] = bits.RotateLeft64(v[d]^v[a], -32)
			v[c] = v[c] + v[d]
			v[b] = bits.RotateLeft64(v[b]^v[c], -24)
			v[a] = v[a] + v[b] + y
			v[d] = bits.RotateLeft64(v[d]^v[a], -16)
			v[c] = v[c] + v[d]
			v[b] = bits.RotateLeft64(v[b]^v[c], -63)
		}
		for r := 0; r < 12; r++ {
			s := tnBlake2Sigma[r%10]
			g(0, 4, 8, 12, m[s[0]], m[s[1]])
			g(1, 5, 9, 13, m[s[2]], m[s[3]])
			g(2, 6, 10, 14, m[s[4]], m[s[5]])
			g(3, 7, 11, 15, m[s[6]], m[s[7]])
			g(0, 5, 10, 15, m[s[8]], m[s[9]])
			g(1, 6, 11, 12, m[s[10]], m[s[11]])
			g(2, 7, 8, 13, m[s[12]], m[s[13]])
			g(3, 4, 9, 14, m[s[14]], m[s[15]])
		}
		for i := 0; i < 8; i++ {
			h[i] ^= v[i] ^ v[i+8]
		}
	}
	for len(data) > 128 {
		t += 128
		compress(data[:128], false)
		data = data[128:]
	}
	last := make([]byte, 128)
	copy(last, data)
	t += uint64(len(data))
	compress(last, true)
	out := make([]byte, 64)
	for i, w := range h {
		binary.LittleEndian.PutUint64(out[i*8:], w)
	}
	return out[:outLen]
}

func tnBlake2s(key, salt, personal, msg []byte, outLen int) []byte {
	var h [8]uint32
	h = tnBlake2sIV
	h[0] ^= 0x01010000 ^ uint32(len(key))<<8 ^ uint32(outLen)
	var s, p [8]byte
	copy(s[:], salt)
	copy(p[:], personal)
	h[4] ^= binary.LittleEndian.Uint32(s[0:])
	h[5] ^= binary.LittleEndian.Uint32(s[4:])
	h[6] ^= binary.LittleEndian.Uint32(p[0:])
	h[7] ^= binary.LittleEndian.Uint32(p[4:])
	data := msg
	if len(key) > 0 {
		block := make([]byte, 64)
		copy(block, key)
		data = append(block, msg...)
	}
	var t uint64
	compress := func(block []byte, last bool) {
		var m [16]uint32
		for i := range m {
			m[i] = binary.LittleEndian.Uint32(block[i*4:])
		}
		var v [16]uint32
		copy(v[:8], h[:])
		copy(v[8:], tnBlake2sIV[:])
		v[12] ^= uint32(t)
		v[13] ^= uint32(t >> 32)
		if last {
			v[14] = ^v[14]
		}
		g := func(a, b, c, d int, x, y uint32) {
			v[a] = v[a] + v[b] + x
			v[d] = bits.RotateLeft32(v[d]^v[a], -16)
			v[c] = v[c] + v[d]
			v[b] = bits.RotateLeft32(v[b]^v[c], -12)
			v[a] = v[a] + v[b] + y
			v[d] = bits.RotateLeft32(v[d]^v[a], -8)
			v[c] = v[c] + v[d]
			v[b] = bits.RotateLeft32(v[b]^v[c], -7)
		}
		for r := 0; r < 10; r++ {
			s := tnBlake2Sigma[r]
			g(0, 4, 8, 12, m[s[0]], m[s[1]])
			g(1, 5, 9, 13, m[s[2]], m[s[3]])
			g(2, 6, 10, 14, m[s[4]], m[s[5]])
			g(3, 7, 11, 15, m[s[6]], m[s[7]])
			g(0, 5, 10, 15, m[s[8]], m[s[9]])
			g(1, 6, 11, 12, m[s[10]], m[s[11]])
			g(2, 7, 8, 13, m[s[12]], m[s[13]])
			g(3, 4, 9, 14, m[s[14]], m[s[15]])
		}
		for i := 0; i < 8; i++ {
			h[i] ^= v[i] ^ v[i+8]
		}
	}
	for len(data) > 64 {
		t += 64
		compress(data[:64], false)
		data = data[64:]
	}
	last := make([]byte, 64)
	copy(last, data)
	t += uint64(len(data))
	compress(last, true)
	out := make([]byte, 32)
	for i, w := range h {
		binary.LittleEndian.PutUint32(out[i*4:], w)
	}
	return out[:outLen]
}

// SipHash-2-4 with a 64- or 128-bit output
func tnSipHash(key, msg []byte, outLen int) []byte {
	k0 := binary.LittleEndian.Uint64(key[0:])
	k1 := binary.LittleEndian.Uint64(key[8:])
	v0 := k0 ^ 0x736f6d6570736575
	v1 := k1 ^ 0x646f72616e646f6d
	v2 := k0 ^ 0x6c7967656e657261
	v3 := k1 ^ 0x7465646279746573
	if outLen == 16 {
		v1 ^= 0xee
	}
	round := func() {
		v0 += v1
		v1 = bits.RotateLeft64(v1, 13)
		v1 ^= v0
		v0 = bits.RotateLeft64(v0, 32)
		v2 += v3
		v3 = bits.RotateLeft64(v3, 16)
		v3 ^= v2
		v0 += v3
		v3 = bits.RotateLeft64(v3, 21)
		v3 ^= v0
		v2 += v1
		v1 = bits.RotateLeft64(v1, 17)
		v1 ^= v2
		v2 = bits.RotateLeft64(v2, 32)
	}
	n := len(msg)
	for len(msg) >= 8 {
		m := binary.LittleEndian.Uint64(msg)
		v3 ^= m
		round()
		round()
		v0 ^= m
		msg = msg[8:]
	}
	var lastBlock [8]byte
	copy(lastBlock[:], msg)
	lastBlock[7] = byte(n)
	m := binary.LittleEndian.Uint64(lastBlock[:])
	v3 ^= m
	round()
	round()
	v0 ^= m
	if outLen == 16 {
		v2 ^= 0xee
	} else {
		v2 ^= 0xff
	}
	for i := 0; i < 4; i++ {
		round()
	}
	out := binary.LittleEndian.AppendUint64(nil, v0^v1^v2^v3)
	if outLen == 16 {
		v1 ^= 0xdd
		for i := 0; i < 4; i++ {
			round()
		}
		out = binary.LittleEndian.AppendUint64(out, v0^v1^v2^v3)
	}
	return out
}

// Poly1305 (RFC 8439) over math/big
func tnPoly1305(key, msg []byte) []byte {
	clamp := make([]byte, 16)
	copy(clamp, key[:16])
	clamp[3] &= 15
	clamp[7] &= 15
	clamp[11] &= 15
	clamp[15] &= 15
	clamp[4] &= 252
	clamp[8] &= 252
	clamp[12] &= 252
	r := new(tnbig.Int).SetBytes(tnReverse(clamp))
	s := new(tnbig.Int).SetBytes(tnReverse(key[16:32]))
	p := new(tnbig.Int).Sub(new(tnbig.Int).Lsh(tnbig.NewInt(1), 130), tnbig.NewInt(5))
	acc := new(tnbig.Int)
	for len(msg) > 0 {
		n := 16
		if len(msg) < n {
			n = len(msg)
		}
		block := append(append([]byte{}, msg[:n]...), 1)
		acc.Add(acc, new(tnbig.Int).SetBytes(tnReverse(block)))
		acc.Mul(acc, r)
		acc.Mod(acc, p)
		msg = msg[n:]
	}
	acc.Add(acc, s)
	out := make([]byte, 16)
	b := acc.Bytes()
	for i := 0; i < 16 && i < len(b); i++ {
		out[i] = b[len(b)-1-i]
	}
	return out
}


func tnLeftEncode(x uint64) []byte {
	n := 1
	for v := x >> 8; v > 0; v >>= 8 {
		n++
	}
	b := make([]byte, n+1)
	b[0] = byte(n)
	for i := n; i >= 1; i-- {
		b[i] = byte(x)
		x >>= 8
	}
	return b
}

func tnRightEncode(x uint64) []byte {
	l := tnLeftEncode(x)
	return append(append([]byte{}, l[1:]...), l[0])
}

func tnBytepad(x []byte, w int) []byte {
	z := append(tnLeftEncode(uint64(w)), x...)
	for len(z)%w != 0 {
		z = append(z, 0)
	}
	return z
}

func TnCreateMac(alg string, key interface{}, options ...interface{}) *TnMac {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	option := func(name string) interface{} {
		if opts == nil {
			return nil
		}
		return TnGetValue(opts, name)
	}
	k := tnCryptoBytes(key, "")
	m := &TnMac{alg: strings.ToLower(alg)}
	switch m.alg {
	case "hmac":
		digest, _ := option("digest").(string)
		if digest == "" {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.digest' is required for HMAC"))
		}
		m.h = hmac.New(tnHashFactory(digest), k)
	case "kmac128", "kmac-128", "kmac256", "kmac-256":
		if len(k) < 4 {
			panic(TnNodeError("Error", "ERR_OSSL_INVALID_KEY_LENGTH", "error:1C800069:Provider routines::invalid key length"))
		}
		custom := []byte{}
		if c := option("customization"); c != nil {
			custom = tnCryptoBytes(c, "")
		}
		rate := 168
		m.outLen = 32
		if strings.Contains(m.alg, "256") {
			rate = 136
			m.outLen = 64
		}
		if n, ok := option("outputLength").(float64); ok {
			m.outLen = int(n)
		}
		if rate == 168 {
			m.kmac = sha3.NewCSHAKE128([]byte("KMAC"), custom)
		} else {
			m.kmac = sha3.NewCSHAKE256([]byte("KMAC"), custom)
		}
		m.kmac.Write(tnBytepad(append(tnLeftEncode(uint64(len(k))*8), k...), rate))
	case "cmac":
		name, _ := option("cipher").(string)
		if !strings.HasPrefix(strings.ToLower(name), "aes-") {
			panic(TnNodeError("Error", "ERR_CRYPTO_INVALID_CIPHER", "Invalid cipher: "+name))
		}
		block, err := aes.NewCipher(k)
		if err != nil {
			panic(TnNodeError("Error", "ERR_OSSL_INVALID_KEY_LENGTH", "error:1C800069:Provider routines::invalid key length"))
		}
		m.cmac = block
	case "gmac":
		name, _ := option("cipher").(string)
		if name == "" {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.cipher' is required for GMAC"))
		}
		iv := option("iv")
		if iv == nil || TnIsNil(iv) || len(tnCryptoBytes(iv, "")) == 0 {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.iv' must be non-empty for GMAC"))
		}
		parts := strings.Split(strings.ToLower(name), "-")
		if len(parts) != 3 || parts[0] != "aes" || parts[2] != "gcm" {
			panic(TnNodeError("Error", "ERR_CRYPTO_INVALID_CIPHER", "Invalid cipher: "+name))
		}
		if strconv.Itoa(len(k)*8) != parts[1] {
			panic(tnMacKeyLengthError())
		}
		block, _ := aes.NewCipher(k)
		m.iv = tnCryptoBytes(iv, "")
		aead, err := cipher.NewGCMWithNonceSize(block, len(m.iv))
		if err != nil {
			panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to initialize MAC"))
		}
		m.gmac = aead
	case "poly1305":
		if len(k) != 32 {
			panic(tnMacKeyLengthError())
		}
		m.key = k
	case "siphash":
		m.outLen = 16
		if n, ok := option("outputLength").(float64); ok {
			m.outLen = int(n)
		}
		if len(k) != 16 || m.outLen != 8 && m.outLen != 16 {
			panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to initialize MAC"))
		}
		m.key = k
	case "blake2bmac", "blake2smac":
		max := 64
		if m.alg == "blake2smac" {
			max = 32
		}
		m.outLen = max
		if n, ok := option("outputLength").(float64); ok {
			m.outLen = int(n)
		}
		if len(k) == 0 || len(k) > max {
			panic(tnMacKeyLengthError())
		}
		// salt and personalization are zero-padded to their full size
		if v := option("salt"); v != nil && !TnIsNil(v) {
			m.salt = tnCryptoBytes(v, "")
		}
		if v := option("customization"); v != nil && !TnIsNil(v) {
			m.personal = tnCryptoBytes(v, "")
		}
		if m.outLen < 1 || m.outLen > max || len(m.salt) > max/4 || len(m.personal) > max/4 {
			panic(TnNodeError("Error", "ERR_CRYPTO_OPERATION_FAILED", "Failed to initialize MAC"))
		}
		m.key = k
	default:
		panic(TnNodeError("Error", "ERR_CRYPTO_INVALID_DIGEST", "Invalid MAC algorithm: "+alg))
	}
	return m
}

func (m *TnMac) update(data interface{}, enc ...string) *TnMac {
	if m.finalized {
		panic(TnNodeError("Error", "ERR_CRYPTO_HASH_FINALIZED", "Digest already called"))
	}
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	b := tnCryptoBytes(data, e)
	switch {
	case m.h != nil:
		m.h.Write(b)
	case m.kmac != nil:
		m.kmac.Write(b)
	default:
		m.data = append(m.data, b...)
	}
	return m
}

func (m *TnMac) final() []byte {
	if m.finalized {
		panic(TnNodeError("Error", "ERR_CRYPTO_HASH_FINALIZED", "Digest already called"))
	}
	m.finalized = true
	switch {
	case m.h != nil:
		return m.h.Sum(nil)
	case m.kmac != nil:
		m.kmac.Write(tnRightEncode(uint64(m.outLen) * 8))
		out := make([]byte, m.outLen)
		m.kmac.Read(out)
		return out
	case m.gmac != nil:
		return m.gmac.Seal(nil, m.iv, nil, m.data)
	}
	switch m.alg {
	case "poly1305":
		return tnPoly1305(m.key, m.data)
	case "siphash":
		return tnSipHash(m.key, m.data, m.outLen)
	case "blake2bmac":
		return tnBlake2b(m.key, m.salt, m.personal, m.data, m.outLen)
	case "blake2smac":
		return tnBlake2s(m.key, m.salt, m.personal, m.data, m.outLen)
	}
	return tnCmac(m.cmac, m.data)
}

func (m *TnMac) finalString(enc string) string {
	return TnBufferToString(m.final(), enc)
}`;

export function registerCrypto(r: NodeRegistry): void {
  defineModule(r, 'crypto');
  r.globals['crypto'] = 'crypto';
  defineHelper(
    r,
    'nodeCrypto',
    [
      'bytes',
      'crypto/aes',
      'crypto/cipher',
      'crypto/hkdf',
      'crypto/hmac',
      'crypto/md5',
      'crypto/pbkdf2',
      'crypto/rand',
      'crypto/sha1',
      'crypto/sha256',
      'crypto/sha3',
      'crypto/sha512',
      'crypto/subtle',
      'encoding',
      'encoding/binary',
      'encoding/hex',
      'hash',
      'math/big',
      'strconv',
      'strings'
    ],
    ['error', 'buffer', 'dynamic'],
    cryptoHelper
  );
  defineClass(r, 'crypto.Hash', '*TnHash', 'class', 'update=*TnHash; copy=*TnHash; write=bool; end=*TnStream; on=*TnEventEmitter; once=*TnEventEmitter; read=interface{}; setEncoding=*TnStream; pipe=interface{}', '', '', '');
  defineHelper(r, 'hashStream', [], ['nodeCrypto', 'nodeStream'], hashStreamHelper);
  for (const method of ['write', 'end', 'on', 'once', 'read', 'setEncoding']) {
    r.methods[`crypto.Hash#${method}`] = (c: NodeCall) => {
      r.helper('hashStream');
      return `${c.recv}.${method}(${c.args.join(', ')})`;
    };
  }
  r.methods['crypto.Hash#pipe'] = (c: NodeCall) => {
    r.helper('hashStream');
    return `TnPipe(${c.recv}, ${c.args.join(', ')})`;
  };
  r.typers['crypto.Hash#pipe'] = (c: NodeCall) => c.types[0] || '*TnStream';
  r.paramTypers['crypto.Hash#on'] = (nodes: any[]) => streamListenerTypes(nodes);
  r.paramTypers['crypto.Hash#once'] = r.paramTypers['crypto.Hash#on'];
  r.classes['crypto.Hmac'] = r.classes['crypto.Hash'];
  defineClass(r, 'crypto.Cipher', '*TnCipher', 'class', 'setAAD=*TnCipher; setAuthTag=*TnCipher; getAuthTag=[]byte; setAutoPadding=*TnCipher', '', '', '');
  r.classes['crypto.Cipheriv'] = r.classes['crypto.Cipher'];
  r.classes['crypto.Decipheriv'] = r.classes['crypto.Cipher'];
  r.classes['crypto.Decipher'] = r.classes['crypto.Cipher'];
  const use = () => r.helper('nodeCrypto');
  const fn = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.functions[`crypto.${name}`] = (call: NodeCall) => {
      use();
      return emit(call);
    };
    r.results[`crypto.${name}`] = result;
  };
  fn('createHash', '*TnHash', (c: NodeCall) => `TnCreateHash(${c.args.join(', ')})`);
  fn('createHmac', '*TnHash', (c: NodeCall) => `TnCreateHmac(${c.args.join(', ')})`);
  fn('hash', 'string', (c: NodeCall) => `TnHashOnce(${c.args.join(', ')})`);
  fn('getHashes', '[]string', (_c: NodeCall) => 'TnGetHashes()');
  fn('getCiphers', '[]string', (_c: NodeCall) => 'TnGetCiphers()');
  fn('randomBytes', '[]byte', (c: NodeCall) => `TnRandomBytes(${c.args[0]})`);
  fn('randomUUID', 'string', (_c: NodeCall) => 'TnRandomUUID()');
  defineHelper(r, 'nodeCryptoMac', ['crypto/aes', 'crypto/cipher', 'crypto/hmac', 'crypto/sha3', 'encoding/binary', 'encoding/hex', 'hash', 'math/big', 'math/bits', 'strconv', 'strings', 'time'], ['nodeCrypto'], cryptoMacHelper);
  const mac = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.functions[`crypto.${name}`] = (call: NodeCall) => {
      r.helper('nodeCryptoMac');
      return emit(call);
    };
    r.results[`crypto.${name}`] = result;
  };
  mac('randomUUIDv7', 'string', (_c: NodeCall) => 'TnRandomUUIDv7()');
  mac('createMac', '*TnMac', (c: NodeCall) => `TnCreateMac(${c.args.join(', ')})`);
  mac('getMacs', '[]string', (_c: NodeCall) => 'TnGetMacs()');
  defineClass(r, 'crypto.Mac', '*TnMac', 'class', 'update=*TnMac', '', '', '');
  r.methods['crypto.Mac#final'] = (c: NodeCall) => (c.args.length > 0 ? `${c.recv}.finalString(${c.args[0]})` : `${c.recv}.final()`);
  r.typers['crypto.Mac#final'] = (c: NodeCall) => (c.nodes.length > 0 ? 'string' : '[]byte');
  fn('randomInt', 'float64', (c: NodeCall) => `TnRandomInt(${c.args.join(', ')})`);
  fn('getRandomValues', '[]byte', (c: NodeCall) => `TnGetRandomValues(${c.args[0]})`);
  fn('timingSafeEqual', 'bool', (c: NodeCall) => `TnTimingSafeEqual(${c.args[0]}, ${c.args[1]})`);
  fn('pbkdf2Sync', '[]byte', (c: NodeCall) => `TnPbkdf2(${c.args.join(', ')})`);
  fn('hkdfSync', '[]byte', (c: NodeCall) => `TnHkdf(${c.args.join(', ')})`);
  fn('createCipheriv', '*TnCipher', (c: NodeCall) => `TnCreateCipher(${c.args[0]}, ${c.args[1]}, ${c.args[2]}, false)`);
  fn('createDecipheriv', '*TnCipher', (c: NodeCall) => `TnCreateCipher(${c.args[0]}, ${c.args[1]}, ${c.args[2]}, true)`);
  r.objects['crypto.webcrypto'] = true;
  r.namespaces['crypto.webcrypto'] = 'crypto';
  setResults(r, 'crypto', '');

  // hash.digest(encoding?) → string with an encoding, Buffer without
  r.methods['crypto.Hash#digest'] = (c: NodeCall) => (c.args.length > 0 ? `${c.recv}.digestString(${c.args[0]})` : `${c.recv}.digest()`);
  r.typers['crypto.Hash#digest'] = (c: NodeCall) => (c.nodes.length > 0 ? 'string' : '[]byte');
  // cipher.update(data, inputEncoding?, outputEncoding?) / final(outputEncoding?)
  r.methods['crypto.Cipher#update'] = (c: NodeCall) => {
    if (c.args.length >= 3) return `${c.recv}.updateString(${c.args[0]}, ${c.args[1]}, ${c.args[2]})`;
    return `${c.recv}.update(${c.args.join(', ')})`;
  };
  r.typers['crypto.Cipher#update'] = (c: NodeCall) => (c.nodes.length >= 3 ? 'string' : '[]byte');
  r.methods['crypto.Cipher#final'] = (c: NodeCall) => (c.args.length > 0 ? `${c.recv}.finalString(${c.args[0]})` : `${c.recv}.final()`);
  r.typers['crypto.Cipher#final'] = (c: NodeCall) => (c.nodes.length > 0 ? 'string' : '[]byte');
}
