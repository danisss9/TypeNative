// node:crypto (+ the global crypto): hashes / HMAC (md5, sha1, sha2, sha3),
// random bytes / UUIDs / ints, timingSafeEqual, PBKDF2 / HKDF, AES ciphers
// (cbc / ctr / gcm). Backed by Go's crypto packages.

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
}

func TnGetCiphers() []string {
	return []string{"aes-128-cbc", "aes-128-ctr", "aes-128-gcm", "aes-192-cbc", "aes-192-ctr", "aes-192-gcm", "aes-256-cbc", "aes-256-ctr", "aes-256-gcm",
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
	if len(parts) != 3 || parts[0] != "aes" {
		panic(TnNodeError("Error", "ERR_CRYPTO_UNKNOWN_CIPHER", "Unknown cipher"))
	}
	k := tnCryptoBytes(key, "")
	if strconv.Itoa(len(k)*8) != parts[1] {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", "Invalid key length"))
	}
	block, err := aes.NewCipher(k)
	if err != nil {
		panic(TnNodeError("RangeError", "ERR_CRYPTO_INVALID_KEYLEN", "Invalid key length"))
	}
	c := &TnCipher{decrypt: decrypt, mode: parts[2], block: block, iv: tnCryptoBytes(iv, ""), autoPadding: true}
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
