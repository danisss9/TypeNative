// node:buffer + globals Buffer, Uint8Array (minimal), TextEncoder / TextDecoder,
// atob / btoa. Buffers are plain Go []byte: slices share memory like
// Buffer#subarray, and Go APIs taking []byte accept them directly.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const bufferHelper = `// node:buffer — Buffers are []byte; encodings as in Node
func TnByte(v float64) byte { return byte(int64(v)) }

func tnEncoding(enc string) string {
	switch strings.ToLower(enc) {
	case "", "utf8", "utf-8":
		return "utf8"
	case "hex":
		return "hex"
	case "base64":
		return "base64"
	case "base64url":
		return "base64url"
	case "latin1", "binary":
		return "latin1"
	case "ascii":
		return "ascii"
	case "utf16le", "utf-16le", "ucs2", "ucs-2":
		return "utf16le"
	}
	panic(TnNodeError("TypeError", "ERR_UNKNOWN_ENCODING", "Unknown encoding: "+enc))
}

func TnIsEncoding(enc string) bool {
	switch strings.ToLower(enc) {
	case "utf8", "utf-8", "hex", "base64", "base64url", "latin1", "binary", "ascii", "utf16le", "utf-16le", "ucs2", "ucs-2":
		return true
	}
	return false
}

func TnBufferFromString(s string, enc string) []byte {
	switch tnEncoding(enc) {
	case "hex":
		// Node stops at the first invalid pair
		out := make([]byte, 0, len(s)/2)
		for i := 0; i+1 < len(s); i += 2 {
			b, err := hex.DecodeString(s[i : i+2])
			if err != nil {
				break
			}
			out = append(out, b[0])
		}
		return out
	case "base64", "base64url":
		// Both alphabets, padding optional, whitespace ignored
		clean := strings.Map(func(r rune) rune {
			switch r {
			case '-':
				return '+'
			case '_':
				return '/'
			case '=', ' ', '\\n', '\\r', '\\t':
				return -1
			}
			return r
		}, s)
		if len(clean)%4 == 1 {
			clean = clean[:len(clean)-1]
		}
		out, _ := base64.RawStdEncoding.DecodeString(clean)
		return out
	case "latin1", "ascii":
		out := make([]byte, 0, len(s))
		for _, r := range s {
			out = append(out, byte(r))
		}
		return out
	case "utf16le":
		units := utf16.Encode([]rune(s))
		out := make([]byte, len(units)*2)
		for i, u := range units {
			out[2*i] = byte(u)
			out[2*i+1] = byte(u >> 8)
		}
		return out
	}
	return []byte(s)
}

// UTF-8 decoding with one U+FFFD per invalid byte (as Node does)
func tnDecodeUTF8(b []byte) string {
	if utf8.Valid(b) {
		return string(b)
	}
	var sb strings.Builder
	for len(b) > 0 {
		r, size := utf8.DecodeRune(b)
		sb.WriteRune(r)
		b = b[size:]
	}
	return sb.String()
}

func TnBufferToString(b []byte, enc string, bounds ...float64) string {
	b = TnBufferSlice(b, bounds...)
	switch tnEncoding(enc) {
	case "hex":
		return hex.EncodeToString(b)
	case "base64":
		return base64.StdEncoding.EncodeToString(b)
	case "base64url":
		return base64.RawURLEncoding.EncodeToString(b)
	case "latin1":
		runes := make([]rune, len(b))
		for i, c := range b {
			runes[i] = rune(c)
		}
		return string(runes)
	case "ascii":
		runes := make([]rune, len(b))
		for i, c := range b {
			runes[i] = rune(c & 0x7f)
		}
		return string(runes)
	case "utf16le":
		units := make([]uint16, len(b)/2)
		for i := range units {
			units[i] = uint16(b[2*i]) | uint16(b[2*i+1])<<8
		}
		return string(utf16.Decode(units))
	}
	return tnDecodeUTF8(b)
}

// Clamped [start, end) bounds, negative values counting from the end
func tnBufferBounds(n int, bounds ...float64) (int, int) {
	start, end := 0, n
	clamp := func(v float64) int {
		i := int(v)
		if v < 0 {
			i = n + int(v)
		}
		if i < 0 {
			return 0
		}
		if i > n {
			return n
		}
		return i
	}
	if len(bounds) > 0 && !math.IsNaN(bounds[0]) {
		start = clamp(bounds[0])
	}
	if len(bounds) > 1 && !math.IsNaN(bounds[1]) {
		end = clamp(bounds[1])
	}
	if end < start {
		end = start
	}
	return start, end
}

// buf.subarray / buf.slice: a view sharing memory
func TnBufferSlice(b []byte, bounds ...float64) []byte {
	start, end := tnBufferBounds(len(b), bounds...)
	return b[start:end:end]
}

func TnBufferFromNumbers(values []float64) []byte {
	out := make([]byte, len(values))
	for i, v := range values {
		out[i] = byte(int(v))
	}
	return out
}

// Buffer.from(any): strings, buffers, number arrays
func TnBufferFrom(v interface{}, enc string) []byte {
	switch x := v.(type) {
	case string:
		return TnBufferFromString(x, enc)
	case []byte:
		return append([]byte{}, x...)
	case []float64:
		return TnBufferFromNumbers(x)
	case *[]float64:
		return TnBufferFromNumbers(*x)
	case []interface{}:
		out := make([]byte, len(x))
		for i, e := range x {
			out[i] = byte(int(TnNumber(e)))
		}
		return out
	}
	panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object."))
}

func TnBufferAlloc(size float64, fill ...interface{}) []byte {
	b := make([]byte, int(size))
	if len(fill) > 0 && fill[0] != nil {
		enc := ""
		if len(fill) > 1 {
			enc, _ = fill[1].(string)
		}
		TnBufferFill(b, fill[0], enc)
	}
	return b
}

func TnBufferConcat(list [][]byte, total ...float64) []byte {
	out := []byte{}
	for _, b := range list {
		out = append(out, b...)
	}
	if len(total) > 0 {
		n := int(total[0])
		if n < len(out) {
			return out[:n]
		}
		return append(out, make([]byte, n-len(out))...)
	}
	return out
}

// Bytes of a value used as a needle or fill pattern
func tnBufferBytes(v interface{}, enc string) []byte {
	switch x := v.(type) {
	case string:
		return TnBufferFromString(x, enc)
	case []byte:
		return x
	case float64:
		return []byte{byte(int(x))}
	}
	return TnBufferFrom(v, enc)
}

func TnBufferFill(b []byte, value interface{}, enc string, bounds ...float64) []byte {
	start, end := tnBufferBounds(len(b), bounds...)
	pattern := tnBufferBytes(value, enc)
	if len(pattern) == 0 {
		pattern = []byte{0}
	}
	for i := start; i < end; i++ {
		b[i] = pattern[(i-start)%len(pattern)]
	}
	return b
}

func TnBufferIndexOf(b []byte, value interface{}, offset float64, enc string) float64 {
	start, _ := tnBufferBounds(len(b), offset)
	i := bytes.Index(b[start:], tnBufferBytes(value, enc))
	if i < 0 {
		return -1
	}
	return float64(start + i)
}

func TnBufferLastIndexOf(b []byte, value interface{}, enc string) float64 {
	return float64(bytes.LastIndex(b, tnBufferBytes(value, enc)))
}

// buf.write(string, offset?, length?, encoding?) → bytes written
func TnBufferWrite(b []byte, s string, args ...interface{}) float64 {
	offset, length, enc := 0, len(b), ""
	nums := []float64{}
	for _, a := range args {
		switch x := a.(type) {
		case string:
			enc = x
		case float64:
			nums = append(nums, x)
		}
	}
	if len(nums) > 0 {
		offset = int(nums[0])
	}
	length = len(b) - offset
	if len(nums) > 1 && int(nums[1]) < length {
		length = int(nums[1])
	}
	return float64(copy(b[offset:offset+length], TnBufferFromString(s, enc)))
}

// buf.copy(target, targetStart?, sourceStart?, sourceEnd?) → bytes copied
func TnBufferCopy(src []byte, dst []byte, args ...float64) float64 {
	targetStart, sourceStart, sourceEnd := 0, 0, len(src)
	if len(args) > 0 {
		targetStart = int(args[0])
	}
	if len(args) > 1 {
		sourceStart = int(args[1])
	}
	if len(args) > 2 && int(args[2]) < sourceEnd {
		sourceEnd = int(args[2])
	}
	if targetStart >= len(dst) || sourceStart >= sourceEnd {
		return 0
	}
	return float64(copy(dst[targetStart:], src[sourceStart:sourceEnd]))
}

func tnBufferCheck(b []byte, offset float64, size int) int {
	o := int(offset)
	if offset != math.Trunc(offset) || o < 0 || o+size > len(b) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", fmt.Sprintf("The value of \\"offset\\" is out of range. It must be >= 0 and <= %d. Received %v", len(b)-size, offset)))
	}
	return o
}

func tnByteOrder(little bool) binary.ByteOrder {
	if little {
		return binary.LittleEndian
	}
	return binary.BigEndian
}

func TnBufferReadUint(b []byte, offset float64, size int, little bool) float64 {
	o := tnBufferCheck(b, offset, size)
	order := tnByteOrder(little)
	switch size {
	case 1:
		return float64(b[o])
	case 2:
		return float64(order.Uint16(b[o:]))
	}
	return float64(order.Uint32(b[o:]))
}

func TnBufferReadInt(b []byte, offset float64, size int, little bool) float64 {
	o := tnBufferCheck(b, offset, size)
	order := tnByteOrder(little)
	switch size {
	case 1:
		return float64(int8(b[o]))
	case 2:
		return float64(int16(order.Uint16(b[o:])))
	}
	return float64(int32(order.Uint32(b[o:])))
}

func TnBufferReadFloat(b []byte, offset float64, size int, little bool) float64 {
	o := tnBufferCheck(b, offset, size)
	order := tnByteOrder(little)
	if size == 4 {
		return float64(math.Float32frombits(order.Uint32(b[o:])))
	}
	return math.Float64frombits(order.Uint64(b[o:]))
}

// writeUInt*/writeInt*: the value wraps to the width; returns offset + size
func TnBufferWriteInt(b []byte, value float64, offset float64, size int, little bool) float64 {
	o := tnBufferCheck(b, offset, size)
	order := tnByteOrder(little)
	v := uint64(int64(value))
	switch size {
	case 1:
		b[o] = byte(v)
	case 2:
		order.PutUint16(b[o:], uint16(v))
	default:
		order.PutUint32(b[o:], uint32(v))
	}
	return float64(o + size)
}

// readBigInt64LE & co.: bigints
func TnBufferReadBigInt64(b []byte, offset float64, little bool, signed bool) *tnbig.Int {
	o := tnBufferCheck(b, offset, 8)
	v := tnByteOrder(little).Uint64(b[o:])
	if signed {
		return tnbig.NewInt(int64(v))
	}
	return new(tnbig.Int).SetUint64(v)
}

func TnBufferWriteBigInt64(b []byte, value *tnbig.Int, offset float64, little bool, signed bool) float64 {
	o := tnBufferCheck(b, offset, 8)
	var v uint64
	if signed {
		if !value.IsInt64() {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"value\\" is out of range. It must be >= -(2n ** 63n) and < 2n ** 63n. Received "+value.String()+"n"))
		}
		v = uint64(value.Int64())
	} else {
		if !value.IsUint64() {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"value\\" is out of range. It must be >= 0n and < 2n ** 64n. Received "+value.String()+"n"))
		}
		v = value.Uint64()
	}
	tnByteOrder(little).PutUint64(b[o:], v)
	return float64(o + 8)
}

// swap16 / swap32 / swap64: byte order reversed in place
func TnBufferSwap(b []byte, size int) []byte {
	if len(b)%size != 0 {
		panic(TnNodeError("RangeError", "ERR_INVALID_BUFFER_SIZE", "Buffer size must be a multiple of "+strconv.Itoa(size*8)+"-bits"))
	}
	for i := 0; i < len(b); i += size {
		for j := 0; j < size/2; j++ {
			b[i+j], b[i+size-1-j] = b[i+size-1-j], b[i+j]
		}
	}
	return b
}

// buf.indexOf(value, byteOffset, end, encoding): the first match within [byteOffset, end)
func TnBufferIndexOfRange(b []byte, value interface{}, offset float64, end float64, enc string) float64 {
	start, stop := tnBufferBounds(len(b), offset, end)
	if stop < start {
		return -1
	}
	i := bytes.Index(b[start:stop], tnBufferBytes(value, enc))
	if i < 0 {
		return -1
	}
	return float64(start + i)
}

// buf.lastIndexOf(value, byteOffset, encoding): the last match starting at or before byteOffset
func TnBufferLastIndexOfAt(b []byte, value interface{}, offset float64, enc string) float64 {
	needle := tnBufferBytes(value, enc)
	from := len(b) - len(needle)
	if !math.IsNaN(offset) {
		o := int(math.Trunc(offset))
		if offset < 0 {
			o = len(b) + o
		}
		if o < from {
			from = o
		}
	}
	for i := from; i >= 0; i-- {
		if bytes.Equal(b[i:i+len(needle)], needle) {
			return float64(i)
		}
	}
	return -1
}

// buffer.isLatin1(string): every code point is at most U+00FF
func TnIsLatin1(s string) bool {
	for _, r := range s {
		if r > 0xff {
			return false
		}
	}
	return true
}

// Buffer.stringLength(bytes, encoding): the UTF-16 length of the decoded string
func TnBufferStringLength(b []byte, enc string) float64 {
	n := 0
	for _, r := range TnBufferToString(b, enc) {
		n++
		if r > 0xffff {
			n++
		}
	}
	return float64(n)
}

// ES2026 Uint8Array base64 / hex (strict: a SyntaxError on bad input)
type TnReadWritten struct {
	read    float64
	written float64
}

func tnBase64Options(options interface{}) (bool, string, bool) {
	url, last, omitPadding := false, "loose", false
	if options != nil {
		if a, ok := TnGetValue(options, "alphabet").(string); ok {
			if a == "base64url" {
				url = true
			} else if a != "base64" {
				panic(TnNodeError("TypeError", "", "expected alphabet to be either \\"base64\\" or \\"base64url\\""))
			}
		}
		if l, ok := TnGetValue(options, "lastChunkHandling").(string); ok {
			if l != "loose" && l != "strict" && l != "stop-before-partial" {
				panic(TnNodeError("TypeError", "", "expected lastChunkHandling to be either \\"loose\\", \\"strict\\", or \\"stop-before-partial\\""))
			}
			last = l
		}
		omitPadding = TnTruthy(TnGetValue(options, "omitPadding"))
	}
	return url, last, omitPadding
}

// u8.toBase64({ alphabet, omitPadding })
func TnUint8ToBase64(b []byte, options interface{}) string {
	url, _, omit := tnBase64Options(options)
	enc := base64.StdEncoding
	if url {
		enc = base64.URLEncoding
	}
	if omit {
		enc = enc.WithPadding(base64.NoPadding)
	}
	return enc.EncodeToString(b)
}

func tnBase64Digit(c byte, url bool) int {
	switch {
	case c >= 'A' && c <= 'Z':
		return int(c - 'A')
	case c >= 'a' && c <= 'z':
		return int(c-'a') + 26
	case c >= '0' && c <= '9':
		return int(c-'0') + 52
	case (c == '+' && !url) || (c == '-' && url):
		return 62
	case (c == '/' && !url) || (c == '_' && url):
		return 63
	}
	return -1
}

func tnBase64Space(c byte) bool {
	return c == ' ' || c == '\\t' || c == '\\n' || c == '\\f' || c == '\\r'
}

// The proposal's FromBase64: the bytes decoded (at most maxLength), the
// characters read, and an error message ("" for none)
func tnFromBase64(s string, url bool, last string, maxLength int) ([]byte, int, string) {
	out := []byte{}
	read := 0
	if maxLength == 0 {
		return out, 0, ""
	}
	chunk := make([]int, 0, 4)
	decode := func(strict bool) string {
		n := len(chunk)
		for len(chunk) < 4 {
			chunk = append(chunk, 0)
		}
		v := chunk[0]<<18 | chunk[1]<<12 | chunk[2]<<6 | chunk[3]
		bs := []byte{byte(v >> 16), byte(v >> 8), byte(v)}
		if n == 2 {
			if strict && bs[1] != 0 {
				return "Invalid base64: extra bits"
			}
			out = append(out, bs[0])
		} else if n == 3 {
			if strict && bs[2] != 0 {
				return "Invalid base64: extra bits"
			}
			out = append(out, bs[0], bs[1])
		} else {
			out = append(out, bs...)
		}
		chunk = chunk[:0]
		return ""
	}
	i := 0
	for {
		for i < len(s) && tnBase64Space(s[i]) {
			i++
		}
		if i == len(s) {
			if len(chunk) > 0 {
				if last == "stop-before-partial" {
					return out, read, ""
				}
				if last == "strict" || len(chunk) == 1 {
					return out, read, "Invalid base64: incomplete chunk"
				}
				decode(false)
			}
			return out, len(s), ""
		}
		c := s[i]
		i++
		if c == '=' {
			if len(chunk) < 2 {
				return out, read, "Invalid base64: unexpected padding"
			}
			for i < len(s) && tnBase64Space(s[i]) {
				i++
			}
			if len(chunk) == 2 {
				if i == len(s) {
					if last == "stop-before-partial" {
						return out, read, ""
					}
					return out, read, "Invalid base64: incomplete padding"
				}
				if s[i] == '=' {
					i++
					for i < len(s) && tnBase64Space(s[i]) {
						i++
					}
				}
			}
			if i < len(s) {
				return out, read, "Invalid base64: data after padding"
			}
			if msg := decode(last == "strict"); msg != "" {
				return out, read, msg
			}
			return out, len(s), ""
		}
		d := tnBase64Digit(c, url)
		if d < 0 {
			return out, read, "Invalid base64 character"
		}
		remaining := maxLength - len(out)
		if (remaining == 1 && len(chunk) == 2) || (remaining == 2 && len(chunk) == 3) {
			return out, read, ""
		}
		chunk = append(chunk, d)
		if len(chunk) == 4 {
			decode(false)
			read = i
			if len(out) >= maxLength {
				return out, read, ""
			}
		}
	}
}

// Uint8Array.fromBase64(s, { alphabet, lastChunkHandling })
func TnUint8FromBase64(s string, options interface{}) []byte {
	url, last, _ := tnBase64Options(options)
	out, _, msg := tnFromBase64(s, url, last, math.MaxInt)
	if msg != "" {
		panic(TnNodeError("SyntaxError", "", msg))
	}
	return out
}

// u8.setFromBase64(s, options): decoded into u8; { read, written }
func TnUint8SetFromBase64(dst []byte, s string, options interface{}) *TnReadWritten {
	url, last, _ := tnBase64Options(options)
	out, read, msg := tnFromBase64(s, url, last, len(dst))
	copy(dst, out)
	if msg != "" {
		panic(TnNodeError("SyntaxError", "", msg))
	}
	return &TnReadWritten{read: float64(read), written: float64(len(out))}
}

func tnFromHex(s string, maxLength int) ([]byte, int, string) {
	if len(s)%2 != 0 {
		return []byte{}, 0, "Invalid hex: odd length"
	}
	out := []byte{}
	read := 0
	for read < len(s) && len(out) < maxLength {
		b, err := hex.DecodeString(s[read : read+2])
		if err != nil {
			return out, read, "Invalid hex character"
		}
		out = append(out, b[0])
		read += 2
	}
	return out, read, ""
}

// Uint8Array.fromHex(s)
func TnUint8FromHex(s string) []byte {
	out, _, msg := tnFromHex(s, math.MaxInt)
	if msg != "" {
		panic(TnNodeError("SyntaxError", "", msg))
	}
	return out
}

// u8.setFromHex(s): { read, written }
func TnUint8SetFromHex(dst []byte, s string) *TnReadWritten {
	out, read, msg := tnFromHex(s, len(dst))
	copy(dst, out)
	if msg != "" {
		panic(TnNodeError("SyntaxError", "", msg))
	}
	return &TnReadWritten{read: float64(read), written: float64(len(out))}
}

func TnIsAscii(b []byte) bool {
	for _, c := range b {
		if c > 127 {
			return false
		}
	}
	return true
}

// buffer.transcode(source, fromEnc, toEnc)
func TnBufferTranscode(b []byte, from string, to string) []byte {
	return TnBufferFromString(TnBufferToString(b, from), to)
}

func TnBufferWriteFloat(b []byte, value float64, offset float64, size int, little bool) float64 {
	o := tnBufferCheck(b, offset, size)
	order := tnByteOrder(little)
	if size == 4 {
		order.PutUint32(b[o:], math.Float32bits(float32(value)))
	} else {
		order.PutUint64(b[o:], math.Float64bits(value))
	}
	return float64(o + size)
}

// { type: 'Buffer', data: [...] }, in that key order
func TnBufferToJSON(b []byte) *TnMap[string, interface{}] {
	data := make([]interface{}, len(b))
	for i, c := range b {
		data[i] = float64(c)
	}
	m := TnNewMap[string, interface{}]()
	m.Set("type", "Buffer")
	m.Set("data", data)
	return m
}

// <Buffer 68 69>, as console.log / util.inspect show a Buffer
func TnBufferInspect(b []byte) string {
	parts := []string{}
	for i, c := range b {
		if i == 50 {
			parts = append(parts, fmt.Sprintf("... %d more bytes", len(b)-50))
			break
		}
		parts = append(parts, fmt.Sprintf("%02x", c))
	}
	if len(parts) == 0 {
		return "<Buffer >"
	}
	return "<Buffer " + strings.Join(parts, " ") + ">"
}

func TnIsBuffer(v interface{}) bool {
	_, ok := v.([]byte)
	return ok
}

// TextDecoder: utf-8 (default), utf-16le, latin1
type TnTextDecoder struct {
	encoding string
	pending  []byte
	started  bool
}

func TnNewTextDecoder(label string) *TnTextDecoder {
	switch strings.ToLower(label) {
	case "", "utf8", "utf-8", "unicode-1-1-utf-8":
		return &TnTextDecoder{encoding: "utf-8"}
	case "utf-16le", "utf-16":
		return &TnTextDecoder{encoding: "utf-16le"}
	case "latin1", "iso-8859-1", "ascii", "us-ascii", "windows-1252":
		return &TnTextDecoder{encoding: "windows-1252"}
	}
	panic(TnNodeError("RangeError", "ERR_ENCODING_NOT_SUPPORTED", "The \\""+label+"\\" encoding is not supported"))
}

// Length of an incomplete UTF-8 sequence at the end of b
func tnUTF8Tail(b []byte) int {
	for i := 1; i <= 3 && i <= len(b); i++ {
		c := b[len(b)-i]
		if c&0xC0 == 0x80 {
			continue
		}
		need := 1
		switch {
		case c&0xE0 == 0xC0:
			need = 2
		case c&0xF0 == 0xE0:
			need = 3
		case c&0xF8 == 0xF0:
			need = 4
		}
		if need > i {
			return i
		}
		return 0
	}
	return 0
}

// decode(input?, { stream }): with stream, a character split across calls is
// kept for the next one
func (d *TnTextDecoder) decode(args ...interface{}) string {
	var b []byte
	if len(args) > 0 && args[0] != nil {
		switch x := args[0].(type) {
		case []byte:
			b = x
		case string:
			b = []byte(x)
		default:
			b = TnAs[[]byte](x)
		}
	}
	stream := false
	if len(args) > 1 && args[1] != nil {
		stream, _ = TnGetValue(args[1], "stream").(bool)
	}
	data := b
	if len(d.pending) > 0 {
		data = append(append([]byte{}, d.pending...), b...)
		d.pending = nil
	}
	if stream {
		keep := 0
		switch d.encoding {
		case "utf-8":
			keep = tnUTF8Tail(data)
		case "utf-16le":
			keep = len(data) % 2
		}
		if keep > 0 {
			d.pending = append([]byte{}, data[len(data)-keep:]...)
			data = data[:len(data)-keep]
		}
	}
	first := !d.started
	d.started = stream
	switch d.encoding {
	case "utf-16le":
		return TnBufferToString(data, "utf16le")
	case "windows-1252":
		return TnBufferToString(data, "latin1")
	}
	// A leading BOM is dropped
	if first {
		data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
	}
	return tnDecodeUTF8(data)
}

type TnTextEncoder struct {
	encoding string
}

func (e *TnTextEncoder) encode(s ...string) []byte {
	if len(s) == 0 {
		return []byte{}
	}
	return []byte(s[0])
}

// atob / btoa: base64 of latin1 strings
func TnBtoa(s string) string {
	for _, r := range s {
		if r > 0xFF {
			panic(TnNodeError("InvalidCharacterError", "", "Invalid character"))
		}
	}
	return base64.StdEncoding.EncodeToString(TnBufferFromString(s, "latin1"))
}

func TnAtob(s string) string {
	return TnBufferToString(TnBufferFromString(s, "base64"), "latin1")
}`;

// Go expression for an encoding argument ('' → utf8)
function encArg(call: NodeCall, index: number): string {
  const arg = call.args[index];
  if (arg === undefined || call.types[index] !== 'string') return '""';
  return arg;
}

// Go expression for numeric bounds arguments (start, end), as variadic float64s
function boundsArgs(call: NodeCall, from: number): string {
  const out: string[] = [];
  for (let i = from; i < call.args.length && i < from + 2; i++) out.push(call.args[i]);
  return out.length > 0 ? `, ${out.join(', ')}` : '';
}

export function registerBuffer(r: NodeRegistry): void {
  defineModule(r, 'buffer');
  defineHelper(
    r,
    'buffer',
    ['bytes', 'encoding/base64', 'encoding/binary', 'encoding/hex', 'fmt', 'math', 'math/big', 'strconv', 'strings', 'unicode/utf16', 'unicode/utf8'],
    ['error', 'dynamic', 'orderedMap'],
    bufferHelper
  );
  // Uint8Array first: Buffer owns the []byte instance methods
  defineClass(r, 'globals.Uint8Array', '[]byte', 'Buffer', '', '', '', '');
  defineClass(r, 'buffer.Buffer', '[]byte', 'Buffer', '', '', '', '');
  defineClass(r, 'util.TextEncoder', '*TnTextEncoder', 'class', 'encode=[]byte', 'encoding=string', '', '');
  defineClass(r, 'util.TextDecoder', '*TnTextDecoder', 'class', 'decode=string', 'encoding=string', '', '');
  r.globals['Buffer'] = 'buffer.Buffer';
  r.globals['Uint8Array'] = 'globals.Uint8Array';
  r.globals['TextEncoder'] = 'util.TextEncoder';
  r.globals['TextDecoder'] = 'util.TextDecoder';
  r.globals['atob'] = 'buffer.atob';
  r.globals['btoa'] = 'buffer.btoa';
  const use = () => r.helper('buffer');

  // --- statics ---
  const from = (call: NodeCall) => {
    use();
    const type = call.types[0];
    const enc = encArg(call, 1);
    if (type === 'string') return `TnBufferFromString(${call.args[0]}, ${enc})`;
    if (type === '[]byte') return `append([]byte{}, ${call.args[0]}...)`;
    if (type === '[]float64') return `TnBufferFromNumbers(${call.args[0]})`;
    return `TnBufferFrom(${call.args[0]}, ${enc})`;
  };
  r.functions['buffer.Buffer.from'] = from;
  r.functions['globals.Uint8Array.from'] = from;
  r.functions['buffer.Buffer.alloc'] = (call: NodeCall) => {
    use();
    return `TnBufferAlloc(${call.args.join(', ')})`;
  };
  r.functions['buffer.Buffer.allocUnsafe'] = (call: NodeCall) => `make([]byte, int(${call.args[0]}))`;
  r.functions['buffer.Buffer.allocUnsafeSlow'] = r.functions['buffer.Buffer.allocUnsafe'];
  r.functions['buffer.Buffer.concat'] = (call: NodeCall) => {
    use();
    return `TnBufferConcat(${call.args.join(', ')})`;
  };
  r.functions['buffer.Buffer.byteLength'] = (call: NodeCall) => {
    use();
    if (call.types[0] === '[]byte') return `float64(len(${call.args[0]}))`;
    return `float64(len(TnBufferFromString(${call.args[0]}, ${encArg(call, 1)})))`;
  };
  // Buffer.stringLength(bytes, encoding): the length of the string they decode to
  r.functions['buffer.Buffer.stringLength'] = (call: NodeCall) => {
    use();
    return `TnBufferStringLength(${call.args[0]}, ${encArg(call, 1)})`;
  };
  r.results['buffer.Buffer.stringLength'] = 'float64';
  // Buffer.poolSize: 64 KiB (Node 26)
  r.values['buffer.Buffer.poolSize'] = (_c: NodeCall) => 'float64(65536)';
  r.valueTypes['buffer.Buffer.poolSize'] = 'float64';
  r.functions['buffer.Buffer.isBuffer'] = (call: NodeCall) => {
    use();
    return `TnIsBuffer(${call.args[0]})`;
  };
  r.functions['buffer.Buffer.isEncoding'] = (call: NodeCall) => {
    use();
    return `TnIsEncoding(${call.args[0]})`;
  };
  r.functions['buffer.Buffer.compare'] = (call: NodeCall) => {
    r.pkg('bytes');
    return `float64(bytes.Compare(${call.args[0]}, ${call.args[1]}))`;
  };
  setResults(
    r,
    'buffer.Buffer',
    'from=[]byte; alloc=[]byte; allocUnsafe=[]byte; allocUnsafeSlow=[]byte; concat=[]byte; byteLength=float64; isBuffer=bool; isEncoding=bool; compare=float64'
  );
  r.results['globals.Uint8Array.from'] = '[]byte';
  // Uint8Array.fromBase64(s) / u8.toBase64() (ES2026)
  r.functions['globals.Uint8Array.fromBase64'] = (call: NodeCall) => {
    use();
    return `TnBufferFromString(${call.args[0]}, "base64")`;
  };
  r.results['globals.Uint8Array.fromBase64'] = '[]byte';
  // (with options: strict decoding, alphabet / lastChunkHandling)
  r.functions['globals.Uint8Array.fromBase64'] = (call: NodeCall) => {
    use();
    return `TnUint8FromBase64(${call.args[0]}, ${call.args[1] ?? 'nil'})`;
  };
  r.functions['globals.Uint8Array.fromHex'] = (call: NodeCall) => {
    use();
    return `TnUint8FromHex(${call.args[0]})`;
  };
  r.results['globals.Uint8Array.fromHex'] = '[]byte';
  defineClass(r, 'globals.Uint8ArrayReadWritten', '*TnReadWritten', 'class', '', 'read=float64; written=float64', '', '');
  r.functions['buffer.atob'] = (call: NodeCall) => {
    use();
    return `TnAtob(${call.args[0]})`;
  };
  r.functions['buffer.btoa'] = (call: NodeCall) => {
    use();
    return `TnBtoa(${call.args[0]})`;
  };
  setResults(r, 'buffer', 'atob=string; btoa=string');
  for (const size of [16, 32, 64]) {
    r.methods[`buffer.Buffer#swap${size}`] = (call: NodeCall) => {
      use();
      return `TnBufferSwap(${call.recv}, ${size / 8})`;
    };
    r.results[`buffer.Buffer#swap${size}`] = '[]byte';
  }
  r.functions['buffer.isUtf8'] = (call: NodeCall) => {
    r.pkg('unicode/utf8');
    return `utf8.Valid(${call.args[0]})`;
  };
  r.functions['buffer.isLatin1'] = (call: NodeCall) => {
    use();
    return `TnIsLatin1(${call.args[0]})`;
  };
  r.results['buffer.isLatin1'] = 'bool';
  r.functions['buffer.isAscii'] = (call: NodeCall) => {
    use();
    return `TnIsAscii(${call.args[0]})`;
  };
  r.functions['buffer.transcode'] = (call: NodeCall) => {
    use();
    return `TnBufferTranscode(${call.args.join(', ')})`;
  };
  setResults(r, 'buffer', 'isUtf8=bool; isAscii=bool; transcode=[]byte');
  for (const name of ['kMaxLength', 'constants.MAX_LENGTH']) {
    r.values[`buffer.${name}`] = (_c: NodeCall) => 'float64(9007199254740991)';
    r.valueTypes[`buffer.${name}`] = 'float64';
  }
  for (const name of ['kStringMaxLength', 'constants.MAX_STRING_LENGTH']) {
    r.values[`buffer.${name}`] = (_c: NodeCall) => 'float64(536870888)';
    r.valueTypes[`buffer.${name}`] = 'float64';
  }
  r.values['buffer.constants.MAX_LENGTH'] = (_c: NodeCall) => 'float64(9007199254740991)';
  r.valueTypes['buffer.constants.MAX_LENGTH'] = 'float64';

  // --- constructors ---
  r.constructors['globals.Uint8Array'] = (call: NodeCall) => {
    const type = call.types[0];
    if (call.args.length === 0) return '[]byte{}';
    // new Uint8Array(arrayBuffer, byteOffset?, length?): a view sharing its memory
    // (a resizable buffer's bytes now — the view doesn't follow later resizes —
    // and a TypeError for a detached one)
    if (r.isArrayBuffer(call.nodes[0])) {
      r.helper('typedArrays');
      const buf = `TnArrayBufferForView(${call.args[0]})`;
      if (call.args.length === 1) return buf;
      const start = `int(${call.args[1]})`;
      if (call.args.length === 2) return `${buf}[${start}:]`;
      return `${buf}[${start}:${start}+int(${call.args[2]})]`;
    }
    if (type === 'float64') return `make([]byte, int(${call.args[0]}))`;
    use();
    if (type === '[]byte') return `append([]byte{}, ${call.args[0]}...)`;
    if (type === '[]float64') return `TnBufferFromNumbers(${call.args[0]})`;
    return `TnBufferFrom(${call.args[0]}, "")`;
  };
  r.constructors['util.TextEncoder'] = (_c: NodeCall) => {
    use();
    return '&TnTextEncoder{encoding: "utf-8"}';
  };
  r.constructors['util.TextDecoder'] = (call: NodeCall) => {
    use();
    return `TnNewTextDecoder(${call.args[0] ?? '""'})`;
  };

  // --- instance methods ---
  const method = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.methods[`buffer.Buffer#${name}`] = (call: NodeCall) => {
      use();
      return emit(call);
    };
    if (result) r.results[`buffer.Buffer#${name}`] = result;
  };
  method('toString', 'string', (c: NodeCall) => `TnBufferToString(${c.recv}, ${encArg(c, 0)}${boundsArgs(c, 1)})`);
  method('toBase64', 'string', (c: NodeCall) => (c.args.length > 0 ? `TnUint8ToBase64(${c.recv}, ${c.args[0]})` : `TnBufferToString(${c.recv}, "base64")`));
  method('toHex', 'string', (c: NodeCall) => `TnBufferToString(${c.recv}, "hex")`);
  method('setFromBase64', '*TnReadWritten', (c: NodeCall) => `TnUint8SetFromBase64(${c.recv}, ${c.args[0]}, ${c.args[1] ?? 'nil'})`);
  method('setFromHex', '*TnReadWritten', (c: NodeCall) => `TnUint8SetFromHex(${c.recv}, ${c.args[0]})`);
  method('toJSON', '*TnMap[string, interface{}]', (c: NodeCall) => `TnBufferToJSON(${c.recv})`);
  method('equals', 'bool', (c: NodeCall) => `bytes.Equal(${c.recv}, ${c.args[0]})`);
  method('compare', 'float64', (c: NodeCall) => `float64(bytes.Compare(${c.recv}, ${c.args[0]}))`);
  method('subarray', '[]byte', (c: NodeCall) => `TnBufferSlice(${c.recv}${boundsArgs(c, 0)})`);
  method('slice', '[]byte', (c: NodeCall) => `TnBufferSlice(${c.recv}${boundsArgs(c, 0)})`);
  // indexOf / includes (value, byteOffset?, end?, encoding?): an end bounds the search (Node 26)
  const indexOf = (c: NodeCall): string => {
    if (c.types[1] === 'float64' && c.types[2] === 'float64') {
      return `TnBufferIndexOfRange(${c.recv}, ${c.args[0]}, ${c.args[1]}, ${c.args[2]}, ${encArg(c, 3)})`;
    }
    return `TnBufferIndexOf(${c.recv}, ${c.args[0]}, ${c.types[1] === 'float64' ? c.args[1] : '0'}, ${c.types[1] === 'string' ? c.args[1] : encArg(c, 2)})`;
  };
  method('indexOf', 'float64', indexOf);
  method('lastIndexOf', 'float64', (c: NodeCall) => {
    r.pkg('math');
    return `TnBufferLastIndexOfAt(${c.recv}, ${c.args[0]}, ${c.types[1] === 'float64' ? c.args[1] : 'math.NaN()'}, ${c.types[1] === 'string' ? c.args[1] : encArg(c, 2)})`;
  });
  method('includes', 'bool', (c: NodeCall) => `(${indexOf(c)} >= 0)`);
  method('fill', '[]byte', (c: NodeCall) => {
    const enc = c.types[1] === 'string' ? c.args[1] : '""';
    const bounds = c.types[1] === 'string' ? '' : boundsArgs(c, 1);
    return `TnBufferFill(${c.recv}, ${c.args[0]}, ${enc}${bounds})`;
  });
  method('write', 'float64', (c: NodeCall) => `TnBufferWrite(${c.recv}, ${c.args.join(', ')})`);
  method('copy', 'float64', (c: NodeCall) => `TnBufferCopy(${c.recv}, ${c.args.join(', ')})`);
  method('at', 'float64', (c: NodeCall) => `float64(TnAt(${c.recv}, func() float64 { if __i := ${c.args[0]}; __i < 0 { return float64(len(${c.recv})) + __i } else { return __i } }()))`);
  method('set', '', (c: NodeCall) => `copy(${c.recv}[int(${c.args[1] ?? '0'}):], ${c.args[0]})`);
  method('toLocaleString', 'string', (c: NodeCall) => `TnBufferToString(${c.recv}, "")`);
  method('inspect', 'string', (c: NodeCall) => `TnBufferInspect(${c.recv})`);
  const widths: Record<string, number> = { '8': 1, '16': 2, '32': 4 };
  for (const bits of Object.keys(widths)) {
    const size = widths[bits];
    const endians = bits === '8' ? [''] : ['LE', 'BE'];
    for (const endian of endians) {
      const little = endian === 'LE' ? 'true' : 'false';
      for (const u of ['UInt', 'Uint']) {
        method(`read${u}${bits}${endian}`, 'float64', (c: NodeCall) => `TnBufferReadUint(${c.recv}, ${c.args[0] ?? '0'}, ${size}, ${little})`);
        method(`write${u}${bits}${endian}`, 'float64', (c: NodeCall) => `TnBufferWriteInt(${c.recv}, ${c.args[0]}, ${c.args[1] ?? '0'}, ${size}, ${little})`);
      }
      method(`readInt${bits}${endian}`, 'float64', (c: NodeCall) => `TnBufferReadInt(${c.recv}, ${c.args[0] ?? '0'}, ${size}, ${little})`);
      method(`writeInt${bits}${endian}`, 'float64', (c: NodeCall) => `TnBufferWriteInt(${c.recv}, ${c.args[0]}, ${c.args[1] ?? '0'}, ${size}, ${little})`);
    }
  }
  for (const endian of ['LE', 'BE']) {
    const little = endian === 'LE' ? 'true' : 'false';
    for (const kind of ['Int', 'UInt', 'Uint']) {
      const signed = kind === 'Int' ? 'true' : 'false';
      method(`readBig${kind}64${endian}`, '*tnbig.Int', (c: NodeCall) => `TnBufferReadBigInt64(${c.recv}, ${c.args[0] ?? '0'}, ${little}, ${signed})`);
      method(`writeBig${kind}64${endian}`, 'float64', (c: NodeCall) => `TnBufferWriteBigInt64(${c.recv}, ${c.args[0]}, ${c.args[1] ?? '0'}, ${little}, ${signed})`);
    }
    method(`readFloat${endian}`, 'float64', (c: NodeCall) => `TnBufferReadFloat(${c.recv}, ${c.args[0] ?? '0'}, 4, ${little})`);
    method(`readDouble${endian}`, 'float64', (c: NodeCall) => `TnBufferReadFloat(${c.recv}, ${c.args[0] ?? '0'}, 8, ${little})`);
    method(`writeFloat${endian}`, 'float64', (c: NodeCall) => `TnBufferWriteFloat(${c.recv}, ${c.args[0]}, ${c.args[1] ?? '0'}, 4, ${little})`);
    method(`writeDouble${endian}`, 'float64', (c: NodeCall) => `TnBufferWriteFloat(${c.recv}, ${c.args[0]}, ${c.args[1] ?? '0'}, 8, ${little})`);
  }
}
