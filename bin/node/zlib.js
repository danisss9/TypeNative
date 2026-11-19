// node:zlib — gzip / deflate (zlib format) / raw deflate, unzip (auto-detect),
// crc32 on Go's compress/*, Brotli on the vendored
// github.com/andybalholm/brotli and Zstd on the vendored
// github.com/klauspost/compress (both pure Go; linked only into programs that
// use them).
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { zipHelper, zipContainersHelper, zipStreamHelper } from './zlib_zip.js';
import { zlibIterHelper } from './zlib_iter.js';
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
var tnBrotliIterNewWriter func(w io.Writer, options []interface{}) io.WriteCloser
var tnBrotliIterNewReader func(r io.Reader) (io.Reader, func(error) *TnError)

// Set by the nodeZstd helper, so the Zstd codec (a vendored module) is
// linked only into programs that use it
var tnZstdEncode func(data []byte, options []interface{}) []byte
// The ZIP archive writer's Zstd method (nil unless the codec is linked)
var tnZipZstdEncode func(data []byte) []byte
var tnZstdDecode func(data []byte) []byte
var tnZstdIterNewWriter func(w io.Writer, options []interface{}) (io.WriteCloser, error)
var tnZstdIterNewReader func(r io.Reader) (io.ReadCloser, func(error) *TnError)

func tnCompress(format string, data []byte, options []interface{}) []byte {
	if format == "brotli" {
		return tnBrotliEncode(data, options)
	}
	if format == "zstd" {
		return tnZstdEncode(data, options)
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
	if format == "zstd" {
		return tnZstdDecode(data)
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
	tnBrotliIterNewWriter = tnBrotliNewIterWriter
	tnBrotliIterNewReader = tnBrotliNewIterReader
}

func tnBrotliOptions(options []interface{}, defaultQuality int) brotli.WriterOptions {
	opts := brotli.WriterOptions{Quality: defaultQuality}
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
	return opts
}

func tnBrotliNewIterWriter(w io.Writer, options []interface{}) io.WriteCloser {
	return brotli.NewWriterOptions(w, tnBrotliOptions(options, 6))
}

func tnBrotliNewIterReader(r io.Reader) (io.Reader, func(error) *TnError) {
	return brotli.NewReader(r), func(err error) *TnError {
		if err == nil || err == io.EOF || err.Error() == "brotli: excessive input" {
			return nil
		}
		return tnBrotliError(err)
	}
}

// Options: { params: { [BROTLI_PARAM_QUALITY]: q, [BROTLI_PARAM_LGWIN]: w } };
// out-of-range values are clamped, as in Node
func tnBrotliCompress(data []byte, options []interface{}) []byte {
	var buf bytes.Buffer
	w := brotli.NewWriterOptions(&buf, tnBrotliOptions(options, 11))
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

func tnBrotliError(err error) *TnError {
	if err == io.ErrUnexpectedEOF || err == io.EOF {
		e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
		e.props["errno"] = float64(-5)
		return e
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
	return e
}

func tnBrotliDecompress(data []byte) []byte {
	out, err := io.ReadAll(brotli.NewReader(bytes.NewReader(data)))
	if err == nil || err.Error() == "brotli: excessive input" {
		// Node ignores bytes after the end of the stream
		return out
	}
	panic(tnBrotliError(err))
}`;
// Zstd's frames are located by hand before decoding: libzstd ignores bytes
// after the last complete frame (whatever they are) and reports a frame that
// ends mid-way as "unexpected end of file", while the decoder's DecodeAll
// reports both the same way
const zstdHelper = `// node:zlib Zstd (github.com/klauspost/compress, pure Go; linked only into
// programs that use it)
func init() {
	tnZstdEncode = tnZstdCompress
	tnZstdDecode = tnZstdDecompress
	// (the ZIP archive writer's method: 'zstd' entries use it when the codec
	// is linked)
	tnZipZstdEncode = func(data []byte) []byte { return tnZstdCompress(data, nil) }
	tnZstdIterNewWriter = tnZstdNewIterWriter
	tnZstdIterNewReader = tnZstdNewIterReader
}

func tnZstdNewIterWriter(w io.Writer, options []interface{}) (io.WriteCloser, error) {
	opts := []zstd.EOption{zstd.WithEncoderLevel(zstd.EncoderLevelFromZstd(tnZstdLevel(options)))}
	if len(options) > 0 && options[0] != nil {
		if params := TnGet(options[0], "params"); params != nil {
			if win, ok := TnGetValue(params, "101").(float64); ok && win >= 10 && win <= 31 {
				opts = append(opts, zstd.WithWindowSize(1<<uint(win)))
			}
		}
	}
	return zstd.NewWriter(w, opts...)
}

func tnZstdNewIterReader(r io.Reader) (io.ReadCloser, func(error) *TnError) {
	d, err := zstd.NewReader(r)
	if err != nil {
		panic(TnNodeError("Error", "ZSTD_error_GENERIC", "zstd decompression failed"))
	}
	return d.IOReadCloser(), func(err error) *TnError {
		if err == nil || err == io.EOF {
			return nil
		}
		if err == io.ErrUnexpectedEOF || strings.Contains(err.Error(), "unexpected EOF") {
			e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
			e.props["errno"] = float64(-5)
			return e
		}
		if err == zstd.ErrMagicMismatch || strings.Contains(err.Error(), "magic") {
			e := TnNodeError("Error", "ZSTD_error_prefix_unknown", "Unknown frame descriptor")
			e.props["errno"] = float64(10)
			return e
		}
		if strings.Contains(err.Error(), "checksum") || strings.Contains(err.Error(), "CRC") {
			e := TnNodeError("Error", "ZSTD_error_checksum_wrong", "Restored data doesn't match checksum")
			e.props["errno"] = float64(22)
			return e
		}
		e := TnNodeError("Error", "ZSTD_error_corruption_detected", "Data corruption detected")
		e.props["errno"] = float64(20)
		return e
	}
}

// The \`level\` option (default 3) or \`params[ZSTD_c_compressionLevel]\`;
// klauspost's encoder covers libzstd's levels with its four speeds and
// ZSTD_c_windowLog with the window size (its other params have no equivalent
// here, so they are accepted and ignored)
func tnZstdLevel(options []interface{}) int {
	level := 3
	if len(options) > 0 && options[0] != nil {
		if l, ok := TnGetValue(options[0], "level").(float64); ok {
			level = int(l)
		}
		if params := TnGet(options[0], "params"); params != nil {
			if l, ok := TnGetValue(params, "100").(float64); ok {
				level = int(l)
			}
		}
	}
	return level
}

func tnZstdCompress(data []byte, options []interface{}) []byte {
	if len(data) == 0 {
		// libzstd's frame for empty input: magic, single-segment header with a
		// zero content size, one empty last block
		return []byte{0x28, 0xb5, 0x2f, 0xfd, 0x20, 0x00, 0x01, 0x00, 0x00}
	}
	opts := []zstd.EOption{zstd.WithEncoderLevel(zstd.EncoderLevelFromZstd(tnZstdLevel(options)))}
	if len(options) > 0 && options[0] != nil {
		if params := TnGet(options[0], "params"); params != nil {
			if w, ok := TnGetValue(params, "101").(float64); ok && w >= 10 && w <= 31 {
				opts = append(opts, zstd.WithWindowSize(1<<uint(w)))
			}
		}
	}
	var buf bytes.Buffer
	w, err := zstd.NewWriter(&buf, opts...)
	if err != nil {
		panic(TnNodeError("Error", "ZSTD_error_GENERIC", "zstd compression failed"))
	}
	w.Write(data)
	w.Close()
	return buf.Bytes()
}

// End offset of the zstd frame starting at start (at least 4 bytes are left):
// -1 when it ends mid-way, -2 when those bytes are not a frame
func tnZstdFrameEnd(data []byte, start int) int {
	i := start
	magic := uint32(data[i]) | uint32(data[i+1])<<8 | uint32(data[i+2])<<16 | uint32(data[i+3])<<24
	if magic >= 0x184D2A50 && magic <= 0x184D2A5F { // a skippable frame
		if len(data)-i < 8 {
			return -1
		}
		size := int(uint32(data[i+4]) | uint32(data[i+5])<<8 | uint32(data[i+6])<<16 | uint32(data[i+7])<<24)
		if len(data)-i < 8+size {
			return -1
		}
		return i + 8 + size
	}
	if magic != 0xFD2FB528 { // another format's magic
		return -2
	}
	if len(data)-i < 5 {
		return -1
	}
	if data[i+4]&0x08 != 0 { // the reserved bit
		return -2
	}
	fhd := data[i+4]
	checksum := fhd&0x04 != 0 // a four-byte checksum follows the last block
	i += 5
	if fhd&0x20 == 0 { // not single-segment: a window descriptor follows
		i++
	}
	switch fhd & 3 { // the dictionary-ID field
	case 1:
		i++
	case 2:
		i += 2
	case 3:
		i += 4
	}
	switch (fhd >> 6) & 3 { // the content-size field (1 byte with single-segment and no flag)
	case 1:
		i += 2
	case 2:
		i += 4
	case 3:
		i += 8
	case 0:
		if fhd&0x20 != 0 {
			i++
		}
	}
	for { // the blocks, until one says it is the last
		if len(data)-i < 3 {
			return -1
		}
		header := uint32(data[i]) | uint32(data[i+1])<<8 | uint32(data[i+2])<<16
		kind := (header >> 1) & 3
		size := int(header >> 3)
		i += 3
		switch kind {
		case 0, 2: // raw or compressed
			if len(data)-i < size {
				return -1
			}
			i += size
		case 1: // one byte repeated
			i++
		default: // reserved
			return -2
		}
		if header&1 == 1 {
			if checksum {
				i += 4
			}
			return i
		}
	}
}

// End of the last complete frame, and 0, or -1 / -2 when the scan stopped on
// a frame that ends mid-way / on bytes that are not a frame
func tnZstdScan(data []byte) (int, int) {
	i := 0
	for i < len(data) {
		if len(data)-i < 4 {
			if i == 0 {
				return 0, -1
			}
			return i, 0 // a byte or three after the last frame: ignored
		}
		end := tnZstdFrameEnd(data, i)
		if end == -1 { // ends mid-way
			return i, -1
		}
		if end == -2 { // not a frame: an error at the start, ignored later
			if i == 0 {
				return 0, -2
			}
			return i, 0
		}
		i = end
	}
	return i, 0
}

func tnZstdDecompress(data []byte) []byte {
	if len(data) == 0 {
		e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
		e.props["errno"] = float64(-5)
		panic(e)
	}
	valid, status := tnZstdScan(data)
	switch {
	case status == -1:
		e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
		e.props["errno"] = float64(-5)
		panic(e)
	case status == -2:
		e := TnNodeError("Error", "ZSTD_error_prefix_unknown", "Unknown frame descriptor")
		e.props["errno"] = float64(10)
		panic(e)
	}
	d, err := zstd.NewReader(bytes.NewReader(nil))
	if err != nil {
		panic(TnNodeError("Error", "ZSTD_error_GENERIC", "zstd decompression failed"))
	}
	out, err := d.DecodeAll(data[:valid], nil)
	if err != nil {
		if strings.Contains(err.Error(), "checksum") || strings.Contains(err.Error(), "CRC") {
			e := TnNodeError("Error", "ZSTD_error_checksum_wrong", "Restored data doesn't match checksum")
			e.props["errno"] = float64(22)
			panic(e)
		}
		e := TnNodeError("Error", "ZSTD_error_corruption_detected", "Data corruption detected")
		e.props["errno"] = float64(20)
		panic(e)
	}
	return out
}`;
const ZLIB_CONSTANTS = {
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
const BROTLI_CONSTANTS = {
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
// Zstd (libzstd's ZSTD_ErrorCode values, reported positive in errno)
const ZSTD_CONSTANTS = {
    ZSTD_COMPRESS: 10,
    ZSTD_DECOMPRESS: 11,
    ZSTD_e_continue: 0,
    ZSTD_e_flush: 1,
    ZSTD_e_end: 2,
    ZSTD_fast: 1,
    ZSTD_dfast: 2,
    ZSTD_greedy: 3,
    ZSTD_lazy: 4,
    ZSTD_lazy2: 5,
    ZSTD_btlazy2: 6,
    ZSTD_btopt: 7,
    ZSTD_btultra: 8,
    ZSTD_btultra2: 9,
    ZSTD_c_compressionLevel: 100,
    ZSTD_c_windowLog: 101,
    ZSTD_c_hashLog: 102,
    ZSTD_c_chainLog: 103,
    ZSTD_c_searchLog: 104,
    ZSTD_c_minMatch: 105,
    ZSTD_c_targetLength: 106,
    ZSTD_c_strategy: 107,
    ZSTD_c_enableLongDistanceMatching: 160,
    ZSTD_c_ldmHashLog: 161,
    ZSTD_c_ldmMinMatch: 162,
    ZSTD_c_ldmBucketSizeLog: 163,
    ZSTD_c_ldmHashRateLog: 164,
    ZSTD_c_contentSizeFlag: 200,
    ZSTD_c_checksumFlag: 201,
    ZSTD_c_dictIDFlag: 202,
    ZSTD_c_nbWorkers: 400,
    ZSTD_c_jobSize: 401,
    ZSTD_c_overlapLog: 402,
    ZSTD_d_windowLogMax: 100,
    ZSTD_CLEVEL_DEFAULT: 3,
    ZSTD_error_no_error: 0,
    ZSTD_error_GENERIC: 1,
    ZSTD_error_prefix_unknown: 10,
    ZSTD_error_version_unsupported: 12,
    ZSTD_error_frameParameter_unsupported: 14,
    ZSTD_error_frameParameter_windowTooLarge: 16,
    ZSTD_error_corruption_detected: 20,
    ZSTD_error_checksum_wrong: 22,
    ZSTD_error_literals_headerWrong: 24,
    ZSTD_error_dictionary_corrupted: 30,
    ZSTD_error_dictionary_wrong: 32,
    ZSTD_error_dictionaryCreation_failed: 34,
    ZSTD_error_parameter_unsupported: 40,
    ZSTD_error_parameter_combination_unsupported: 41,
    ZSTD_error_parameter_outOfBound: 42,
    ZSTD_error_tableLog_tooLarge: 44,
    ZSTD_error_maxSymbolValue_tooLarge: 46,
    ZSTD_error_maxSymbolValue_tooSmall: 48,
    ZSTD_error_stabilityCondition_notRespected: 50,
    ZSTD_error_stage_wrong: 60,
    ZSTD_error_init_missing: 62,
    ZSTD_error_memory_allocation: 64,
    ZSTD_error_workSpace_tooSmall: 66,
    ZSTD_error_dstSize_tooSmall: 70,
    ZSTD_error_srcSize_wrong: 72,
    ZSTD_error_dstBuffer_null: 74,
    ZSTD_error_noForwardProgress_destFull: 80,
    ZSTD_error_noForwardProgress_inputEmpty: 82
};
export function registerZlib(r) {
    defineModule(r, 'zlib');
    defineModule(r, 'zlib/iter');
    defineHelper(r, 'nodeZlib', ['bytes', 'compress/flate', 'compress/gzip', 'compress/zlib', 'hash/crc32', 'io', 'strings'], ['error', 'buffer', 'dynamic', 'eventLoop', 'promise', 'nodeInvoke'], zlibHelper);
    defineHelper(r, 'nodeBrotli', ['bytes', 'github.com/andybalholm/brotli', 'io', 'strings'], ['nodeZlib'], brotliHelper);
    defineHelper(r, 'nodeZstd', ['bytes', 'github.com/klauspost/compress/zstd', 'io', 'strings'], ['nodeZlib'], zstdHelper);
    defineHelper(r, 'nodeZlibIter', ['bytes', 'compress/gzip', 'compress/zlib', 'io', 'iter', 'reflect'], ['nodeZlib', 'generatorStep', 'dynamic', 'error', 'buffer'], zlibIterHelper);
    defineClass(r, 'zlib/iter.Transform', '*TnZlibIterTransform', 'class', 'transform=iter.Seq[[][]byte]', '', '', '');
    // Codec entries pull in the codec's helper too
    const use = (format) => r.helper(format === 'brotli' ? 'nodeBrotli' : format === 'zstd' ? 'nodeZstd' : 'nodeZlib');
    const formats = {
        gzipSync: 'gzip',
        deflateSync: 'deflate',
        deflateRawSync: 'deflateRaw',
        brotliCompressSync: 'brotli',
        zstdCompressSync: 'zstd'
    };
    for (const name of Object.keys(formats)) {
        const format = formats[name];
        r.functions[`zlib.${name}`] = (call) => {
            use(format);
            return `TnZlibCompress(${JSON.stringify(format)}, ${call.args.join(', ')})`;
        };
        r.results[`zlib.${name}`] = '[]byte';
    }
    const decoders = {
        gunzipSync: 'gunzip',
        inflateSync: 'inflate',
        inflateRawSync: 'inflateRaw',
        unzipSync: 'unzip',
        brotliDecompressSync: 'brotli',
        zstdDecompressSync: 'zstd'
    };
    for (const name of Object.keys(decoders)) {
        const format = decoders[name];
        r.functions[`zlib.${name}`] = (call) => {
            use(format);
            return `TnZlibDecompress(${JSON.stringify(format)}, ${call.args.join(', ')})`;
        };
        r.results[`zlib.${name}`] = '[]byte';
    }
    // Callback forms (zlib.gzip(buf[, options], cb)) and their promisified variants
    const asyncForms = {
        gzip: 'gzip',
        deflate: 'deflate',
        deflateRaw: 'deflateRaw',
        gunzip: 'gunzip',
        inflate: 'inflate',
        inflateRaw: 'inflateRaw',
        unzip: 'unzip',
        brotliCompress: 'brotli',
        brotliDecompress: 'brotli',
        zstdCompress: 'zstd',
        zstdDecompress: 'zstd'
    };
    for (const name of Object.keys(asyncForms)) {
        const format = asyncForms[name];
        const compress = name === 'gzip' || name === 'deflate' || name === 'deflateRaw' || name === 'brotliCompress' || name === 'zstdCompress'
            ? 'true'
            : 'false';
        r.functions[`zlib.${name}`] = (call) => {
            use(format);
            return `TnZlibAsync(${compress}, ${JSON.stringify(format)}, ${call.args.join(', ')})`;
        };
        r.results[`zlib.${name}`] = '';
        r.paramTypers[`zlib.${name}`] = (_n) => ['*TnError', '[]byte'];
        r.functions[`zlib.${name}.__promisify__`] = (call) => {
            use(format);
            return `TnZlibPromise(${compress}, ${JSON.stringify(format)}, ${call.args.join(', ')})`;
        };
        r.results[`zlib.${name}.__promisify__`] = 'chan []byte';
    }
    r.functions['zlib.crc32'] = (call) => {
        r.helper('nodeZlib');
        return `TnCrc32(${call.args.join(', ')})`;
    };
    setResults(r, 'zlib', 'crc32=float64');
    // node:zlib/iter — iterable compression / decompression transforms (sync + async)
    const iterTransforms = {
        compressGzipSync: ['gzip', true, false],
        decompressGzipSync: ['gzip', false, false],
        compressDeflateSync: ['deflate', true, false],
        decompressDeflateSync: ['deflate', false, false],
        compressBrotliSync: ['brotli', true, false],
        decompressBrotliSync: ['brotli', false, false],
        compressZstdSync: ['zstd', true, false],
        decompressZstdSync: ['zstd', false, false],
        compressGzip: ['gzip', true, true],
        decompressGzip: ['gzip', false, true],
        compressDeflate: ['deflate', true, true],
        decompressDeflate: ['deflate', false, true],
        compressBrotli: ['brotli', true, true],
        decompressBrotli: ['brotli', false, true],
        compressZstd: ['zstd', true, true],
        decompressZstd: ['zstd', false, true]
    };
    for (const name of Object.keys(iterTransforms)) {
        const [format, compress, async] = iterTransforms[name];
        r.functions[`zlib/iter.${name}`] = (call) => {
            use(format);
            r.helper('nodeZlibIter');
            const args = [JSON.stringify(format), compress ? 'true' : 'false', async ? 'true' : 'false', ...call.args];
            return `TnNewZlibIterTransform(${args.join(', ')})`;
        };
        r.results[`zlib/iter.${name}`] = '*TnZlibIterTransform';
    }
    // ZIP archives (Node 26.8): ZipEntry / ZipBuffer / ZipFile, createZipArchive(Sync), zipFiles
    defineHelper(r, 'nodeZip', ['bytes', 'compress/flate', 'encoding/binary', 'encoding/json', 'hash/crc32', 'io', 'math', 'os', 'reflect', 'sort', 'strconv', 'strings', 'time', 'unicode/utf8'], ['error', 'buffer', 'date', 'dynamic', 'eventLoop', 'promise', 'nodeZlib', 'nodeStream'], zipHelper);
    defineHelper(r, 'nodeZipContainers', ['bytes', 'os', 'sync', 'sync/atomic'], ['nodeZip', 'fsErrors', 'nodeInvoke', 'nodeStream'], zipContainersHelper);
    defineHelper(r, 'nodeZipStream', ['os', 'reflect', 'runtime', 'strings'], ['nodeZipContainers', 'nodeStream'], zipStreamHelper);
    defineClass(r, 'zlib.ZipEntry', '*TnZipEntry', 'class', 'contentSync=[]byte; content=chan []byte; contentIterator=chan []byte; dispose=', '', 'name=string; nameBuffer=[]byte; comment=string; modified=time.Time; method=float64; crc32=float64; mode=float64; flags=float64; size=float64; compressedSize=float64; compressed=bool; isDirectory=bool; isFile=bool; isSymlink=bool; rawContent=[]byte', '');
    defineClass(r, 'zlib.ZipBuffer', '*TnZipBuffer', 'class', 'addSync=*TnZipEntry; add=chan *TnZipEntry; addEntry=*TnZipEntry; clear=; delete=bool; entries=[][]interface{}; forEach=; get=*TnZipEntry; has=bool; keys=[]string; values=[]*TnZipEntry; toBufferSync=[]byte; toBuffer=chan []byte; dispose=', '', 'comment=string; size=float64; writable=bool', '');
    defineClass(r, 'zlib.ZipFile', '*TnZipFile', 'class', 'addSync=*TnZipEntry; add=chan *TnZipEntry; addEntrySync=*TnZipEntry; addEntry=chan *TnZipEntry; deleteSync=bool; delete=chan bool; getSync=*TnZipEntry; get=chan *TnZipEntry; has=bool; stream=chan *TnStream; compactSync=[]byte; compact=*TnStream; closeSync=; close=chan struct{}; entries=[][]interface{}; entriesSync=[][]interface{}; forEach=; forEachSync=; keys=[]string; values=[]chan *TnZipEntry; valuesSync=[]*TnZipEntry; dispose=', '', 'comment=string; size=float64; writable=bool', '');
    r.iterators['*TnZipBuffer'] = 'entries';
    r.iterators['*TnZipFile'] = 'entries';
    for (const method of ['compact', 'stream']) {
        r.methods[`zlib.ZipFile#${method}`] = (call) => {
            r.helper('nodeZipStream');
            return `${call.recv}.${method}(${call.args.join(', ')})`;
        };
    }
    r.constructors['zlib.ZipBuffer'] = (call) => {
        r.helper('nodeZipContainers');
        return `TnNewZipBuffer(${call.args[0]})`;
    };
    const zipStatic = (name, target, result, helper) => {
        r.functions[`zlib.${name}`] = (call) => {
            r.helper(helper);
            return `${target}(${call.args.join(', ')})`;
        };
        r.results[`zlib.${name}`] = result;
    };
    zipStatic('ZipEntry.createSync', 'TnZipEntryCreateSync', '*TnZipEntry', 'nodeZip');
    zipStatic('ZipEntry.create', 'TnZipEntryCreate', 'chan *TnZipEntry', 'nodeZip');
    zipStatic('ZipEntry.createStream', 'TnZipEntryCreateStream', '*TnZipEntry', 'nodeZip');
    zipStatic('ZipEntry.createSymlink', 'TnZipEntrySymlink', '*TnZipEntry', 'nodeZip');
    zipStatic('ZipEntry.read', 'TnZipEntryRead', '[]*TnZipEntry', 'nodeZip');
    zipStatic('ZipFile.openSync', 'TnZipFileOpenSync', '*TnZipFile', 'nodeZipContainers');
    zipStatic('ZipFile.open', 'TnZipFileOpen', 'chan *TnZipFile', 'nodeZipContainers');
    zipStatic('createZipArchiveSync', 'TnCreateZipArchiveSync', '[][]byte', 'nodeZipContainers');
    zipStatic('createZipArchive', 'TnCreateZipArchive', '*TnStream', 'nodeZipStream');
    zipStatic('zipFiles', 'TnZipFiles', '*TnStream', 'nodeZipStream');
    zipStatic('getMaxZipContentSize', 'TnGetMaxZipContentSize', 'float64', 'nodeZip');
    zipStatic('setMaxZipContentSize', 'TnSetMaxZipContentSize', '', 'nodeZip');
    r.objects['zlib.constants'] = true;
    for (const name of Object.keys(ZLIB_CONSTANTS)) {
        const value = ZLIB_CONSTANTS[name];
        r.values[`zlib.constants.${name}`] = (_c) => `float64(${value})`;
        r.valueTypes[`zlib.constants.${name}`] = 'float64';
        r.values[`zlib.${name}`] = r.values[`zlib.constants.${name}`];
        r.valueTypes[`zlib.${name}`] = 'float64';
    }
    for (const name of Object.keys(BROTLI_CONSTANTS)) {
        const value = BROTLI_CONSTANTS[name];
        r.values[`zlib.constants.${name}`] = (_c) => `float64(${value})`;
        r.valueTypes[`zlib.constants.${name}`] = 'float64';
    }
    for (const name of Object.keys(ZSTD_CONSTANTS)) {
        const value = ZSTD_CONSTANTS[name];
        r.values[`zlib.constants.${name}`] = (_c) => `float64(${value})`;
        r.valueTypes[`zlib.constants.${name}`] = 'float64';
        r.values[`zlib.${name}`] = r.values[`zlib.constants.${name}`];
        r.valueTypes[`zlib.${name}`] = 'float64';
    }
}
