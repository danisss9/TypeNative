// node:zlib — gzip / deflate (zlib format) / raw deflate, unzip (auto-detect),
// crc32 on Go's compress/*, and Brotli on the vendored
// github.com/andybalholm/brotli (pure Go; linked only into programs that use it).

import { NodeRegistry, NodeCall, defineHelper, defineModule, setResults } from './registry.js';

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
		if level, ok := TnGet(options[0], "level").(float64); ok {
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
			if q, ok := TnGet(params, "1").(float64); ok {
				opts.Quality = min(max(int(q), 0), 11)
			}
			if w, ok := TnGet(params, "2").(float64); ok {
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
