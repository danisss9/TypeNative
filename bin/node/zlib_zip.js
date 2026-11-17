// node:zlib ZIP archives (Node 26.8): ZipEntry / ZipBuffer / ZipFile,
// createZipArchive(Sync), zipFiles and the content-size limit.
//
// Laid out byte for byte as Node writes them (lib/internal/zip): local headers
// with a Zip64 extra for streamed or oversized members, a Zip64 data
// descriptor after streamed content, an extended-timestamp extra when the DOS
// fields cannot hold the time, the same central-directory and trailer records.
// Members inflate / deflate with compress/flate. ZipFile edits the archive in
// place like Node: new members go where the central directory starts, which is
// rewritten after them; compact() drops the dead space.
export const zipHelper = `// node:zlib ZIP archives
var tnMaxZipContentSize = float64(268435456)

func TnGetMaxZipContentSize() float64 { return tnMaxZipContentSize }

func TnSetMaxZipContentSize(size float64) {
	if math.IsNaN(size) || size != math.Trunc(size) || size < 0 || size > 9007199254740991 {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"size\\" is out of range. It must be >= 0 && <= 9007199254740991. Received "+TnNumStr(size)))
	}
	tnMaxZipContentSize = size
}

const (
	tnZipSigLocal    = 0x04034b50
	tnZipSigDesc     = 0x08074b50
	tnZipSigCentral  = 0x02014b50
	tnZipSigZ64End   = 0x06064b50
	tnZipSigZ64Loc   = 0x07064b50
	tnZipSigEnd      = 0x06054b50
	tnZipUnix        = 3
	tnZipZ64Extra    = 0x0001
	tnZipS16         = 0xffff
	tnZipS32         = 0xffffffff
	tnZipEncrypted   = 0x0001
	tnZipDescriptor  = 0x0008
	tnZipUTF8        = 0x0800
	tnZipStore       = 0
	tnZipDeflate     = 8
	tnZipZstd        = 93
	tnZipTailLength  = 22 + 0xffff + 20 + 56 + 4096
	tnZipReadChunk   = 4 * 1024 * 1024
	tnZipIfReg       = 0o100000
	tnZipIfDir       = 0o040000
	tnZipIfLnk       = 0o120000
	tnZipIfMt        = 0o170000
)

var tnZipZstdDecode func(data []byte, limit int) ([]byte, error)

func tnZipQuote(s string) string {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.Encode(s)
	return strings.TrimSuffix(buf.String(), "\\n")
}

// util.inspect's rendering of the values these errors quote
func tnZipInspect(v interface{}) string {
	switch x := v.(type) {
	case string:
		return "'" + x + "'"
	case []byte:
		parts := []string{}
		for i, c := range x {
			if i == 50 {
				parts = append(parts, "... "+strconv.Itoa(len(x)-50)+" more bytes")
				break
			}
			parts = append(parts, strconv.FormatUint(uint64(c)|0x100, 16)[1:])
		}
		return "<Buffer " + strings.Join(parts, " ") + ">"
	case bool:
		return strconv.FormatBool(x)
	case float64:
		return TnNumStr(x)
	case nil:
		return "undefined"
	}
	return "[object Object]"
}

func tnZipErr(code string, message string) *TnError {
	switch code {
	case "ERR_ZIP_ENTRY_TOO_LARGE":
		return TnNodeError("RangeError", code, "ZIP entry exceeds the allowed size: "+message)
	case "ERR_ZIP_ARCHIVE_TOO_LARGE":
		return TnNodeError("RangeError", code, "ZIP archive structure exceeds the allowed size: "+message)
	case "ERR_ZIP_ENTRY_CORRUPT":
		return TnNodeError("Error", code, "ZIP entry is corrupt: "+message)
	case "ERR_ZIP_INVALID_ARCHIVE":
		return TnNodeError("Error", code, "invalid ZIP archive: "+message)
	case "ERR_ZIP_UNSUPPORTED_FEATURE":
		return TnNodeError("Error", code, "unsupported ZIP feature: "+message)
	case "ERR_ZIP_ENTRY_NOT_FOUND":
		return TnNodeError("Error", code, "no such entry "+tnZipQuote(message)+" in the archive")
	case "ERR_ZIP_NOT_WRITABLE":
		return TnNodeError("TypeError", code, "this archive was not opened for writing")
	case "ERR_INVALID_STATE":
		return TnNodeError("Error", code, "Invalid state: "+message)
	}
	return TnNodeError("Error", code, message)
}

// An option's value (nil when absent), through pointers
func tnZipOpt(options interface{}, key string) interface{} {
	if options == nil || TnIsNil(options) {
		return nil
	}
	v := TnGetValue(options, key)
	if v == nil || TnIsNil(v) {
		return nil
	}
	rv := reflect.ValueOf(v)
	for rv.Kind() == reflect.Pointer {
		if rv.IsNil() {
			return nil
		}
		rv = rv.Elem()
	}
	return rv.Interface()
}

func tnZipFirst(options []interface{}) interface{} {
	if len(options) == 0 {
		return nil
	}
	return options[0]
}

func tnZipBytes(v interface{}) []byte {
	if b, ok := v.([]byte); ok {
		return b
	}
	return TnBufferFrom(v, "")
}

// ---- DOS times, text decoding, extra fields ----

func tnZipDosDecode(t uint16, d uint16) time.Time {
	month := int((d >> 5) & 0x0f)
	if month == 0 {
		month = 1
	}
	day := int(d & 0x1f)
	if day == 0 {
		day = 1
	}
	return time.Date(int((d>>9)&0x7f)+1980, time.Month(month), day, int((t>>11)&0x1f), int((t>>5)&0x3f), int(t&0x1f)*2, 0, time.Local)
}

func tnZipDosEncode(value time.Time) (uint16, uint16) {
	if value.IsZero() {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'modified' must be a valid Date. Received Invalid Date"))
	}
	v := value.In(time.Local)
	year := v.Year()
	if year < 1980 {
		return 0, (1 << 5) | 1
	}
	if year > 2107 {
		return (23 << 11) | (59 << 5) | 29, (127 << 9) | (12 << 5) | 31
	}
	date := uint16(((year - 1980) << 9) | (int(v.Month()) << 5) | v.Day())
	tm := uint16((v.Hour() << 11) | (v.Minute() << 5) | (v.Second() >> 1))
	return tm, date
}

var tnZipCp437 = []rune{
	0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7, 0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec, 0x00c4, 0x00c5,
	0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9, 0x00ff, 0x00d6, 0x00dc, 0x00a2, 0x00a3, 0x00a5, 0x20a7, 0x0192,
	0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba, 0x00bf, 0x2310, 0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb,
	0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556, 0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b, 0x2510,
	0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x255e, 0x255f, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567,
	0x2568, 0x2564, 0x2565, 0x2559, 0x2558, 0x2552, 0x2553, 0x256b, 0x256a, 0x2518, 0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580,
	0x03b1, 0x00df, 0x0393, 0x03c0, 0x03a3, 0x03c3, 0x00b5, 0x03c4, 0x03a6, 0x0398, 0x03a9, 0x03b4, 0x221e, 0x03c6, 0x03b5, 0x2229,
	0x2261, 0x00b1, 0x2265, 0x2264, 0x2320, 0x2321, 0x00f7, 0x2248, 0x00b0, 0x2219, 0x00b7, 0x221a, 0x207f, 0x00b2, 0x25a0, 0x00a0,
}

func tnZipText(b []byte, flags uint16) string {
	if flags&tnZipUTF8 != 0 || utf8.Valid(b) {
		return string(b)
	}
	var sb strings.Builder
	for _, c := range b {
		if c < 0x80 {
			sb.WriteByte(c)
		} else {
			sb.WriteRune(tnZipCp437[c-0x80])
		}
	}
	return sb.String()
}

func tnZipEachExtra(extra []byte, fn func(id uint16, body []byte)) {
	for pos := 0; pos+4 <= len(extra); {
		id := binary.LittleEndian.Uint16(extra[pos:])
		size := int(binary.LittleEndian.Uint16(extra[pos+2:]))
		if pos+4+size > len(extra) {
			return
		}
		fn(id, extra[pos+4:pos+4+size])
		pos += 4 + size
	}
}

func tnZipName(name []byte, flags uint16, extra []byte) string {
	result := ""
	found := false
	tnZipEachExtra(extra, func(id uint16, body []byte) {
		if found || id != 0x7075 || len(body) < 5 || body[0] != 1 {
			return
		}
		if binary.LittleEndian.Uint32(body[1:]) != crc32.ChecksumIEEE(name) {
			return
		}
		result, found = string(body[5:]), true
	})
	if found {
		return result
	}
	return tnZipText(name, flags)
}

// The modification time an NTFS, extended-timestamp or old Unix extra records
func tnZipExtraMtime(extras ...[]byte) (time.Time, bool) {
	var ntfs, ext, unix *time.Time
	for _, extra := range extras {
		tnZipEachExtra(extra, func(id uint16, body []byte) {
			switch id {
			case 0x000a:
				if ntfs != nil || len(body) < 4 {
					return
				}
				for pos := 4; pos+4 <= len(body); {
					tag := binary.LittleEndian.Uint16(body[pos:])
					size := int(binary.LittleEndian.Uint16(body[pos+2:]))
					if tag == 1 && size >= 8 && pos+12 <= len(body) {
						ticks := int64(binary.LittleEndian.Uint64(body[pos+4:]))
						t := time.UnixMilli((ticks - 116444736000000000) / 10000)
						ntfs = &t
						return
					}
					pos += 4 + size
				}
			case 0x5455:
				if ext != nil || len(body) < 5 || body[0]&1 == 0 {
					return
				}
				t := time.Unix(int64(int32(binary.LittleEndian.Uint32(body[1:]))), 0)
				ext = &t
			case 0x5855:
				if unix != nil || len(body) < 8 {
					return
				}
				t := time.Unix(int64(int32(binary.LittleEndian.Uint32(body[4:]))), 0)
				unix = &t
			}
		})
	}
	switch {
	case ntfs != nil:
		return ntfs.Local(), true
	case ext != nil:
		return ext.Local(), true
	case unix != nil:
		return unix.Local(), true
	}
	return time.Time{}, false
}

func tnZipStripZip64(extra []byte) []byte {
	var out []byte
	tnZipEachExtra(extra, func(id uint16, body []byte) {
		if id == tnZipZ64Extra {
			return
		}
		out = binary.LittleEndian.AppendUint16(out, id)
		out = binary.LittleEndian.AppendUint16(out, uint16(len(body)))
		out = append(out, body...)
	})
	if out == nil {
		return []byte{}
	}
	return out
}

// ---- entry metadata and header records ----

type tnZipMeta struct {
	name, comment, extra []byte
	flags, method        uint16
	crc                  uint32
	compressedSize       int64
	uncompressedSize     int64
	modified             time.Time
	extMtime             int64
	hasExtMtime          bool
	external             uint32
	internal             uint16
	madeBy               uint16
	pending              bool
}

func tnZipExtendedMtime(t time.Time) (int64, bool) {
	ms := TnDateMs(t)
	seconds := math.Floor(ms / 1000)
	if math.Mod(ms, 2000) != 0 && seconds >= -2147483648 && seconds <= 2147483647 {
		return int64(seconds), true
	}
	return 0, false
}

func tnZipInvalidArg(name string, value interface{}, reason string) *TnError {
	return TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument '"+name+"' "+reason+". Received "+tnZipInspect(value))
}

func tnZipCreateMeta(filename string, options interface{}, symlink bool) *tnZipMeta {
	name := []byte(filename)
	if len(name) == 0 {
		panic(tnZipInvalidArg("filename", filename, "must not be empty"))
	}
	if len(name) > tnZipS16 {
		panic(tnZipErr("ERR_ZIP_ENTRY_TOO_LARGE", "the entry name must not exceed 65535 bytes when encoded as UTF-8"))
	}
	comment := []byte{}
	if c := tnZipOpt(options, "comment"); c != nil {
		text, _ := c.(string)
		comment = []byte(text)
		if len(comment) > tnZipS16 {
			panic(tnZipErr("ERR_ZIP_ENTRY_TOO_LARGE", "the entry comment must not exceed 65535 bytes when encoded as UTF-8"))
		}
	}
	isDir := !symlink && strings.HasSuffix(filename, "/")
	mode := float64(0o644)
	if symlink {
		mode = 0o777
	} else if isDir {
		mode = 0o755
	}
	if m, ok := tnZipOpt(options, "mode").(float64); ok {
		if m != math.Trunc(m) || m < 0 || m > 4294967295 {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.mode\\" is out of range. It must be >= 0 && <= 4294967295. Received "+TnNumStr(m)))
		}
		mode = m
	}
	modified := TnDateFromMs(math.Floor(float64(time.Now().UnixMilli())/2000) * 2000)
	if m := tnZipOpt(options, "modified"); m != nil {
		t, ok := m.(time.Time)
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.modified\\" property must be an instance of Date."))
		}
		modified = t
	}
	if m := tnZipOpt(options, "method"); m != nil {
		if s, _ := m.(string); s != "deflate" && s != "store" && s != "zstd" {
			panic(tnZipInvalidArg("options.method", m, "must be 'deflate', 'store', or 'zstd'"))
		}
	}
	typeBits := uint32(tnZipIfReg)
	if symlink {
		typeBits = tnZipIfLnk
	} else if isDir {
		typeBits = tnZipIfDir
	}
	unixAttrs := (typeBits | (uint32(mode) & 0o7777)) & tnZipS16
	external := unixAttrs << 16
	if isDir {
		external |= 0x10
	}
	ext, hasExt := tnZipExtendedMtime(modified)
	return &tnZipMeta{name: name, comment: comment, extra: []byte{}, flags: tnZipUTF8, modified: modified,
		extMtime: ext, hasExtMtime: hasExt, external: external, madeBy: tnZipUnix, pending: true}
}

func tnZipExtTimestamp(seconds int64) []byte {
	b := []byte{0x55, 0x54, 5, 0, 1, 0, 0, 0, 0}
	binary.LittleEndian.PutUint32(b[5:], uint32(int32(seconds)))
	return b
}

func tnZipVersion(meta *tnZipMeta, zip64 bool) uint16 {
	v := uint16(20)
	if zip64 {
		v = 45
	}
	if meta.method == tnZipZstd && v < 63 {
		v = 63
	}
	return v
}

func tnZipCheckExtra(length int) {
	if length > tnZipS16 {
		panic(tnZipErr("ERR_ZIP_ENTRY_TOO_LARGE", "the entry extra fields must not exceed 65535 bytes"))
	}
}

func tnZipU16(b []byte, v uint16) []byte { return binary.LittleEndian.AppendUint16(b, v) }
func tnZipU32(b []byte, v uint32) []byte { return binary.LittleEndian.AppendUint32(b, v) }
func tnZipU64(b []byte, v int64) []byte  { return binary.LittleEndian.AppendUint64(b, uint64(v)) }

func tnZipLocalHeader(meta *tnZipMeta) []byte {
	streaming := meta.flags&tnZipDescriptor != 0
	zip64 := streaming || meta.compressedSize >= tnZipS32 || meta.uncompressedSize >= tnZipS32
	var ts []byte
	if meta.hasExtMtime {
		ts = tnZipExtTimestamp(meta.extMtime)
	}
	extraLength := len(ts) + len(meta.extra)
	if zip64 {
		extraLength += 20
	}
	tnZipCheckExtra(extraLength)
	b := make([]byte, 0, 30+len(meta.name)+extraLength)
	b = tnZipU32(b, tnZipSigLocal)
	b = tnZipU16(b, tnZipVersion(meta, zip64))
	b = tnZipU16(b, meta.flags)
	b = tnZipU16(b, meta.method)
	tm, date := tnZipDosEncode(meta.modified)
	b = tnZipU16(b, tm)
	b = tnZipU16(b, date)
	if streaming {
		b = tnZipU32(b, 0)
	} else {
		b = tnZipU32(b, meta.crc)
	}
	if zip64 {
		b = tnZipU32(b, tnZipS32)
		b = tnZipU32(b, tnZipS32)
	} else {
		b = tnZipU32(b, uint32(meta.compressedSize))
		b = tnZipU32(b, uint32(meta.uncompressedSize))
	}
	b = tnZipU16(b, uint16(len(meta.name)))
	b = tnZipU16(b, uint16(extraLength))
	b = append(b, meta.name...)
	if zip64 {
		b = tnZipU16(b, tnZipZ64Extra)
		b = tnZipU16(b, 16)
		if streaming {
			b = tnZipU64(b, 0)
			b = tnZipU64(b, 0)
		} else {
			b = tnZipU64(b, meta.uncompressedSize)
			b = tnZipU64(b, meta.compressedSize)
		}
	}
	b = append(b, ts...)
	return append(b, meta.extra...)
}

func tnZipCentralHeader(meta *tnZipMeta, localOffset int64) []byte {
	u64 := meta.uncompressedSize >= tnZipS32
	c64 := meta.compressedSize >= tnZipS32
	o64 := localOffset >= tnZipS32
	fields := 0
	for _, f := range []bool{u64, c64, o64} {
		if f {
			fields++
		}
	}
	var ts []byte
	if meta.hasExtMtime {
		ts = tnZipExtTimestamp(meta.extMtime)
	}
	extraLength := len(ts) + len(meta.extra)
	if fields > 0 {
		extraLength += 4 + 8*fields
	}
	tnZipCheckExtra(extraLength)
	version := tnZipVersion(meta, meta.flags&tnZipDescriptor != 0 || fields > 0)
	b := make([]byte, 0, 46+len(meta.name)+extraLength+len(meta.comment))
	b = tnZipU32(b, tnZipSigCentral)
	b = tnZipU16(b, (meta.madeBy<<8)|version)
	b = tnZipU16(b, version)
	b = tnZipU16(b, meta.flags)
	b = tnZipU16(b, meta.method)
	tm, date := tnZipDosEncode(meta.modified)
	b = tnZipU16(b, tm)
	b = tnZipU16(b, date)
	b = tnZipU32(b, meta.crc)
	if c64 {
		b = tnZipU32(b, tnZipS32)
	} else {
		b = tnZipU32(b, uint32(meta.compressedSize))
	}
	if u64 {
		b = tnZipU32(b, tnZipS32)
	} else {
		b = tnZipU32(b, uint32(meta.uncompressedSize))
	}
	b = tnZipU16(b, uint16(len(meta.name)))
	b = tnZipU16(b, uint16(extraLength))
	b = tnZipU16(b, uint16(len(meta.comment)))
	b = tnZipU16(b, 0)
	b = tnZipU16(b, meta.internal)
	b = tnZipU32(b, meta.external)
	if o64 {
		b = tnZipU32(b, tnZipS32)
	} else {
		b = tnZipU32(b, uint32(localOffset))
	}
	b = append(b, meta.name...)
	if fields > 0 {
		b = tnZipU16(b, tnZipZ64Extra)
		b = tnZipU16(b, uint16(8*fields))
		if u64 {
			b = tnZipU64(b, meta.uncompressedSize)
		}
		if c64 {
			b = tnZipU64(b, meta.compressedSize)
		}
		if o64 {
			b = tnZipU64(b, localOffset)
		}
	}
	b = append(b, ts...)
	b = append(b, meta.extra...)
	return append(b, meta.comment...)
}

func tnZipDataDescriptor(crc uint32, compressed int64, uncompressed int64) []byte {
	b := tnZipU32(nil, tnZipSigDesc)
	b = tnZipU32(b, crc)
	b = tnZipU64(b, compressed)
	return tnZipU64(b, uncompressed)
}

func tnZipTrailer(count int64, size int64, offset int64, comment []byte) [][]byte {
	var chunks [][]byte
	if count >= tnZipS16 || offset >= tnZipS32 || size >= tnZipS32 {
		rec := tnZipU32(nil, tnZipSigZ64End)
		rec = tnZipU64(rec, 44)
		rec = tnZipU16(rec, (tnZipUnix<<8)|45)
		rec = tnZipU16(rec, 45)
		rec = tnZipU32(rec, 0)
		rec = tnZipU32(rec, 0)
		rec = tnZipU64(rec, count)
		rec = tnZipU64(rec, count)
		rec = tnZipU64(rec, size)
		rec = tnZipU64(rec, offset)
		loc := tnZipU32(nil, tnZipSigZ64Loc)
		loc = tnZipU32(loc, 0)
		loc = tnZipU64(loc, offset+size)
		loc = tnZipU32(loc, 1)
		chunks = append(chunks, rec, loc)
	}
	end := tnZipU32(nil, tnZipSigEnd)
	end = tnZipU16(end, 0)
	end = tnZipU16(end, 0)
	end = tnZipU16(end, uint16(min(count, tnZipS16)))
	end = tnZipU16(end, uint16(min(count, tnZipS16)))
	end = tnZipU32(end, uint32(min(size, tnZipS32)))
	end = tnZipU32(end, uint32(min(offset, tnZipS32)))
	end = tnZipU16(end, uint16(len(comment)))
	end = append(end, comment...)
	return append(chunks, end)
}

// ---- parsing ----

type tnZipCentral struct {
	version, flags, method, dosTime, dosDate, internal uint16
	crc, external                                      uint32
	compressedSize, uncompressedSize, localOffset      int64
	disk                                               int64
	name, extra, comment                               []byte
	length                                             int
}

func tnZipRange(buf []byte, offset int, length int, what string) {
	if offset < 0 || length < 0 || offset+length > len(buf) {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", what+" is out of bounds"))
	}
}

func tnZipParseCentral(buf []byte, pos int) *tnZipCentral {
	tnZipRange(buf, pos, 46, "central directory header")
	le := binary.LittleEndian
	if le.Uint32(buf[pos:]) != tnZipSigCentral {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory header signature is invalid"))
	}
	nameLen := int(le.Uint16(buf[pos+28:]))
	extraLen := int(le.Uint16(buf[pos+30:]))
	commentLen := int(le.Uint16(buf[pos+32:]))
	length := 46 + nameLen + extraLen + commentLen
	if pos+length > len(buf) {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory header is truncated"))
	}
	c := &tnZipCentral{
		version: le.Uint16(buf[pos+4:]), flags: le.Uint16(buf[pos+8:]), method: le.Uint16(buf[pos+10:]),
		dosTime: le.Uint16(buf[pos+12:]), dosDate: le.Uint16(buf[pos+14:]), crc: le.Uint32(buf[pos+16:]),
		compressedSize: int64(le.Uint32(buf[pos+20:])), uncompressedSize: int64(le.Uint32(buf[pos+24:])),
		disk: int64(le.Uint16(buf[pos+34:])), internal: le.Uint16(buf[pos+36:]), external: le.Uint32(buf[pos+38:]),
		localOffset: int64(le.Uint32(buf[pos+42:])), length: length,
	}
	c.name = buf[pos+46 : pos+46+nameLen]
	c.extra = buf[pos+46+nameLen : pos+46+nameLen+extraLen]
	c.comment = buf[pos+46+nameLen+extraLen : pos+length]
	needU, needC, needO, needD := c.uncompressedSize == tnZipS32, c.compressedSize == tnZipS32, c.localOffset == tnZipS32, c.disk == tnZipS16
	if needU || needC || needO || needD {
		found := false
		tnZipEachExtra(c.extra, func(id uint16, body []byte) {
			if id != tnZipZ64Extra || found {
				return
			}
			found = true
			at := 0
			read := func() int64 {
				if at+8 > len(body) {
					panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "Zip64 extended information extra field is truncated"))
				}
				v := le.Uint64(body[at:])
				at += 8
				if v > 9007199254740991 {
					panic(tnZipErr("ERR_ZIP_ARCHIVE_TOO_LARGE", "a Zip64 value exceeds Number.MAX_SAFE_INTEGER"))
				}
				return int64(v)
			}
			if needU {
				c.uncompressedSize = read()
			}
			if needC {
				c.compressedSize = read()
			}
			if needO {
				c.localOffset = read()
			}
			if needD && at+4 <= len(body) {
				c.disk = int64(le.Uint32(body[at:]))
			}
		})
		if !found {
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "Zip64 extended information extra field is missing"))
		}
	}
	return c
}

func (c *tnZipCentral) fileName() string { return tnZipName(c.name, c.flags, c.extra) }
func (c *tnZipCentral) unixMode() bool   { return c.version>>8 == tnZipUnix }
func (c *tnZipCentral) mode() float64 {
	if !c.unixMode() {
		return 0
	}
	return float64((c.external >> 16) & 0o7777)
}
func (c *tnZipCentral) symlink() bool {
	return c.unixMode() && (c.external>>16)&tnZipIfMt == tnZipIfLnk
}

type tnZipEnd struct {
	prefix, totalRecords, cdOffset, cdSize int64
	comment                                []byte
	needTailFrom                           int64
}

func tnZipPlausibleEnd(buf []byte, pos int, scanStart int) bool {
	le := binary.LittleEndian
	disk, cdDisk := le.Uint16(buf[pos+4:]), le.Uint16(buf[pos+6:])
	diskRecords, total := le.Uint16(buf[pos+8:]), le.Uint16(buf[pos+10:])
	size, offset := le.Uint32(buf[pos+12:]), le.Uint32(buf[pos+16:])
	needs64 := disk == tnZipS16 || cdDisk == tnZipS16 || diskRecords == tnZipS16 || total == tnZipS16 || size == tnZipS32 || offset == tnZipS32
	loc := pos - 20
	hasLoc := loc >= 0 && le.Uint32(buf[loc:]) == tnZipSigZ64Loc
	if needs64 {
		return hasLoc
	}
	if hasLoc {
		return true
	}
	if disk != 0 || cdDisk != 0 || diskRecords != total || int64(total)*46 > int64(size) {
		return false
	}
	cdPos := pos - int(size)
	if cdPos < scanStart {
		return true
	}
	if total == 0 {
		return size == 0
	}
	return le.Uint32(buf[cdPos:]) == tnZipSigCentral
}

func tnZipFindEnd(buf []byte, base int64) tnZipEnd {
	le := binary.LittleEndian
	if len(buf) < 22 {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "no end of central directory record found"))
	}
	floor := max(0, len(buf)-tnZipTailLength)
	eocd, fallback, exact := -1, -1, -1
	for pos := len(buf) - 22; pos >= floor; pos-- {
		if le.Uint32(buf[pos:]) != tnZipSigEnd {
			continue
		}
		end := pos + 22 + int(le.Uint16(buf[pos+20:]))
		if end > len(buf) {
			continue
		}
		if fallback < 0 {
			fallback = pos
		}
		if end == len(buf) && exact < 0 {
			exact = pos
		}
		if !tnZipPlausibleEnd(buf, pos, floor) {
			continue
		}
		if eocd >= 0 {
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "ambiguous end of central directory records"))
		}
		eocd = pos
	}
	if eocd < 0 {
		if exact >= 0 {
			eocd = exact
		} else {
			eocd = fallback
		}
	}
	if eocd < 0 {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "no end of central directory record found"))
	}
	disk, cdDisk := le.Uint16(buf[eocd+4:]), le.Uint16(buf[eocd+6:])
	diskRecords := int64(le.Uint16(buf[eocd+8:]))
	total := int64(le.Uint16(buf[eocd+10:]))
	size := int64(le.Uint32(buf[eocd+12:]))
	offset := int64(le.Uint32(buf[eocd+16:]))
	comment := buf[eocd+22 : eocd+22+int(le.Uint16(buf[eocd+20:]))]
	needs64 := disk == tnZipS16 || cdDisk == tnZipS16 || diskRecords == tnZipS16 || total == tnZipS16 || size == tnZipS32 || offset == tnZipS32
	recordPos := -1
	loc := eocd - 20
	multi := func() { panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "multi-disk archives are not supported")) }
	var prefix int64
	if loc >= 0 && le.Uint32(buf[loc:]) == tnZipSigZ64Loc {
		raw := le.Uint64(buf[loc+8:])
		recordOffset := int64(-1)
		if raw <= 9007199254740991 {
			recordOffset = int64(raw)
		}
		if recordOffset >= 0 {
			recordPos = int(recordOffset - base)
		}
		if !(recordPos >= 0 && recordPos+56 <= loc && le.Uint32(buf[recordPos:]) == tnZipSigZ64End) {
			recordPos = -1
			for pos := loc - 56; pos >= max(0, loc-56-tnZipS16); pos-- {
				if le.Uint32(buf[pos:]) != tnZipSigZ64End {
					continue
				}
				if sz := le.Uint64(buf[pos+4:]); sz >= 44 && int64(pos)+12+int64(sz) == int64(loc) {
					recordPos = pos
					break
				}
			}
		}
		if recordPos < 0 && needs64 {
			if recordOffset >= 0 && recordOffset < base && base+int64(loc)-recordOffset <= 56+1024*1024 {
				return tnZipEnd{needTailFrom: recordOffset}
			}
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "Zip64 end of central directory record not found"))
		}
		if recordPos >= 0 {
			if le.Uint32(buf[loc+16:]) > 1 || le.Uint32(buf[loc+4:]) != 0 {
				multi()
			}
			if le.Uint32(buf[recordPos+16:]) != 0 || le.Uint32(buf[recordPos+20:]) != 0 || le.Uint64(buf[recordPos+24:]) != le.Uint64(buf[recordPos+32:]) {
				multi()
			}
			t64, s64, o64 := int64(le.Uint64(buf[recordPos+32:])), int64(le.Uint64(buf[recordPos+40:])), int64(le.Uint64(buf[recordPos+48:]))
			if (total != tnZipS16 && total != t64) || (size != tnZipS32 && size != s64) || (offset != tnZipS32 && offset != o64) {
				panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "Zip64 and classic end-of-central-directory records disagree"))
			}
			total, size, offset = t64, s64, o64
			prefix = base + int64(recordPos) - (offset + size)
		}
	}
	if recordPos < 0 {
		if disk != 0 || cdDisk != 0 || diskRecords != total {
			multi()
		}
		prefix = base + int64(eocd) - (offset + size)
	}
	if prefix < 0 {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory does not fit inside the archive"))
	}
	if (total == 0 && size != 0) || total*46 > size {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory record count is inconsistent with its size"))
	}
	return tnZipEnd{prefix: prefix, totalRecords: total, cdOffset: offset + prefix, cdSize: size, comment: comment, needTailFrom: -1}
}

// A local header's length, after checking its signature
func tnZipLocalLength(buf []byte, pos int, name string) int {
	if pos < 0 || pos+30 > len(buf) || binary.LittleEndian.Uint32(buf[pos:]) != tnZipSigLocal {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "entry "+tnZipQuote(name)+" has an invalid local file header"))
	}
	length := 30 + int(binary.LittleEndian.Uint16(buf[pos+26:])) + int(binary.LittleEndian.Uint16(buf[pos+28:]))
	tnZipRange(buf, pos, length, "local file header")
	return length
}

func tnZipReadEntries(buf []byte, end tnZipEnd) []*TnZipEntry {
	type parsed struct {
		entry      *TnZipEntry
		start, end int64
	}
	var all []parsed
	pos := int(end.cdOffset)
	cdEnd := int(end.cdOffset + end.cdSize)
	for i := int64(0); i < end.totalRecords; i++ {
		central := tnZipParseCentral(buf, pos)
		if pos+central.length > cdEnd {
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory header is out of bounds"))
		}
		if central.disk != 0 {
			panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "multi-disk archives are not supported"))
		}
		localOffset := central.localOffset + end.prefix
		length := tnZipLocalLength(buf, int(localOffset), central.fileName())
		local := buf[localOffset : int(localOffset)+length]
		dataStart := int(localOffset) + length
		tnZipRange(buf, dataStart, int(central.compressedSize), "entry data")
		e := &TnZipEntry{central: central, localExtra: local[30+int(binary.LittleEndian.Uint16(local[26:])):], localRead: true,
			raw: buf[dataStart : dataStart+int(central.compressedSize)], inMemory: true, localFlags: binary.LittleEndian.Uint16(local[6:])}
		all = append(all, parsed{e, localOffset, int64(dataStart) + central.compressedSize})
		pos += central.length
	}
	if pos != cdEnd {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory record count is inconsistent with its size"))
	}
	ranges := append([]parsed{}, all...)
	sort.SliceStable(ranges, func(i, j int) bool { return ranges[i].start < ranges[j].start })
	for i := range ranges {
		bound := end.cdOffset
		if i+1 < len(ranges) {
			bound = ranges[i+1].start
		}
		if ranges[i].end > bound {
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "entry "+tnZipQuote(ranges[i].entry.Get_name())+" overlaps the next entry or the central directory (possible zip bomb)"))
		}
	}
	out := make([]*TnZipEntry, len(all))
	for i, p := range all {
		out[i] = p.entry
	}
	return out
}

// ---- ZipEntry ----

// The descriptor a ZipFile shares with the entries it hands out
type tnZipHandle struct {
	f       *os.File
	closed  bool
	closing bool
}

type TnZipEntry struct {
	central    *tnZipCentral
	localExtra []byte
	localFlags uint16
	localRead  bool
	raw        []byte
	inMemory   bool
	meta       *tnZipMeta
	source     interface{}
	sourceChan reflect.Value
	serialized bool
	handle     *tnZipHandle
	localOff   int64
	contentOff int64
}

func (e *TnZipEntry) tnPending() {
	if e.meta != nil && e.meta.pending {
		panic(tnZipErr("ERR_INVALID_STATE", "this streaming entry has not finished serializing yet"))
	}
}

func (e *TnZipEntry) Get_compressed() bool { return e.Get_method() != tnZipStore }
func (e *TnZipEntry) Get_rawContent() []byte {
	if !e.inMemory {
		return nil
	}
	if e.raw == nil {
		return []byte{}
	}
	return e.raw
}
func (e *TnZipEntry) Get_method() float64 {
	if e.meta != nil {
		return float64(e.meta.method)
	}
	return float64(e.central.method)
}
func (e *TnZipEntry) Get_flags() float64 {
	if e.meta != nil {
		return float64(e.meta.flags)
	}
	if e.localRead {
		return float64(e.localFlags)
	}
	return float64(e.central.flags)
}
func (e *TnZipEntry) Get_crc32() float64 {
	if e.meta != nil {
		e.tnPending()
		return float64(e.meta.crc)
	}
	return float64(e.central.crc)
}
func (e *TnZipEntry) Get_name() string {
	if e.meta != nil {
		return tnZipName(e.meta.name, e.meta.flags, e.meta.extra)
	}
	return e.central.fileName()
}
func (e *TnZipEntry) Get_nameBuffer() []byte {
	if e.meta != nil {
		return e.meta.name
	}
	return e.central.name
}
func (e *TnZipEntry) Get_comment() string {
	if e.meta != nil {
		return tnZipText(e.meta.comment, e.meta.flags)
	}
	return tnZipText(e.central.comment, e.central.flags)
}
func (e *TnZipEntry) Get_size() float64 {
	if e.meta != nil {
		e.tnPending()
		return float64(e.meta.uncompressedSize)
	}
	return float64(e.central.uncompressedSize)
}
func (e *TnZipEntry) Get_compressedSize() float64 {
	if e.meta != nil {
		e.tnPending()
		return float64(e.meta.compressedSize)
	}
	return float64(e.central.compressedSize)
}
func (e *TnZipEntry) Get_modified() time.Time {
	if e.meta != nil {
		return e.meta.modified
	}
	if e.handle != nil && !e.localRead {
		func() {
			defer func() { recover() }()
			e.tnResolveLocal()
		}()
	}
	if t, ok := tnZipExtraMtime(e.central.extra, e.localExtra); ok {
		return t
	}
	return tnZipDosDecode(e.central.dosTime, e.central.dosDate)
}
func (e *TnZipEntry) Get_mode() float64 {
	if e.meta != nil {
		if e.meta.madeBy == tnZipUnix {
			return float64((e.meta.external >> 16) & 0o7777)
		}
		return 0
	}
	return e.central.mode()
}
func (e *TnZipEntry) Get_isSymlink() bool {
	if e.meta != nil {
		return e.meta.madeBy == tnZipUnix && (e.meta.external>>16)&tnZipIfMt == tnZipIfLnk
	}
	return e.central.symlink()
}
func (e *TnZipEntry) Get_isFile() bool      { return !e.Get_isDirectory() && !e.Get_isSymlink() }
func (e *TnZipEntry) Get_isDirectory() bool { return strings.HasSuffix(e.Get_name(), "/") }

func (e *TnZipEntry) tnFinalizeMeta() *tnZipMeta {
	if e.meta != nil {
		e.tnPending()
		return e.meta
	}
	c := e.central
	extra := tnZipStripZip64(c.extra)
	modified := e.Get_modified()
	ext, hasExt := int64(0), false
	if _, ok := tnZipExtraMtime(extra); !ok {
		ext, hasExt = tnZipExtendedMtime(modified)
	}
	e.meta = &tnZipMeta{name: c.name, comment: c.comment, extra: extra, flags: c.flags &^ tnZipDescriptor, method: c.method,
		crc: c.crc, compressedSize: c.compressedSize, uncompressedSize: c.uncompressedSize, modified: modified,
		extMtime: ext, hasExtMtime: hasExt, external: c.external, internal: c.internal, madeBy: c.version >> 8}
	return e.meta
}

func (e *TnZipEntry) tnLive() *os.File {
	if e.handle.closed {
		panic(tnZipErr("ERR_INVALID_STATE", "cannot read a ZipEntry after its backing ZipFile has been closed"))
	}
	return e.handle.f
}

func (e *TnZipEntry) tnResolveLocal() {
	if e.localRead {
		return
	}
	f := e.tnLive()
	fixed := make([]byte, 30)
	if _, err := f.ReadAt(fixed, e.localOff); err != nil || binary.LittleEndian.Uint32(fixed) != tnZipSigLocal {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "entry "+tnZipQuote(e.Get_name())+" has an invalid local file header"))
	}
	nameLen := int64(binary.LittleEndian.Uint16(fixed[26:]))
	extraLen := int64(binary.LittleEndian.Uint16(fixed[28:]))
	extra := make([]byte, extraLen)
	if extraLen > 0 {
		f.ReadAt(extra, e.localOff+30+nameLen)
	}
	e.localExtra = extra
	e.localFlags = binary.LittleEndian.Uint16(fixed[6:])
	e.localRead = true
	e.contentOff = e.localOff + 30 + nameLen + extraLen
}

func (e *TnZipEntry) tnInMemory() []byte {
	if !e.inMemory {
		panic(tnZipErr("ERR_INVALID_STATE", "the content of a streaming entry is not available for reading"))
	}
	return e.raw
}

func (e *TnZipEntry) tnCompressedBytes() []byte {
	if e.handle == nil {
		return e.tnInMemory()
	}
	size := int64(e.Get_compressedSize())
	e.tnResolveLocal()
	out := make([]byte, size)
	if _, err := e.tnLive().ReadAt(out, e.contentOff); err != nil && size > 0 {
		panic(TnNodeError("Error", "EIO", err.Error()))
	}
	return out
}

func tnZipMaxSize(options interface{}) (float64, bool) {
	if m, ok := tnZipOpt(options, "maxSize").(float64); ok {
		return m, true
	}
	return 0, false
}

func (e *TnZipEntry) tnDecode(compressed []byte, options interface{}, limit float64, hasLimit bool) []byte {
	name := e.Get_name()
	flags := uint16(e.Get_flags())
	method := uint16(e.Get_method())
	declared := int64(e.Get_size())
	if flags&tnZipEncrypted != 0 {
		panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "entry "+tnZipQuote(name)+" is encrypted"))
	}
	if method != tnZipStore && method != tnZipDeflate && method != tnZipZstd {
		panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "entry "+tnZipQuote(name)+" uses compression method "+strconv.Itoa(int(method))))
	}
	if hasLimit && float64(declared) > limit {
		panic(tnZipErr("ERR_ZIP_ENTRY_TOO_LARGE", "entry "+tnZipQuote(name)+" declares "+strconv.FormatInt(declared, 10)+" bytes, exceeding the "+TnNumStr(limit)+" byte limit"))
	}
	capacity := declared + 1
	if hasLimit && int64(limit) < capacity {
		capacity = int64(limit)
	}
	data := compressed
	verb := "inflate"
	switch method {
	case tnZipDeflate:
		r := flate.NewReader(bytes.NewReader(compressed))
		out, err := io.ReadAll(io.LimitReader(r, capacity+1))
		if err != nil {
			panic(tnZipErr("ERR_ZIP_ENTRY_CORRUPT", "entry "+tnZipQuote(name)+" failed to inflate: "+tnZlibError(err).message))
		}
		data = out
	case tnZipZstd:
		verb = "decompress"
		if tnZipZstdDecode == nil {
			panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "entry "+tnZipQuote(name)+" uses compression method 93"))
		}
		out, err := tnZipZstdDecode(compressed, int(capacity+1))
		if err != nil {
			panic(tnZipErr("ERR_ZIP_ENTRY_CORRUPT", "entry "+tnZipQuote(name)+" failed to decompress: "+err.Error()))
		}
		data = out
	}
	if method != tnZipStore && int64(len(data)) > capacity {
		panic(tnZipErr("ERR_ZIP_ENTRY_CORRUPT", "entry "+tnZipQuote(name)+" "+verb+"s beyond its declared size of "+strconv.FormatInt(declared, 10)+" bytes"))
	}
	if int64(len(data)) != declared {
		panic(tnZipErr("ERR_ZIP_ENTRY_CORRUPT", "entry "+tnZipQuote(name)+" produced "+strconv.Itoa(len(data))+" bytes, expected "+strconv.FormatInt(declared, 10)))
	}
	if verify, ok := tnZipOpt(options, "verify").(bool); (!ok || verify) && crc32.ChecksumIEEE(data) != uint32(e.Get_crc32()) {
		panic(tnZipErr("ERR_ZIP_ENTRY_CORRUPT", "entry "+tnZipQuote(name)+" failed CRC-32 verification"))
	}
	if method == tnZipStore && e.handle == nil {
		return append([]byte{}, data...)
	}
	return data
}

func (e *TnZipEntry) contentSync(options ...interface{}) []byte {
	opts := tnZipFirst(options)
	limit, has := tnZipMaxSize(opts)
	if !has {
		limit = tnMaxZipContentSize
	}
	if declared := e.Get_size(); declared > limit {
		panic(tnZipErr("ERR_ZIP_ENTRY_TOO_LARGE", "entry "+tnZipQuote(e.Get_name())+" declares "+TnNumStr(declared)+" bytes, exceeding the "+TnNumStr(limit)+" byte limit"))
	}
	if e.handle != nil && e.handle.closing {
		panic(tnZipErr("ERR_INVALID_STATE", "cannot read a ZipEntry after its backing ZipFile has been closed"))
	}
	return e.tnDecode(e.tnCompressedBytes(), opts, limit, true)
}

func (e *TnZipEntry) content(options ...interface{}) chan []byte {
	return tnZipSettle(func() []byte { return e.contentSync(options...) })
}

// The decoded content as an async iterator of chunks (no default size limit)
func (e *TnZipEntry) contentIterator(options ...interface{}) chan []byte {
	opts := tnZipFirst(options)
	if e.handle == nil {
		e.tnInMemory()
	}
	ch := make(chan []byte, 64)
	TnLoopRef()
	go func() {
		var failure interface{}
		var data []byte
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			limit, has := tnZipMaxSize(opts)
			data = e.tnDecode(e.tnCompressedBytes(), opts, limit, has)
		}()
		TnLoopPost(func() {
			defer TnLoopUnref()
			if failure != nil {
				TnReject(ch, failure)
				return
			}
			for len(data) > 0 {
				n := min(len(data), 65536)
				ch <- data[:n:n]
				data = data[n:]
			}
			close(ch)
		})
	}()
	return ch
}

// The member's local header and raw bytes (a streaming entry cannot)
func (e *TnZipEntry) tnSerializeSync() [][]byte {
	if e.source != nil {
		panic(tnZipErr("ERR_INVALID_STATE", "a streaming entry cannot be serialized synchronously"))
	}
	meta := e.tnFinalizeMeta()
	out := [][]byte{tnZipLocalHeader(meta)}
	if e.handle != nil {
		raw := e.tnCompressedBytes()
		for len(raw) > 0 {
			n := min(len(raw), tnZipReadChunk)
			out = append(out, raw[:n])
			raw = raw[n:]
		}
	} else if len(e.raw) > 0 {
		out = append(out, e.raw)
	}
	return out
}

// A streaming entry's source as a channel, taken on the loop goroutine
func (e *TnZipEntry) tnPrepareSource() {
	if e.source == nil || e.sourceChan.IsValid() {
		return
	}
	switch s := e.source.(type) {
	case interface{ tnIterator() chan interface{} }:
		e.sourceChan = reflect.ValueOf(s.tnIterator())
	case *tnZipFileSource:
	default:
		rv := reflect.ValueOf(s)
		if rv.Kind() == reflect.Chan {
			e.sourceChan = rv
		} else if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
			ch := make(chan interface{}, rv.Len())
			for i := 0; i < rv.Len(); i++ {
				ch <- rv.Index(i).Interface()
			}
			close(ch)
			e.sourceChan = reflect.ValueOf(ch)
		} else {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"source\\" argument must be an AsyncIterable"))
		}
	}
}

// A file zipFiles streams (opened when the archive reaches it)
type tnZipFileSource struct{ path string }

// Any entry's serialization, off the loop: a streaming entry drains its
// source, compressing on the fly, then writes a Zip64 data descriptor
func (e *TnZipEntry) tnSerialize(emit func([]byte)) {
	if e.source == nil {
		if e.handle == nil && !e.inMemory {
			panic(tnZipErr("ERR_INVALID_STATE", "a streaming entry can only be serialized once"))
		}
		for _, chunk := range e.tnSerializeSync() {
			emit(chunk)
		}
		return
	}
	if e.serialized {
		panic(tnZipErr("ERR_INVALID_STATE", "a streaming entry can only be serialized once"))
	}
	e.serialized = true
	meta := e.meta
	emit(tnZipLocalHeader(meta))
	var crc uint32
	var uncompressed, compressed int64
	out := func(b []byte) {
		if len(b) > 0 {
			compressed += int64(len(b))
			emit(append([]byte{}, b...))
		}
	}
	var sink io.Writer
	var fw *flate.Writer
	var zbuf bytes.Buffer
	var zstdData []byte
	switch meta.method {
	case tnZipDeflate:
		fw, _ = flate.NewWriter(tnZipWriterFunc(out), -1)
		sink = fw
	case tnZipZstd:
		sink = &zbuf
	default:
		sink = tnZipWriterFunc(out)
	}
	feed := func(chunk []byte) {
		if len(chunk) == 0 {
			return
		}
		crc = crc32.Update(crc, crc32.IEEETable, chunk)
		uncompressed += int64(len(chunk))
		sink.Write(chunk)
	}
	if fs, ok := e.source.(*tnZipFileSource); ok {
		file, err := os.Open(fs.path)
		if err != nil {
			panic(TnNodeError("Error", "EIO", err.Error()))
		}
		buf := make([]byte, 65536)
		for {
			n, err := file.Read(buf)
			feed(buf[:n])
			if err != nil {
				break
			}
		}
		file.Close()
	} else {
		ch := e.sourceChan
		for {
			v, ok := ch.Recv()
			if !ok {
				if reason, rejected := tnRejections.Load(ch.Interface()); rejected {
					panic(reason)
				}
				break
			}
			chunk, isBytes := v.Interface().([]byte)
			if !isBytes {
				panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"chunk\\" argument must be an instance of Uint8Array. Received "+tnZipInspect(v.Interface())))
			}
			feed(chunk)
		}
	}
	if fw != nil {
		fw.Close()
	}
	if meta.method == tnZipZstd {
		if tnZipZstdEncode == nil {
			panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "Zstandard compression is not available"))
		}
		zstdData = tnZipZstdEncode(zbuf.Bytes())
		out(zstdData)
	}
	meta.crc = crc
	meta.uncompressedSize = uncompressed
	meta.compressedSize = compressed
	meta.pending = false
	emit(tnZipDataDescriptor(crc, compressed, uncompressed))
}

type tnZipWriterFunc func([]byte)

func (w tnZipWriterFunc) Write(b []byte) (int, error) {
	w(b)
	return len(b), nil
}

func (e *TnZipEntry) tnFinalize(localOffset int64, preserveDescriptor bool) []byte {
	meta := e.tnFinalizeMeta()
	if preserveDescriptor && e.central != nil && e.central.flags&tnZipDescriptor != 0 {
		copied := *meta
		copied.flags |= tnZipDescriptor
		return tnZipCentralHeader(&copied, localOffset)
	}
	return tnZipCentralHeader(meta, localOffset)
}

func (e *TnZipEntry) tnPromote(handle *tnZipHandle, localOffset int64) {
	if e.inMemory || e.handle != nil {
		return
	}
	e.handle = handle
	e.localOff = localOffset
	e.localRead = false
	e.source = nil
	e.sourceChan = reflect.Value{}
	e.serialized = false
	e.meta.flags &^= tnZipDescriptor
}

func (e *TnZipEntry) tnDisposeSource() {
	source := e.source
	e.source = nil
	e.serialized = true
	if d, ok := source.(interface{ destroy(...interface{}) *TnStream }); ok {
		d.destroy()
	}
}

func (e *TnZipEntry) dispose() { e.tnDisposeSource() }

func tnZipNewEntry(filename string, data interface{}, options interface{}) (*tnZipMeta, []byte, uint16) {
	meta := tnZipCreateMeta(filename, options, false)
	content := tnZipBytes(data)
	isDir := strings.HasSuffix(filename, "/")
	if isDir && len(content) > 0 {
		panic(tnZipInvalidArg("data", data, "must be empty for a directory entry"))
	}
	meta.crc = crc32.ChecksumIEEE(content)
	meta.uncompressedSize = int64(len(content))
	method := uint16(tnZipDeflate)
	m, _ := tnZipOpt(options, "method").(string)
	if isDir || len(content) == 0 || m == "store" {
		method = tnZipStore
	} else if m == "zstd" {
		method = tnZipZstd
	}
	return meta, content, method
}

func tnZipFinishEntry(meta *tnZipMeta, content []byte, method uint16) *TnZipEntry {
	final := content
	switch method {
	case tnZipDeflate:
		var buf bytes.Buffer
		w, _ := flate.NewWriter(&buf, -1)
		w.Write(content)
		w.Close()
		if buf.Len() < len(content) {
			final = buf.Bytes()
		} else {
			method = tnZipStore
		}
	case tnZipZstd:
		if tnZipZstdEncode == nil {
			panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "Zstandard compression is not available"))
		}
		if z := tnZipZstdEncode(content); len(z) < len(content) {
			final = z
		} else {
			method = tnZipStore
		}
	}
	meta.method = method
	meta.compressedSize = int64(len(final))
	meta.pending = false
	return &TnZipEntry{raw: final, inMemory: true, meta: meta}
}

func TnZipEntryCreateSync(filename string, data interface{}, options ...interface{}) *TnZipEntry {
	meta, content, method := tnZipNewEntry(filename, data, tnZipFirst(options))
	return tnZipFinishEntry(meta, content, method)
}

func TnZipEntryCreate(filename string, data interface{}, options ...interface{}) chan *TnZipEntry {
	return tnZipSettle(func() *TnZipEntry { return TnZipEntryCreateSync(filename, data, options...) })
}

func TnZipEntryCreateStream(filename string, source interface{}, options ...interface{}) *TnZipEntry {
	opts := tnZipFirst(options)
	meta := tnZipCreateMeta(filename, opts, false)
	if strings.HasSuffix(filename, "/") {
		panic(tnZipInvalidArg("filename", filename, "a directory entry cannot be streamed"))
	}
	meta.flags |= tnZipDescriptor
	meta.method = tnZipDeflate
	switch m, _ := tnZipOpt(opts, "method").(string); m {
	case "store":
		meta.method = tnZipStore
	case "zstd":
		meta.method = tnZipZstd
	}
	meta.pending = true
	return &TnZipEntry{meta: meta, source: source}
}

func TnZipEntrySymlink(filename string, target string, options ...interface{}) *TnZipEntry {
	opts := tnZipFirst(options)
	meta := tnZipCreateMeta(filename, opts, true)
	content := []byte(target)
	meta.crc = crc32.ChecksumIEEE(content)
	meta.uncompressedSize = int64(len(content))
	meta.method = tnZipStore
	meta.compressedSize = int64(len(content))
	meta.pending = false
	return &TnZipEntry{raw: content, inMemory: true, meta: meta}
}

// ZipEntry.read(buffer): one read-only entry per member
func TnZipEntryRead(buffer interface{}) []*TnZipEntry {
	buf := tnZipBytes(buffer)
	return tnZipReadEntries(buf, tnZipFindEnd(buf, 0))
}

// A promise settled now: fn's result, or its throw as a rejection
func tnZipSettle[T any](fn func() T) chan T {
	ch := make(chan T, 1)
	var failure interface{}
	var result T
	func() {
		defer func() {
			if r := recover(); r != nil {
				failure = r
			}
		}()
		result = fn()
	}()
	if failure != nil {
		TnReject(ch, failure)
	} else {
		ch <- result
	}
	return ch
}

// A promise for work done off the loop
func tnZipBackground[T any](fn func() T) chan T {
	ch := make(chan T, 1)
	TnLoopRef()
	go func() {
		var failure interface{}
		var result T
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			result = fn()
		}()
		TnLoopPost(func() {
			defer TnLoopUnref()
			if failure != nil {
				TnReject(ch, failure)
				return
			}
			ch <- result
		})
	}()
	return ch
}

// ---- archives ----

func tnZipArchiveOptions(options interface{}) ([]byte, bool, int64) {
	if options == nil || TnIsNil(options) {
		return nil, false, 0
	}
	if s, ok := options.(string); ok {
		return []byte(s), true, 0
	}
	if p, ok := options.(*string); ok {
		return []byte(*p), true, 0
	}
	var comment []byte
	has := false
	switch c := tnZipOpt(options, "comment").(type) {
	case string:
		comment, has = []byte(c), true
	case []byte:
		comment, has = c, true
	}
	offset := int64(0)
	if o, ok := tnZipOpt(options, "baseOffset").(float64); ok {
		if o != math.Trunc(o) || o < 0 || o > 9007199254740991 {
			panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.baseOffset\\" is out of range. It must be >= 0 && <= 9007199254740991. Received "+TnNumStr(o)))
		}
		offset = int64(o)
	}
	return comment, has, offset
}

func tnZipCommentBytes(comment []byte) []byte {
	if len(comment) > tnZipS16 {
		panic(tnZipErr("ERR_ZIP_ENTRY_TOO_LARGE", "the archive comment must not exceed 65535 bytes when encoded as UTF-8"))
	}
	return comment
}

func tnZipEntryList(entries interface{}) []*TnZipEntry {
	switch x := entries.(type) {
	case []*TnZipEntry:
		return x
	case interface{ tnValues() []*TnZipEntry }: // (a *TnZipBuffer, without naming its type)
		return x.tnValues()
	}
	var out []*TnZipEntry
	rv := reflect.ValueOf(entries)
	if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
		for i := 0; i < rv.Len(); i++ {
			if e, ok := rv.Index(i).Interface().(*TnZipEntry); ok {
				out = append(out, e)
			}
		}
	}
	return out
}

// Serializes entries through emit: members, central directory, trailer
func tnZipWriteArchive(next func() (*TnZipEntry, bool), comment []byte, baseOffset int64, sync bool, emit func([]byte)) {
	var headers [][]byte
	pos := baseOffset
	for {
		entry, ok := next()
		if !ok {
			break
		}
		start := pos
		write := func(chunk []byte) {
			emit(chunk)
			pos += int64(len(chunk))
		}
		if sync {
			for _, chunk := range entry.tnSerializeSync() {
				write(chunk)
			}
		} else {
			entry.tnSerialize(write)
		}
		headers = append(headers, entry.tnFinalize(start, false))
	}
	cdOffset := pos
	for _, h := range headers {
		emit(h)
		pos += int64(len(h))
	}
	for _, chunk := range tnZipTrailer(int64(len(headers)), pos-cdOffset, cdOffset, comment) {
		emit(chunk)
	}
}

func tnZipSliceNext(entries []*TnZipEntry) func() (*TnZipEntry, bool) {
	i := 0
	return func() (*TnZipEntry, bool) {
		if i >= len(entries) {
			return nil, false
		}
		i++
		return entries[i-1], true
	}
}

func TnCreateZipArchiveSync(entries interface{}, options ...interface{}) [][]byte {
	comment, _, base := tnZipArchiveOptions(tnZipFirst(options))
	comment = tnZipCommentBytes(comment)
	list := tnZipEntryList(entries)
	var out [][]byte
	done := false
	defer func() {
		if !done {
			for _, e := range list {
				e.tnDisposeSource()
			}
		}
	}()
	tnZipWriteArchive(tnZipSliceNext(list), comment, base, true, func(b []byte) { out = append(out, b) })
	done = true
	return out
}

// The entries of an async archive: a list (sources taken now) or an async
// iterable of entries
func tnZipEntrySource(entries interface{}) func() (*TnZipEntry, bool) {
	rv := reflect.ValueOf(entries)
	if rv.Kind() == reflect.Chan {
		return func() (*TnZipEntry, bool) {
			v, ok := rv.Recv()
			if !ok {
				if reason, rejected := tnRejections.Load(entries); rejected {
					panic(reason)
				}
				return nil, false
			}
			e, _ := v.Interface().(*TnZipEntry)
			if e == nil {
				return nil, false
			}
			done := make(chan struct{})
			TnLoopPost(func() {
				defer close(done)
				e.tnPrepareSource()
			})
			<-done
			return e, true
		}
	}
	list := tnZipEntryList(entries)
	for _, e := range list {
		e.tnPrepareSource()
	}
	return tnZipSliceNext(list)
}
`;
// Archive output as a Readable (pulls in node:stream)
export const zipStreamHelper = `// node:zlib ZIP archive streams
func tnZipReadable(run func(emit func([]byte))) *TnStream {
	s := TnNewReadable()
	s.objectMode = false
	s.source = func(st *TnStream) {
		TnLoopRef()
		go func() {
			var failure interface{}
			func() {
				defer func() {
					if r := recover(); r != nil {
						failure = r
					}
				}()
				run(func(chunk []byte) {
					c := chunk
					TnLoopPost(func() { st.push(c) })
				})
			}()
			TnLoopPost(func() {
				defer TnLoopUnref()
				if failure != nil {
					st.destroy(failure)
					return
				}
				st.push(nil)
			})
		}()
	}
	return s
}

func TnCreateZipArchive(entries interface{}, options ...interface{}) *TnStream {
	comment, _, base := tnZipArchiveOptions(tnZipFirst(options))
	comment = tnZipCommentBytes(comment)
	next := tnZipEntrySource(entries)
	return tnZipReadable(func(emit func([]byte)) {
		tnZipWriteArchive(next, comment, base, false, emit)
	})
}

// zipFiles([[source, name], ...]): stats each source (following links unless
// followSymlinks: false), streams regular files
func TnZipFiles(files interface{}, options ...interface{}) *TnStream {
	opts := tnZipFirst(options)
	follow := true
	if f, ok := tnZipOpt(opts, "followSymlinks").(bool); ok {
		follow = f
	}
	comment, _, base := tnZipArchiveOptions(opts)
	comment = tnZipCommentBytes(comment)
	var pairs [][2]string
	rv := reflect.ValueOf(files)
	for i := 0; rv.Kind() == reflect.Slice && i < rv.Len(); i++ {
		pair := reflect.ValueOf(rv.Index(i).Interface())
		if pair.Kind() == reflect.Slice && pair.Len() >= 2 {
			source, _ := pair.Index(0).Interface().(string)
			name, _ := pair.Index(1).Interface().(string)
			pairs = append(pairs, [2]string{source, name})
		}
	}
	i := 0
	next := func() (*TnZipEntry, bool) {
		if i >= len(pairs) {
			return nil, false
		}
		source, name := pairs[i][0], pairs[i][1]
		i++
		var info os.FileInfo
		var err error
		if follow {
			info, err = os.Stat(source)
		} else {
			info, err = os.Lstat(source)
		}
		if err != nil {
			panic(TnSysError(err, "stat", source))
		}
		mode := float64(info.Mode().Perm())
		if runtime.GOOS == "windows" {
			if info.IsDir() {
				mode = 0o777
			} else if info.Mode().Perm()&0o200 != 0 {
				mode = 0o666
			} else {
				mode = 0o444
			}
		}
		opts := map[string]interface{}{"mode": mode, "modified": info.ModTime()}
		switch {
		case info.Mode()&os.ModeSymlink != 0:
			target, _ := os.Readlink(source)
			return TnZipEntrySymlink(name, target, opts), true
		case info.IsDir():
			if !strings.HasSuffix(name, "/") {
				name += "/"
			}
			return TnZipEntryCreateSync(name, []byte{}, opts), true
		case !info.Mode().IsRegular():
			panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "cannot archive "+tnZipQuote(source)+": not a regular file"))
		}
		return TnZipEntryCreateStream(name, &tnZipFileSource{path: source}, opts), true
	}
	return tnZipReadable(func(emit func([]byte)) {
		tnZipWriteArchive(next, comment, base, false, emit)
	})
}

func (f *TnZipFile) compact(comment ...interface{}) *TnStream {
	entries := f.tnCompactEntries()
	text := f.comment
	if len(comment) > 0 && comment[0] != nil {
		if s, ok := comment[0].(string); ok {
			text = []byte(s)
		}
	}
	return tnZipReadable(func(emit func([]byte)) {
		tnZipWriteArchive(tnZipSliceNext(entries), text, 0, false, emit)
	})
}

// zipFile.stream(name[, options]): the decoded member as a Readable
func (f *TnZipFile) stream(name string, options ...interface{}) chan *TnStream {
	return tnZipSettle(func() *TnStream {
		entry := f.getSync(name)
		ch := entry.contentIterator(options...)
		return tnZipReadable(func(emit func([]byte)) {
			for {
				chunk, ok := <-ch
				if !ok {
					if reason, rejected := tnRejections.Load(ch); rejected {
						panic(reason)
					}
					return
				}
				emit(chunk)
			}
		})
	})
}
`;
export const zipContainersHelper = `// node:zlib ZipBuffer / ZipFile
type TnZipBuffer struct {
	order   []string
	byName  map[string]*TnZipEntry
	comment []byte
}

func TnNewZipBuffer(buffer interface{}) *TnZipBuffer {
	buf := tnZipBytes(buffer)
	end := tnZipFindEnd(buf, 0)
	b := &TnZipBuffer{byName: map[string]*TnZipEntry{}, comment: end.comment}
	for _, entry := range tnZipReadEntries(buf, end) {
		b.addEntry(entry)
	}
	return b
}

func (b *TnZipBuffer) Get_writable() bool  { return true }
func (b *TnZipBuffer) Get_comment() string { return tnZipText(b.comment, 0) }
func (b *TnZipBuffer) Get_size() float64   { return float64(len(b.order)) }

func (b *TnZipBuffer) has(name string) bool {
	_, ok := b.byName[name]
	return ok
}

func (b *TnZipBuffer) get(name string) *TnZipEntry {
	entry, ok := b.byName[name]
	if !ok {
		panic(tnZipErr("ERR_ZIP_ENTRY_NOT_FOUND", name))
	}
	return entry
}

func (b *TnZipBuffer) addEntry(entry *TnZipEntry) *TnZipEntry {
	if entry == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"entry\\" argument must be an instance of ZipEntry."))
	}
	name := entry.Get_name()
	if _, ok := b.byName[name]; !ok {
		b.order = append(b.order, name)
	}
	b.byName[name] = entry
	return entry
}

func (b *TnZipBuffer) addSync(filename string, data interface{}, options ...interface{}) *TnZipEntry {
	return b.addEntry(TnZipEntryCreateSync(filename, data, options...))
}

func (b *TnZipBuffer) add(filename string, data interface{}, options ...interface{}) chan *TnZipEntry {
	return tnZipSettle(func() *TnZipEntry { return b.addSync(filename, data, options...) })
}

func (b *TnZipBuffer) delete(name string) bool {
	if _, ok := b.byName[name]; !ok {
		return false
	}
	delete(b.byName, name)
	for i, n := range b.order {
		if n == name {
			b.order = append(b.order[:i:i], b.order[i+1:]...)
			break
		}
	}
	return true
}

func (b *TnZipBuffer) clear() {
	b.order = nil
	b.byName = map[string]*TnZipEntry{}
}

func (b *TnZipBuffer) dispose() { b.clear() }

func (b *TnZipBuffer) keys() []string { return append([]string{}, b.order...) }

func (b *TnZipBuffer) tnValues() []*TnZipEntry {
	out := make([]*TnZipEntry, len(b.order))
	for i, name := range b.order {
		out[i] = b.byName[name]
	}
	return out
}

func (b *TnZipBuffer) values() []*TnZipEntry { return b.tnValues() }

func (b *TnZipBuffer) entries() [][]interface{} {
	out := make([][]interface{}, len(b.order))
	for i, name := range b.order {
		out[i] = []interface{}{name, b.byName[name]}
	}
	return out
}

func (b *TnZipBuffer) forEach(callback interface{}, thisArg ...interface{}) {
	for _, name := range b.keys() {
		if entry, ok := b.byName[name]; ok {
			TnInvoke(callback, entry, name, b)
		}
	}
}

func (b *TnZipBuffer) tnArchiveComment(options []interface{}) ([]byte, int64) {
	comment, has, base := tnZipArchiveOptions(tnZipFirst(options))
	if !has {
		comment = b.comment
	}
	return tnZipCommentBytes(comment), base
}

func (b *TnZipBuffer) toBufferSync(options ...interface{}) []byte {
	comment, base := b.tnArchiveComment(options)
	var out bytes.Buffer
	tnZipWriteArchive(tnZipSliceNext(b.tnValues()), comment, base, true, func(c []byte) { out.Write(c) })
	return out.Bytes()
}

func (b *TnZipBuffer) toBuffer(options ...interface{}) chan []byte {
	comment, base := b.tnArchiveComment(options)
	next := tnZipEntrySource(b.tnValues())
	return tnZipBackground(func() []byte {
		var out bytes.Buffer
		tnZipWriteArchive(next, comment, base, false, func(c []byte) { out.Write(c) })
		return out.Bytes()
	})
}

type tnZipInfo struct {
	central     *tnZipCentral
	entry       *TnZipEntry
	localOffset int64
}

type TnZipFile struct {
	handle   *tnZipHandle
	closing  bool
	writable bool
	comment  []byte
	cdOffset int64
	mu       sync.Mutex
	order    []string
	infos    map[string]*tnZipInfo
	pending  int32
	last     chan struct{}
	closed   chan struct{}
}

func tnZipOpenFile(filename string, options []interface{}) *TnZipFile {
	writable := false
	if w := tnZipOpt(tnZipFirst(options), "writable"); w != nil {
		flag, ok := w.(bool)
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"options.writable\\" property must be of type boolean. Received "+tnZipInspect(w)))
		}
		writable = flag
	}
	flag := os.O_RDONLY
	if writable {
		flag = os.O_RDWR
	}
	f, err := os.OpenFile(filename, flag, 0)
	if err != nil {
		panic(TnSysError(err, "open", filename))
	}
	ok := false
	defer func() {
		if !ok {
			f.Close()
		}
	}()
	info, _ := f.Stat()
	size := info.Size()
	tailLength := min(size, int64(tnZipTailLength))
	tail := make([]byte, tailLength)
	f.ReadAt(tail, size-tailLength)
	end := tnZipFindEnd(tail, size-tailLength)
	if end.needTailFrom >= 0 {
		retry := make([]byte, size-end.needTailFrom)
		f.ReadAt(retry, end.needTailFrom)
		end = tnZipFindEnd(retry, end.needTailFrom)
		if end.needTailFrom >= 0 {
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "Zip64 end of central directory record not found"))
		}
	}
	if end.cdOffset+end.cdSize > size {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory is out of bounds"))
	}
	directory := make([]byte, end.cdSize)
	f.ReadAt(directory, end.cdOffset)
	zf := &TnZipFile{handle: &tnZipHandle{f: f}, writable: writable, comment: append([]byte{}, end.comment...), cdOffset: end.cdOffset, infos: map[string]*tnZipInfo{}}
	pos := 0
	for i := int64(0); i < end.totalRecords; i++ {
		central := tnZipParseCentral(directory, pos)
		if central.disk != 0 {
			panic(tnZipErr("ERR_ZIP_UNSUPPORTED_FEATURE", "multi-disk archives are not supported"))
		}
		local := central.localOffset + end.prefix
		if local < 0 || local+30+central.compressedSize > end.cdOffset {
			panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "entry "+tnZipQuote(central.fileName())+" is out of bounds"))
		}
		name := central.fileName()
		if _, seen := zf.infos[name]; !seen {
			zf.order = append(zf.order, name)
		}
		zf.infos[name] = &tnZipInfo{central: central, localOffset: local}
		pos += central.length
	}
	if pos != len(directory) {
		panic(tnZipErr("ERR_ZIP_INVALID_ARCHIVE", "central directory record count is inconsistent with its size"))
	}
	ok = true
	return zf
}

func TnZipFileOpenSync(filename string, options ...interface{}) *TnZipFile {
	return tnZipOpenFile(filename, options)
}

func TnZipFileOpen(filename string, options ...interface{}) chan *TnZipFile {
	return tnZipBackground(func() *TnZipFile { return tnZipOpenFile(filename, options) })
}

func (f *TnZipFile) Get_writable() bool  { return f.writable }
func (f *TnZipFile) Get_comment() string { return tnZipText(f.comment, 0) }
func (f *TnZipFile) Get_size() float64 {
	f.tnOpen()
	f.mu.Lock()
	defer f.mu.Unlock()
	return float64(len(f.order))
}

func (f *TnZipFile) tnWritable() {
	if !f.writable {
		panic(tnZipErr("ERR_ZIP_NOT_WRITABLE", ""))
	}
}

func (f *TnZipFile) tnOpen() {
	if f.closing {
		panic(tnZipErr("ERR_INVALID_STATE", "the ZipFile has been closed"))
	}
}

func (f *TnZipFile) tnNotBusy() {
	if atomic.LoadInt32(&f.pending) > 0 {
		panic(tnZipErr("ERR_INVALID_STATE", "cannot call a synchronous ZipFile method while an asynchronous add(), addEntry(), delete(), or close() call has not settled yet"))
	}
}

// Async mutations run one after another, off the loop
func tnZipEnqueue[T any](f *TnZipFile, job func() T) chan T {
	ch := make(chan T, 1)
	atomic.AddInt32(&f.pending, 1)
	prev := f.last
	done := make(chan struct{})
	f.last = done
	TnLoopRef()
	go func() {
		if prev != nil {
			<-prev
		}
		var failure interface{}
		var result T
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			result = job()
		}()
		close(done)
		TnLoopPost(func() {
			defer TnLoopUnref()
			atomic.AddInt32(&f.pending, -1)
			if failure != nil {
				TnReject(ch, failure)
				return
			}
			ch <- result
		})
	}()
	return ch
}

func (f *TnZipFile) has(name string) bool {
	f.tnOpen()
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.infos[name]
	return ok
}

func (f *TnZipFile) tnHandleFor(info *tnZipInfo) *TnZipEntry {
	if info.entry == nil {
		info.entry = &TnZipEntry{central: info.central, handle: f.handle, localOff: info.localOffset}
	}
	return info.entry
}

func (f *TnZipFile) tnLookup(name string) *TnZipEntry {
	f.mu.Lock()
	defer f.mu.Unlock()
	info, ok := f.infos[name]
	if !ok {
		panic(tnZipErr("ERR_ZIP_ENTRY_NOT_FOUND", name))
	}
	return f.tnHandleFor(info)
}

func (f *TnZipFile) getSync(name string) *TnZipEntry {
	f.tnOpen()
	f.tnNotBusy()
	return f.tnLookup(name)
}

func (f *TnZipFile) get(name string) chan *TnZipEntry {
	return tnZipSettle(func() *TnZipEntry {
		f.tnOpen()
		return f.tnLookup(name)
	})
}

func (f *TnZipFile) tnRewrite() {
	f.mu.Lock()
	type record struct {
		entry *TnZipEntry
		local int64
	}
	records := make([]record, len(f.order))
	names := append([]string{}, f.order...)
	for i, name := range names {
		info := f.infos[name]
		entry := info.entry
		if entry == nil {
			entry = &TnZipEntry{central: info.central}
		}
		records[i] = record{entry, info.localOffset}
	}
	f.mu.Unlock()
	var headers [][]byte
	var size int64
	for _, r := range records {
		h := r.entry.tnFinalize(r.local, true)
		headers = append(headers, h)
		size += int64(len(h))
	}
	chunks := append(append([][]byte{}, headers...), tnZipTrailer(int64(len(records)), size, f.cdOffset, f.comment)...)
	pos := f.cdOffset
	for _, chunk := range chunks {
		if _, err := f.handle.f.WriteAt(chunk, pos); err != nil {
			panic(TnNodeError("Error", "EIO", err.Error()))
		}
		pos += int64(len(chunk))
	}
	f.handle.f.Truncate(pos)
	f.mu.Lock()
	for i, name := range names {
		f.infos[name] = &tnZipInfo{central: tnZipParseCentral(headers[i], 0), localOffset: records[i].local}
	}
	f.mu.Unlock()
}

func (f *TnZipFile) tnAdd(entry *TnZipEntry, sync bool) *TnZipEntry {
	localOffset := f.cdOffset
	written := int64(0)
	write := func(chunk []byte) {
		if _, err := f.handle.f.WriteAt(chunk, localOffset+written); err != nil {
			panic(TnNodeError("Error", "EIO", err.Error()))
		}
		written += int64(len(chunk))
	}
	func() {
		defer func() {
			if r := recover(); r != nil {
				func() {
					defer func() { recover() }()
					f.tnRewrite()
				}()
				panic(r)
			}
		}()
		if sync {
			for _, chunk := range entry.tnSerializeSync() {
				write(chunk)
			}
		} else {
			entry.tnSerialize(write)
		}
	}()
	name := entry.Get_name()
	f.mu.Lock()
	previous, existed := f.infos[name]
	if !existed {
		f.order = append(f.order, name)
	}
	f.infos[name] = &tnZipInfo{entry: entry, localOffset: localOffset}
	f.mu.Unlock()
	f.cdOffset = localOffset + written
	func() {
		defer func() {
			if r := recover(); r != nil {
				f.cdOffset = localOffset
				f.mu.Lock()
				if existed {
					f.infos[name] = previous
				} else {
					delete(f.infos, name)
					f.order = f.order[:len(f.order)-1]
				}
				f.mu.Unlock()
				func() {
					defer func() { recover() }()
					f.tnRewrite()
				}()
				panic(r)
			}
		}()
		f.tnRewrite()
	}()
	entry.tnPromote(f.handle, localOffset)
	return entry
}

func (f *TnZipFile) addEntrySync(entry *TnZipEntry) *TnZipEntry {
	f.tnWritable()
	f.tnOpen()
	f.tnNotBusy()
	return f.tnAdd(entry, true)
}

func (f *TnZipFile) addSync(filename string, data interface{}, options ...interface{}) *TnZipEntry {
	f.tnWritable()
	return f.addEntrySync(TnZipEntryCreateSync(filename, data, options...))
}

func (f *TnZipFile) addEntry(entry *TnZipEntry) chan *TnZipEntry {
	return tnZipSettleChan(func() chan *TnZipEntry {
		f.tnWritable()
		f.tnOpen()
		entry.tnPrepareSource()
		return tnZipEnqueue(f, func() *TnZipEntry { return f.tnAdd(entry, false) })
	})
}

func (f *TnZipFile) add(filename string, data interface{}, options ...interface{}) chan *TnZipEntry {
	return tnZipSettleChan(func() chan *TnZipEntry {
		f.tnWritable()
		f.tnOpen()
		return tnZipEnqueue(f, func() *TnZipEntry {
			return f.tnAdd(TnZipEntryCreateSync(filename, data, options...), false)
		})
	})
}

func (f *TnZipFile) tnDelete(name string) bool {
	f.mu.Lock()
	_, existed := f.infos[name]
	if existed {
		delete(f.infos, name)
		for i, n := range f.order {
			if n == name {
				f.order = append(f.order[:i:i], f.order[i+1:]...)
				break
			}
		}
	}
	f.mu.Unlock()
	if existed {
		f.tnRewrite()
	}
	return existed
}

func (f *TnZipFile) deleteSync(name string) bool {
	f.tnWritable()
	f.tnOpen()
	f.tnNotBusy()
	return f.tnDelete(name)
}

func (f *TnZipFile) delete(name string) chan bool {
	return tnZipSettleChan(func() chan bool {
		f.tnWritable()
		f.tnOpen()
		return tnZipEnqueue(f, func() bool { return f.tnDelete(name) })
	})
}

func (f *TnZipFile) tnCompactEntries() []*TnZipEntry {
	f.tnOpen()
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]*TnZipEntry, len(f.order))
	for i, name := range f.order {
		out[i] = f.tnHandleFor(f.infos[name])
	}
	return out
}

func (f *TnZipFile) compactSync(comment ...interface{}) []byte {
	f.tnOpen()
	f.tnNotBusy()
	entries := f.tnCompactEntries()
	text := f.comment
	if len(comment) > 0 && comment[0] != nil {
		if s, ok := comment[0].(string); ok {
			text = []byte(s)
		}
	}
	var out bytes.Buffer
	tnZipWriteArchive(tnZipSliceNext(entries), tnZipCommentBytes(text), 0, true, func(c []byte) { out.Write(c) })
	return out.Bytes()
}

func (f *TnZipFile) keys() []string {
	f.tnOpen()
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string{}, f.order...)
}

func (f *TnZipFile) values() []chan *TnZipEntry {
	var out []chan *TnZipEntry
	for _, name := range f.keys() {
		out = append(out, f.get(name))
	}
	return out
}

func (f *TnZipFile) valuesSync() []*TnZipEntry {
	var out []*TnZipEntry
	for _, name := range f.keys() {
		out = append(out, f.getSync(name))
	}
	return out
}

func (f *TnZipFile) entries() [][]interface{} {
	var out [][]interface{}
	for _, name := range f.keys() {
		out = append(out, []interface{}{name, f.get(name)})
	}
	return out
}

func (f *TnZipFile) entriesSync() [][]interface{} {
	var out [][]interface{}
	for _, name := range f.keys() {
		out = append(out, []interface{}{name, f.getSync(name)})
	}
	return out
}

func (f *TnZipFile) forEach(callback interface{}, thisArg ...interface{}) {
	for _, pair := range f.entries() {
		TnInvoke(callback, pair[1], pair[0], f)
	}
}

func (f *TnZipFile) forEachSync(callback interface{}, thisArg ...interface{}) {
	for _, pair := range f.entriesSync() {
		TnInvoke(callback, pair[1], pair[0], f)
	}
}

func (f *TnZipFile) closeSync() {
	if f.closing {
		return
	}
	f.tnNotBusy()
	f.closing = true
	f.handle.closing = true
	f.handle.closed = true
	f.mu.Lock()
	f.order = nil
	f.infos = map[string]*tnZipInfo{}
	f.mu.Unlock()
	f.handle.f.Close()
}

func (f *TnZipFile) close() chan struct{} {
	if f.closing {
		ch := make(chan struct{}, 1)
		ch <- struct{}{}
		return ch
	}
	f.closing = true
	f.handle.closing = true
	return tnZipEnqueue(f, func() struct{} {
		f.handle.closed = true
		f.mu.Lock()
		f.order = nil
		f.infos = map[string]*tnZipInfo{}
		f.mu.Unlock()
		f.handle.f.Close()
		return struct{}{}
	})
}

func (f *TnZipFile) dispose() { f.closeSync() }

// An async method's synchronous throw, as a rejection
func tnZipSettleChan[T any](fn func() chan T) (ch chan T) {
	defer func() {
		if r := recover(); r != nil {
			ch = TnPromiseReject[T](r)
		}
	}()
	return fn()
}
`;
