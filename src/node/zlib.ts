// node:zlib — gzip / deflate (zlib format) / raw deflate, unzip (auto-detect),
// crc32 on Go's compress/*, and Brotli on the vendored
// github.com/andybalholm/brotli (pure Go; linked only into programs that use it).

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const zlibHelper = `// node:zlib
func tnZlibInput(v interface{}) []byte {
	switch x := v.(type) {
	case string:
		return []byte(x)
	case []byte:
		return x
	}
	return TnBufferFrom(v, "")
}

func tnZlibLevel(options []interface{}) int {
	if len(options) > 0 && options[0] != nil {
		if level, ok := TnGetValue(options[0], "level").(float64); ok {
			return int(level)
		}
	}
	return -1
}

func tnZlibError(err error) *TnError {
	msg := err.Error()
	code := "Z_DATA_ERROR"
	switch {
	case strings.Contains(msg, "invalid header"), strings.Contains(msg, "gzip: invalid"):
		msg = "incorrect header check"
	case strings.Contains(msg, "unexpected EOF"):
		msg = "unexpected end of file"
		code = "Z_BUF_ERROR"
	case strings.Contains(msg, "checksum"):
		msg = "incorrect data check"
	default:
		msg = "invalid stored block lengths"
	}
	e := TnNodeError("Error", code, msg)
	e.props["errno"] = float64(-3)
	return e
}

// Set by the nodeBrotli helper, so the Brotli codec (a vendored module) is
// linked only into programs that use it
var tnBrotliEncode func(data []byte, options []interface{}) []byte
var tnBrotliDecode func(data []byte) []byte

func tnCompress(format string, data []byte, options []interface{}) []byte {
	if format == "brotli" {
		return tnBrotliEncode(data, options)
	}
	level := tnZlibLevel(options)
	var buf bytes.Buffer
	var w io.WriteCloser
	var err error
	switch format {
	case "gzip":
		w, err = gzip.NewWriterLevel(&buf, level)
	case "deflate":
		w, err = zlib.NewWriterLevel(&buf, level)
	default:
		w, err = flate.NewWriter(&buf, level)
	}
	if err != nil {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.level\\" is out of range"))
	}
	w.Write(data)
	w.Close()
	return buf.Bytes()
}

func tnDecompress(format string, data []byte) []byte {
	if format == "brotli" {
		return tnBrotliDecode(data)
	}
	var r io.Reader
	var err error
	if format == "unzip" {
		format = "inflate"
		if len(data) >= 2 && data[0] == 0x1f && data[1] == 0x8b {
			format = "gunzip"
		}
	}
	switch format {
	case "gunzip":
		if len(data) >= 2 && (data[0] != 0x1f || data[1] != 0x8b) {
			panic(tnZlibError(gzip.ErrHeader))
		}
		var zr *gzip.Reader
		zr, err = gzip.NewReader(bytes.NewReader(data))
		if err == nil {
			r = zr
		}
	case "inflate":
		r, err = zlib.NewReader(bytes.NewReader(data))
	default:
		r = flate.NewReader(bytes.NewReader(data))
	}
	if err != nil {
		panic(tnZlibError(err))
	}
	out, err := io.ReadAll(r)
	if err != nil {
		panic(tnZlibError(err))
	}
	return out
}

func TnZlibCompress(format string, data interface{}, options ...interface{}) []byte {
	return tnCompress(format, tnZlibInput(data), options)
}

func TnZlibDecompress(format string, data interface{}, options ...interface{}) []byte {
	return tnDecompress(format, tnZlibInput(data))
}

// zlib.gzip(buf[, options], cb): the codec runs off the loop; cb(err, result) on it
func TnZlibAsync(compress bool, format string, data interface{}, rest ...interface{}) {
	cb := rest[len(rest)-1]
	options := rest[:len(rest)-1]
	input := tnZlibInput(data)
	ctx := TnAsyncSnapshot()
	TnLoopRef()
	go func() {
		var result []byte
		var failure interface{}
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			if compress {
				result = tnCompress(format, input, options)
			} else {
				result = tnDecompress(format, input)
			}
		}()
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() {
				if failure != nil {
					TnInvoke(cb, failure)
					return
				}
				TnInvoke(cb, nil, result)
			})
		})
	}()
}

// util.promisify(zlib.gzip)(buf[, options])
func TnZlibPromise(compress bool, format string, data interface{}, options ...interface{}) chan []byte {
	ch := make(chan []byte, 1)
	input := tnZlibInput(data)
	TnLoopRef()
	go func() {
		var result []byte
		var failure interface{}
		func() {
			defer func() {
				if r := recover(); r != nil {
					failure = r
				}
			}()
			if compress {
				result = tnCompress(format, input, options)
			} else {
				result = tnDecompress(format, input)
			}
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

func TnCrc32(data interface{}, value ...float64) float64 {
	crc := uint32(0)
	if len(value) > 0 {
		crc = uint32(value[0])
	}
	return float64(crc32.Update(crc, crc32.IEEETable, tnZlibInput(data)))
}`;

const brotliHelper = `// node:zlib Brotli (github.com/andybalholm/brotli)
func init() {
	tnBrotliEncode = tnBrotliCompress
	tnBrotliDecode = tnBrotliDecompress
}

// Options: { params: { [BROTLI_PARAM_QUALITY]: q, [BROTLI_PARAM_LGWIN]: w } };
// out-of-range values are clamped, as in Node
func tnBrotliCompress(data []byte, options []interface{}) []byte {
	opts := brotli.WriterOptions{Quality: 11}
	if len(options) > 0 && options[0] != nil {
		if params := TnGet(options[0], "params"); params != nil {
			if q, ok := TnGetValue(params, "1").(float64); ok {
				opts.Quality = min(max(int(q), 0), 11)
			}
			if w, ok := TnGetValue(params, "2").(float64); ok {
				opts.LGWin = min(max(int(w), 10), 24)
			}
		}
	}
	var buf bytes.Buffer
	w := brotli.NewWriterOptions(&buf, opts)
	w.Write(data)
	w.Close()
	return buf.Bytes()
}

// Decoder error names (the library's) → Node's code suffix and errno
var tnBrotliErrors = map[string]int{
	"EXUBERANT_NIBBLE": -1, "RESERVED": -2, "EXUBERANT_META_NIBBLE": -3, "SIMPLE_HUFFMAN_ALPHABET": -4,
	"SIMPLE_HUFFMAN_SAME": -5, "CL_SPACE": -6, "HUFFMAN_SPACE": -7, "CONTEXT_MAP_REPEAT": -8,
	"BLOCK_LENGTH_1": -9, "BLOCK_LENGTH_2": -10, "TRANSFORM": -11, "DICTIONARY": -12,
	"WINDOW_BITS": -13, "PADDING_1": -14, "PADDING_2": -15, "DISTANCE": -16,
	"DICTIONARY_NOT_SET": -19, "INVALID_ARGUMENTS": -20, "CONTEXT_MODES": -21, "TREE_GROUPS": -22,
	"CONTEXT_MAP": -25, "RING_BUFFER_1": -26, "RING_BUFFER_2": -27, "BLOCK_TYPE_TREES": -30,
	"UNREACHABLE": -31,
}

func tnBrotliDecompress(data []byte) []byte {
	out, err := io.ReadAll(brotli.NewReader(bytes.NewReader(data)))
	if err == nil || err.Error() == "brotli: excessive input" {
		// Node ignores bytes after the end of the stream
		return out
	}
	if err == io.ErrUnexpectedEOF || err == io.EOF {
		e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
		e.props["errno"] = float64(-5)
		panic(e)
	}
	name := strings.TrimPrefix(err.Error(), "brotli: ")
	errno, known := tnBrotliErrors[name]
	if !known {
		name, errno = "UNREACHABLE", -31
	}
	switch {
	case errno >= -16:
		name = "ERROR_FORMAT_" + name
	case errno >= -20 || errno == -31:
		name = "ERROR_" + name
	default:
		name = "ERROR_ALLOC_" + name
	}
	e := TnNodeError("Error", "ERR__"+name, "Decompression failed")
	e.props["errno"] = float64(errno)
	panic(e)
}`;

const ZLIB_CONSTANTS: Record<string, number> = {
  Z_NO_FLUSH: 0,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_DATA_ERROR: -3,
  Z_BUF_ERROR: -5,
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1
};

// zlib.constants only (Node does not copy these onto the module)
const BROTLI_CONSTANTS: Record<string, number> = {
  BROTLI_DECODE: 8,
  BROTLI_ENCODE: 9,
  BROTLI_OPERATION_PROCESS: 0,
  BROTLI_OPERATION_FLUSH: 1,
  BROTLI_OPERATION_FINISH: 2,
  BROTLI_OPERATION_EMIT_METADATA: 3,
  BROTLI_PARAM_MODE: 0,
  BROTLI_MODE_GENERIC: 0,
  BROTLI_MODE_TEXT: 1,
  BROTLI_MODE_FONT: 2,
  BROTLI_DEFAULT_MODE: 0,
  BROTLI_PARAM_QUALITY: 1,
  BROTLI_MIN_QUALITY: 0,
  BROTLI_MAX_QUALITY: 11,
  BROTLI_DEFAULT_QUALITY: 11,
  BROTLI_PARAM_LGWIN: 2,
  BROTLI_MIN_WINDOW_BITS: 10,
  BROTLI_MAX_WINDOW_BITS: 24,
  BROTLI_DEFAULT_WINDOW: 22,
  BROTLI_PARAM_LGBLOCK: 3,
  BROTLI_PARAM_SIZE_HINT: 5,
  BROTLI_DECODER_RESULT_ERROR: 0,
  BROTLI_DECODER_RESULT_SUCCESS: 1
};

const zipHelper = `// node:zlib ZIP archives (ZipEntry / ZipBuffer / ZipFile), over archive/zip
var tnMaxZipContentSize float64 = 268435456

func TnGetMaxZipContentSize() float64 { return tnMaxZipContentSize }

func TnSetMaxZipContentSize(size float64) { tnMaxZipContentSize = size }

func tnZipError(code string, message string) *TnError {
	return TnNodeError("Error", code, message)
}

type TnZipEntry struct {
	name           string
	data           []byte
	compressedData []byte
	comment        string
	modified       time.Time
	method         uint16
	crc            uint32
	mode           uint32
	symlink        bool
	dir            bool
	streaming      bool
}

func (e *TnZipEntry) Get_name() string         { return e.name }
func (e *TnZipEntry) Get_nameBuffer() []byte   { return []byte(e.name) }
func (e *TnZipEntry) Get_comment() string      { return e.comment }
func (e *TnZipEntry) Get_modified() time.Time  { return e.modified }
func (e *TnZipEntry) Get_method() float64      { return float64(e.method) }
func (e *TnZipEntry) Get_crc32() float64       { return float64(e.crc) }
func (e *TnZipEntry) Get_mode() float64        { return float64(e.mode) }
func (e *TnZipEntry) Get_flags() float64       { return 0 }
func (e *TnZipEntry) Get_size() float64        { return float64(len(e.data)) }
func (e *TnZipEntry) Get_compressedSize() float64 { return float64(len(e.compressedData)) }
func (e *TnZipEntry) Get_compressed() bool     { return e.method != 0 }
func (e *TnZipEntry) Get_isDirectory() bool    { return e.dir }
func (e *TnZipEntry) Get_isFile() bool         { return !e.dir && !e.symlink }
func (e *TnZipEntry) Get_isSymlink() bool      { return e.symlink }
func (e *TnZipEntry) Get_rawContent() []byte {
	if e.method == 0 {
		return e.data
	}
	return nil
}

func (e *TnZipEntry) tnEncode() {
	e.crc = crc32.ChecksumIEEE(e.data)
	if e.method == 8 {
		var b bytes.Buffer
		w, _ := flate.NewWriter(&b, flate.DefaultCompression)
		w.Write(e.data)
		w.Close()
		if b.Len() >= len(e.data) {
			e.method = 0
			e.compressedData = e.data
		} else {
			e.compressedData = b.Bytes()
		}
	} else {
		e.method = 0
		e.compressedData = e.data
	}
}

func (e *TnZipEntry) tnContent(options ...interface{}) []byte {
	if e.streaming {
		panic(tnZipError("ERR_INVALID_STATE", "The entry's content is not available"))
	}
	max := tnMaxZipContentSize
	if len(options) > 0 && options[0] != nil {
		if m, ok := TnGetValue(options[0], "maxSize").(float64); ok {
			max = m
		}
	}
	if max > 0 && float64(len(e.data)) > max {
		panic(tnZipError("ERR_ZIP_ENTRY_TOO_LARGE", "The entry is larger than the maximum allowed size"))
	}
	return append([]byte{}, e.data...)
}

func (e *TnZipEntry) contentSync(options ...interface{}) []byte { return e.tnContent(options...) }

func (e *TnZipEntry) content(options ...interface{}) chan []byte {
	ch := make(chan []byte, 1)
	ch <- e.tnContent(options...)
	return ch
}

func (e *TnZipEntry) dispose() {}

func TnZipEntryCreateSync(name string, data interface{}, options ...interface{}) *TnZipEntry {
	e := &TnZipEntry{name: name, data: tnZlibInput(data), modified: time.Now(), method: 8}
	if strings.HasSuffix(name, "/") {
		e.dir = true
		e.method = 0
	}
	if len(options) > 0 && options[0] != nil {
		if method, ok := TnGetValue(options[0], "method").(string); ok && method == "store" {
			e.method = 0
		}
		if comment, ok := TnGetValue(options[0], "comment").(string); ok {
			e.comment = comment
		}
		if modified, ok := TnGetValue(options[0], "modified").(time.Time); ok {
			e.modified = modified
		}
		if mode, ok := TnGetValue(options[0], "mode").(float64); ok {
			e.mode = uint32(mode)
		}
	}
	e.tnEncode()
	return e
}

func TnZipEntryCreate(name string, data interface{}, options ...interface{}) chan *TnZipEntry {
	ch := make(chan *TnZipEntry, 1)
	ch <- TnZipEntryCreateSync(name, data, options...)
	return ch
}

func TnZipEntrySymlink(name string, target string, options ...interface{}) *TnZipEntry {
	e := TnZipEntryCreateSync(name, target, options...)
	e.method = 0
	e.symlink = true
	e.mode = 0777
	e.tnEncode()
	return e
}

func tnZipReadEntry(f *zip.File) (*TnZipEntry, error) {
	r, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer r.Close()
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}
	mode := uint32(f.Mode())
	return &TnZipEntry{
		name: f.Name, data: data, comment: f.Comment, modified: f.Modified,
		method: f.Method, crc: f.CRC32, mode: mode,
		symlink: f.Mode()&os.ModeSymlink != 0,
		dir:     strings.HasSuffix(f.Name, "/"),
	}, nil
}

type TnZipBuffer struct {
	order   []string
	byName  map[string]*TnZipEntry
	comment string
}

func tnZipBufferEntries(v interface{}) []*TnZipEntry {
	if b, ok := v.(*TnZipBuffer); ok {
		return b.tnValues()
	}
	var out []*TnZipEntry
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
		for i := 0; i < rv.Len(); i++ {
			if e, ok := rv.Index(i).Interface().(*TnZipEntry); ok {
				out = append(out, e)
			}
		}
	}
	return out
}

func TnNewZipBuffer(data interface{}) *TnZipBuffer {
	raw := tnZlibInput(data)
	reader, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		panic(tnZipError("ERR_ZIP_INVALID_ARCHIVE", "Invalid ZIP archive"))
	}
	b := &TnZipBuffer{byName: map[string]*TnZipEntry{}, comment: reader.Comment}
	for _, f := range reader.File {
		entry, err := tnZipReadEntry(f)
		if err != nil {
			panic(tnZipError("ERR_ZIP_ENTRY_CORRUPT", "Could not read a ZIP entry"))
		}
		b.addEntry(entry)
	}
	return b
}

func (b *TnZipBuffer) addEntry(entry *TnZipEntry) *TnZipEntry {
	if _, found := b.byName[entry.name]; !found {
		b.order = append(b.order, entry.name)
	}
	b.byName[entry.name] = entry
	return entry
}

func (b *TnZipBuffer) get(name string) *TnZipEntry {
	entry, found := b.byName[name]
	if !found {
		panic(tnZipError("ERR_ZIP_ENTRY_NOT_FOUND", "No ZIP entry named "+name))
	}
	return entry
}

func (b *TnZipBuffer) has(name string) bool {
	_, found := b.byName[name]
	return found
}

func (b *TnZipBuffer) delete(name string) bool {
	if _, found := b.byName[name]; !found {
		return false
	}
	delete(b.byName, name)
	for i, n := range b.order {
		if n == name {
			b.order = append(b.order[:i], b.order[i+1:]...)
			break
		}
	}
	return true
}

func (b *TnZipBuffer) clear() {
	b.order = nil
	b.byName = map[string]*TnZipEntry{}
}

func (b *TnZipBuffer) tnValues() []*TnZipEntry {
	out := make([]*TnZipEntry, 0, len(b.order))
	for _, name := range b.order {
		out = append(out, b.byName[name])
	}
	return out
}

func (b *TnZipBuffer) Get_size() float64  { return float64(len(b.order)) }
func (b *TnZipBuffer) Get_comment() string { return b.comment }

func (b *TnZipBuffer) Get_writable() bool { return true }

func (b *TnZipBuffer) addSync(name string, data interface{}, options ...interface{}) *TnZipEntry {
	return b.addEntry(TnZipEntryCreateSync(name, data, options...))
}

func (b *TnZipBuffer) add(name string, data interface{}, options ...interface{}) chan *TnZipEntry {
	ch := make(chan *TnZipEntry, 1)
	ch <- b.addSync(name, data, options...)
	return ch
}

func (b *TnZipBuffer) entries() [][]interface{} {
	out := make([][]interface{}, 0, len(b.order))
	for _, name := range b.order {
		out = append(out, []interface{}{name, b.byName[name]})
	}
	return out
}

func (b *TnZipBuffer) keys() []string {
	return append([]string{}, b.order...)
}

func (b *TnZipBuffer) values() []*TnZipEntry { return b.tnValues() }

func tnZipComment(options []interface{}, fallback string) string {
	if len(options) == 0 || options[0] == nil {
		return fallback
	}
	if text, ok := options[0].(string); ok {
		return text
	}
	if text, ok := TnGetValue(options[0], "comment").(string); ok {
		return text
	}
	return fallback
}

func (b *TnZipBuffer) toBytes(options ...interface{}) []byte {
	comment := tnZipComment(options, b.comment)
	var buf bytes.Buffer
	writer := zip.NewWriter(&buf)
	for _, name := range b.order {
		entry := b.byName[name]
		header := &zip.FileHeader{Name: entry.name, Method: entry.method, Comment: entry.comment}
		header.Modified = entry.modified
		if entry.mode != 0 {
			header.SetMode(os.FileMode(entry.mode))
		}
		if entry.symlink {
			header.SetMode(header.Mode() | os.ModeSymlink)
		}
		w, err := writer.CreateHeader(header)
		if err != nil {
			panic(tnZipError("ERR_ZIP_INVALID_ARCHIVE", "Could not write a ZIP entry"))
		}
		w.Write(entry.data)
	}
	writer.SetComment(comment)
	writer.Close()
	return buf.Bytes()
}

func (b *TnZipBuffer) toBufferSync(options ...interface{}) []byte { return b.toBytes(options...) }

func (b *TnZipBuffer) toBuffer(options ...interface{}) chan []byte {
	ch := make(chan []byte, 1)
	ch <- b.toBytes(options...)
	return ch
}

func TnCreateZipArchiveSync(entries interface{}, options ...interface{}) [][]byte {
	b := &TnZipBuffer{byName: map[string]*TnZipEntry{}}
	for _, entry := range tnZipBufferEntries(entries) {
		b.addEntry(entry)
	}
	return [][]byte{b.toBytes(options...)}
}

func TnCreateZipArchive(entries interface{}, options ...interface{}) chan [][]byte {
	ch := make(chan [][]byte, 1)
	ch <- TnCreateZipArchiveSync(entries, options...)
	return ch
}

func TnZipFiles(files interface{}, options ...interface{}) []byte {
	b := &TnZipBuffer{byName: map[string]*TnZipEntry{}}
	rv := reflect.ValueOf(files)
	if rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array {
		for i := 0; i < rv.Len(); i++ {
			pair := rv.Index(i)
			if pair.Kind() != reflect.Slice || pair.Len() < 2 {
				continue
			}
			source, _ := pair.Index(0).Interface().(string)
			name, _ := pair.Index(1).Interface().(string)
			data, err := os.ReadFile(source)
			if err != nil {
				panic(TnNodeError("Error", "ENOENT", "no such file or directory: "+source))
			}
			info, _ := os.Stat(source)
			entry := TnZipEntryCreateSync(name, data)
			if info != nil {
				entry.modified = info.ModTime()
				entry.mode = uint32(info.Mode())
				if info.IsDir() {
					entry.dir = true
				}
			}
			entry.tnEncode()
			b.addEntry(entry)
		}
	}
	return b.toBytes(options...)
}

type TnZipFile struct {
	path     string
	buffer   *TnZipBuffer
	writable bool
}

func TnZipFileOpenSync(path string, options ...interface{}) *TnZipFile {
	data, err := os.ReadFile(path)
	if err != nil {
		panic(TnNodeError("Error", "ENOENT", "no such file or directory: "+path))
	}
	f := &TnZipFile{path: path, buffer: TnNewZipBuffer(data)}
	if len(options) > 0 && options[0] != nil {
		if flag, ok := TnGetValue(options[0], "writable").(bool); ok {
			f.writable = flag
		}
	}
	return f
}

func TnZipFileOpen(path string, options ...interface{}) chan *TnZipFile {
	ch := make(chan *TnZipFile, 1)
	ch <- TnZipFileOpenSync(path, options...)
	return ch
}

func (f *TnZipFile) tnCheckWritable() {
	if !f.writable {
		panic(tnZipError("ERR_ZIP_NOT_WRITABLE", "The ZIP file was not opened as writable"))
	}
}

func (f *TnZipFile) tnFlush() {
	if f.writable {
		if err := os.WriteFile(f.path, f.buffer.toBytes(), 0o644); err != nil {
			panic(TnNodeError("Error", "EIO", err.Error()))
		}
	}
}

func (f *TnZipFile) Get_comment() string  { return f.buffer.comment }
func (f *TnZipFile) Get_size() float64    { return f.buffer.Get_size() }
func (f *TnZipFile) Get_writable() bool   { return f.writable }

func (f *TnZipFile) getSync(name string) *TnZipEntry { return f.buffer.get(name) }
func (f *TnZipFile) has(name string) bool           { return f.buffer.has(name) }

func (f *TnZipFile) get(name string) chan *TnZipEntry {
	ch := make(chan *TnZipEntry, 1)
	ch <- f.buffer.get(name)
	return ch
}

func (f *TnZipFile) addSync(name string, data interface{}, options ...interface{}) *TnZipEntry {
	f.tnCheckWritable()
	entry := f.buffer.addSync(name, data, options...)
	f.tnFlush()
	return entry
}

func (f *TnZipFile) add(name string, data interface{}, options ...interface{}) chan *TnZipEntry {
	ch := make(chan *TnZipEntry, 1)
	ch <- f.addSync(name, data, options...)
	return ch
}

func (f *TnZipFile) addEntrySync(entry *TnZipEntry) *TnZipEntry {
	f.tnCheckWritable()
	f.buffer.addEntry(entry)
	f.tnFlush()
	return entry
}

func (f *TnZipFile) addEntry(entry *TnZipEntry) chan *TnZipEntry {
	ch := make(chan *TnZipEntry, 1)
	ch <- f.addEntrySync(entry)
	return ch
}

func (f *TnZipFile) deleteSync(name string) bool {
	f.tnCheckWritable()
	deleted := f.buffer.delete(name)
	f.tnFlush()
	return deleted
}

func (f *TnZipFile) delete(name string) chan bool {
	ch := make(chan bool, 1)
	ch <- f.deleteSync(name)
	return ch
}

func (f *TnZipFile) compactSync(comment ...interface{}) []byte {
	return f.buffer.toBytes(comment...)
}

func (f *TnZipFile) compact(comment ...interface{}) chan []byte {
	ch := make(chan []byte, 1)
	ch <- f.compactSync(comment...)
	return ch
}

func (f *TnZipFile) closeSync() {}
func (f *TnZipFile) close() chan struct{} {
	ch := make(chan struct{}, 1)
	ch <- struct{}{}
	return ch
}

func (f *TnZipFile) entriesSync() [][]interface{} { return f.buffer.entries() }
func (f *TnZipFile) keys() []string               { return f.buffer.keys() }
func (f *TnZipFile) valuesSync() []*TnZipEntry    { return f.buffer.values() }
`;

export function registerZlib(r: NodeRegistry): void {
  defineModule(r, 'zlib');
  defineHelper(r, 'nodeZlib', ['bytes', 'compress/flate', 'compress/gzip', 'compress/zlib', 'hash/crc32', 'io', 'strings'], ['error', 'buffer', 'dynamic', 'eventLoop', 'promise', 'nodeInvoke'], zlibHelper);
  defineHelper(r, 'nodeBrotli', ['bytes', 'github.com/andybalholm/brotli', 'io', 'strings'], ['nodeZlib'], brotliHelper);
  // Brotli entries pull in the codec helper too
  const use = (format: string) => r.helper(format === 'brotli' ? 'nodeBrotli' : 'nodeZlib');
  const formats: Record<string, string> = {
    gzipSync: 'gzip',
    deflateSync: 'deflate',
    deflateRawSync: 'deflateRaw',
    brotliCompressSync: 'brotli'
  };
  for (const name of Object.keys(formats)) {
    const format = formats[name];
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      use(format);
      return `TnZlibCompress(${JSON.stringify(format)}, ${call.args.join(', ')})`;
    };
    r.results[`zlib.${name}`] = '[]byte';
  }
  const decoders: Record<string, string> = {
    gunzipSync: 'gunzip',
    inflateSync: 'inflate',
    inflateRawSync: 'inflateRaw',
    unzipSync: 'unzip',
    brotliDecompressSync: 'brotli'
  };
  for (const name of Object.keys(decoders)) {
    const format = decoders[name];
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      use(format);
      return `TnZlibDecompress(${JSON.stringify(format)}, ${call.args.join(', ')})`;
    };
    r.results[`zlib.${name}`] = '[]byte';
  }
  // Callback forms (zlib.gzip(buf[, options], cb)) and their promisified variants
  const asyncForms: Record<string, string> = {
    gzip: 'gzip',
    deflate: 'deflate',
    deflateRaw: 'deflateRaw',
    gunzip: 'gunzip',
    inflate: 'inflate',
    inflateRaw: 'inflateRaw',
    unzip: 'unzip',
    brotliCompress: 'brotli',
    brotliDecompress: 'brotli'
  };
  for (const name of Object.keys(asyncForms)) {
    const format = asyncForms[name];
    const compress =
      name === 'gzip' || name === 'deflate' || name === 'deflateRaw' || name === 'brotliCompress' ? 'true' : 'false';
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      use(format);
      return `TnZlibAsync(${compress}, ${JSON.stringify(format)}, ${call.args.join(', ')})`;
    };
    r.results[`zlib.${name}`] = '';
    r.paramTypers[`zlib.${name}`] = (_n: any[]) => ['*TnError', '[]byte'];
    r.functions[`zlib.${name}.__promisify__`] = (call: NodeCall) => {
      use(format);
      return `TnZlibPromise(${compress}, ${JSON.stringify(format)}, ${call.args.join(', ')})`;
    };
    r.results[`zlib.${name}.__promisify__`] = 'chan []byte';
  }
  r.functions['zlib.crc32'] = (call: NodeCall) => {
    r.helper('nodeZlib');
    return `TnCrc32(${call.args.join(', ')})`;
  };
  setResults(r, 'zlib', 'crc32=float64');
  // ZIP archives (Node 26): ZipEntry / ZipBuffer / ZipFile
  defineHelper(
    r,
    'nodeZip',
    ['archive/zip', 'bytes', 'compress/flate', 'hash/crc32', 'io', 'os', 'reflect', 'strings', 'time'],
    ['error', 'nodeZlib'],
    zipHelper
  );
  defineClass(
    r,
    'zlib.ZipEntry',
    '*TnZipEntry',
    'class',
    'contentSync=[]byte; content=chan []byte; dispose=',
    '',
    'name=string; nameBuffer=[]byte; comment=string; modified=time.Time; method=float64; crc32=float64; mode=float64; flags=float64; size=float64; compressedSize=float64; compressed=bool; isDirectory=bool; isFile=bool; isSymlink=bool; rawContent=[]byte',
    ''
  );
  defineClass(
    r,
    'zlib.ZipBuffer',
    '*TnZipBuffer',
    'class',
    'addSync=*TnZipEntry; add=chan *TnZipEntry; addEntry=*TnZipEntry; clear=; delete=bool; entries=[][]interface{}; get=*TnZipEntry; has=bool; keys=[]string; values=[]*TnZipEntry; toBufferSync=[]byte; toBuffer=chan []byte',
    '',
    'comment=string; size=float64; writable=bool',
    ''
  );
  defineClass(
    r,
    'zlib.ZipFile',
    '*TnZipFile',
    'class',
    'addSync=*TnZipEntry; add=chan *TnZipEntry; addEntrySync=*TnZipEntry; addEntry=chan *TnZipEntry; deleteSync=bool; delete=chan bool; getSync=*TnZipEntry; get=chan *TnZipEntry; has=bool; compactSync=[]byte; compact=chan []byte; closeSync=; close=chan struct{}; entriesSync=[][]interface{}; keys=[]string; valuesSync=[]*TnZipEntry',
    '',
    'comment=string; size=float64; writable=bool',
    ''
  );
  r.iterators['*TnZipBuffer'] = 'entries';
  r.constructors['zlib.ZipBuffer'] = (call: NodeCall) => {
    r.helper('nodeZip');
    return `TnNewZipBuffer(${call.args[0]})`;
  };
  const zipStatic = (name: string, target: string, result: string, args: (call: NodeCall) => string) => {
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      r.helper('nodeZip');
      return `${target}(${args(call)})`;
    };
    r.results[`zlib.${name}`] = result;
  };
  zipStatic('ZipEntry.createSync', 'TnZipEntryCreateSync', '*TnZipEntry', (c: NodeCall) => c.args.join(', '));
  zipStatic('ZipEntry.create', 'TnZipEntryCreate', 'chan *TnZipEntry', (c: NodeCall) => c.args.join(', '));
  zipStatic('ZipEntry.createSymlink', 'TnZipEntrySymlink', '*TnZipEntry', (c: NodeCall) => c.args.join(', '));
  zipStatic('ZipFile.openSync', 'TnZipFileOpenSync', '*TnZipFile', (c: NodeCall) => c.args.join(', '));
  zipStatic('ZipFile.open', 'TnZipFileOpen', 'chan *TnZipFile', (c: NodeCall) => c.args.join(', '));
  zipStatic('createZipArchiveSync', 'TnCreateZipArchiveSync', '[][]byte', (c: NodeCall) => c.args.join(', '));
  zipStatic('createZipArchive', 'TnCreateZipArchive', 'chan [][]byte', (c: NodeCall) => c.args.join(', '));
  zipStatic('zipFiles', 'TnZipFiles', '[]byte', (c: NodeCall) => c.args.join(', '));
  zipStatic('getMaxZipContentSize', 'TnGetMaxZipContentSize', 'float64', () => '');
  r.functions['zlib.setMaxZipContentSize'] = (call: NodeCall) => {
    r.helper('nodeZip');
    return `TnSetMaxZipContentSize(${call.args[0]})`;
  };
  r.objects['zlib.constants'] = true;
  for (const name of Object.keys(ZLIB_CONSTANTS)) {
    const value = ZLIB_CONSTANTS[name];
    r.values[`zlib.constants.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`zlib.constants.${name}`] = 'float64';
    r.values[`zlib.${name}`] = r.values[`zlib.constants.${name}`];
    r.valueTypes[`zlib.${name}`] = 'float64';
  }
  for (const name of Object.keys(BROTLI_CONSTANTS)) {
    const value = BROTLI_CONSTANTS[name];
    r.values[`zlib.constants.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`zlib.constants.${name}`] = 'float64';
  }
}
