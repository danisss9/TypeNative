// node:zlib — synchronous gzip / deflate (zlib format) / raw deflate, unzip
// (auto-detect), crc32. Brotli has no Go standard-library codec.

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

func tnCompress(format string, data []byte, level int) []byte {
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
	return tnCompress(format, tnZlibInput(data), tnZlibLevel(options))
}

func TnZlibDecompress(format string, data interface{}, options ...interface{}) []byte {
	return tnDecompress(format, tnZlibInput(data))
}

// zlib.gzip(buf[, options], cb): the codec runs off the loop; cb(err, result) on it
func TnZlibAsync(compress bool, format string, data interface{}, rest ...interface{}) {
	cb := rest[len(rest)-1]
	options := rest[:len(rest)-1]
	input := tnZlibInput(data)
	level := tnZlibLevel(options)
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
				result = tnCompress(format, input, level)
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
	level := tnZlibLevel(options)
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
				result = tnCompress(format, input, level)
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

export function registerZlib(r: NodeRegistry): void {
  defineModule(r, 'zlib');
  defineHelper(r, 'nodeZlib', ['bytes', 'compress/flate', 'compress/gzip', 'compress/zlib', 'hash/crc32', 'io', 'strings'], ['error', 'buffer', 'dynamic', 'eventLoop', 'promise', 'nodeInvoke'], zlibHelper);
  const formats: Record<string, string> = {
    gzipSync: 'gzip',
    deflateSync: 'deflate',
    deflateRawSync: 'deflateRaw'
  };
  for (const name of Object.keys(formats)) {
    const format = formats[name];
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      r.helper('nodeZlib');
      return `TnZlibCompress(${JSON.stringify(format)}, ${call.args.join(', ')})`;
    };
    r.results[`zlib.${name}`] = '[]byte';
  }
  const decoders: Record<string, string> = {
    gunzipSync: 'gunzip',
    inflateSync: 'inflate',
    inflateRawSync: 'inflateRaw',
    unzipSync: 'unzip'
  };
  for (const name of Object.keys(decoders)) {
    const format = decoders[name];
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      r.helper('nodeZlib');
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
    unzip: 'unzip'
  };
  for (const name of Object.keys(asyncForms)) {
    const format = asyncForms[name];
    const compress = name === 'gzip' || name === 'deflate' || name === 'deflateRaw' ? 'true' : 'false';
    r.functions[`zlib.${name}`] = (call: NodeCall) => {
      r.helper('nodeZlib');
      return `TnZlibAsync(${compress}, ${JSON.stringify(format)}, ${call.args.join(', ')})`;
    };
    r.results[`zlib.${name}`] = '';
    r.paramTypers[`zlib.${name}`] = (_n: any[]) => ['*TnError', '[]byte'];
    r.functions[`zlib.${name}.__promisify__`] = (call: NodeCall) => {
      r.helper('nodeZlib');
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
}
