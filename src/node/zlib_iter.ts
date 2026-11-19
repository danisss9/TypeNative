// node:zlib/iter — iterable compression / decompression transforms for gzip,
// deflate, brotli, and zstd (both sync and async variants).

export const zlibIterHelper = `// node:zlib/iter
type TnZlibIterTransform struct {
	format   string
	compress bool
	async    bool
	options  []interface{}
}

func TnNewZlibIterTransform(format string, compress bool, async bool, options ...interface{}) *TnZlibIterTransform {
	return &TnZlibIterTransform{
		format:   format,
		compress: compress,
		async:    async,
		options:  options,
	}
}

func tnZlibIterMaxOutput(options []interface{}) int {
	if len(options) > 0 && options[0] != nil {
		if v, ok := TnGetValue(options[0], "maxOutputLength").(float64); ok && v >= 0 {
			return int(v)
		}
	}
	return -1
}

func tnZlibIterLevel(options []interface{}) int {
	if len(options) > 0 && options[0] != nil {
		if level, ok := TnGetValue(options[0], "level").(float64); ok {
			return int(level)
		}
	}
	return 4
}

func tnZlibIterSignal(opts []interface{}) interface{} {
	if len(opts) > 0 && opts[0] != nil {
		return TnGetValue(opts[0], "signal")
	}
	return nil
}

func tnZlibIterCheckAbort(signal interface{}) {
	if signal != nil && TnTruthy(TnGetValue(signal, "aborted")) {
		reason := TnGetValue(signal, "reason")
		if reason == nil {
			reason = TnNodeError("AbortError", "ABORT_ERR", "The operation was aborted")
		}
		panic(reason)
	}
}

func tnZlibIterNormalizeBatch(v interface{}) [][]byte {
	if v == nil {
		return nil
	}
	switch x := v.(type) {
	case [][]byte:
		return x
	case []byte:
		return [][]byte{x}
	case string:
		return [][]byte{[]byte(x)}
	case []string:
		out := make([][]byte, len(x))
		for i, s := range x {
			out[i] = []byte(s)
		}
		return out
	case []interface{}:
		out := make([][]byte, 0, len(x))
		for _, el := range x {
			if el == nil {
				continue
			}
			out = append(out, tnZlibInput(el))
		}
		return out
	}
	return [][]byte{tnZlibInput(v)}
}

func tnZlibIterSourceSeq(source interface{}, async bool) iter.Seq[[][]byte] {
	if source == nil {
		return func(yield func([][]byte) bool) {}
	}
	switch s := source.(type) {
	case iter.Seq[[][]byte]:
		return s
	case interface{ tnIterator() iter.Seq[[][]byte] }:
		return s.tnIterator()
	case [][][]byte:
		return func(yield func([][]byte) bool) {
			for _, b := range s {
				if !yield(b) {
					return
				}
			}
		}
	case []interface{}:
		return func(yield func([][]byte) bool) {
			for _, el := range s {
				if el == nil {
					if !yield(nil) {
						return
					}
					continue
				}
				if !yield(tnZlibIterNormalizeBatch(el)) {
					return
				}
			}
		}
	case chan [][]byte:
		if async {
			return func(yield func([][]byte) bool) {
				for {
					TnGenWake(s)
					v, ok := tnRawReceive(s)
					if !ok {
						if reason, rejected := tnRejections.Load(s); rejected {
							panic(reason)
						}
						return
					}
					if !yield(v) {
						return
					}
				}
			}
		}
		return func(yield func([][]byte) bool) {
			g := TnGenLockstep(s)
			first := true
			for {
				if !first {
					TnGenAck(g)
				}
				first = false
				v, ok := <-g
				if !ok {
					TnGenDone(g)
					return
				}
				if !yield(v) {
					TnGenDone(g)
					return
				}
			}
		}
	case chan interface{}:
		if async {
			return func(yield func([][]byte) bool) {
				for {
					TnGenWake(s)
					v, ok := tnRawReceive(s)
					if !ok {
						if reason, rejected := tnRejections.Load(s); rejected {
							panic(reason)
						}
						return
					}
					var batch [][]byte
					if v != nil {
						batch = tnZlibIterNormalizeBatch(v)
					}
					if !yield(batch) {
						return
					}
				}
			}
		}
		return func(yield func([][]byte) bool) {
			g := TnGenLockstep(s)
			first := true
			for {
				if !first {
					TnGenAck(g)
				}
				first = false
				v, ok := <-g
				if !ok {
					TnGenDone(g)
					return
				}
				var batch [][]byte
				if v != nil {
					batch = tnZlibIterNormalizeBatch(v)
				}
				if !yield(batch) {
					TnGenDone(g)
					return
				}
			}
		}
	case interface{ tnIterator() chan interface{} }:
		ch := s.tnIterator()
		return func(yield func([][]byte) bool) {
			for {
				var v interface{}
				var ok bool
				if async {
					v, ok = tnRawReceive(ch)
				} else {
					v, ok = <-ch
				}
				if !ok {
					return
				}
				var batch [][]byte
				if v != nil {
					batch = tnZlibIterNormalizeBatch(v)
				}
				if !yield(batch) {
					return
				}
			}
		}
	}
	rv := reflect.ValueOf(source)
	if rv.Kind() == reflect.Chan {
		return func(yield func([][]byte) bool) {
			for {
				TnGenWake(source)
				v, ok := rv.Recv()
				if !ok {
					return
				}
				val := v.Interface()
				var batch [][]byte
				if val != nil {
					batch = tnZlibIterNormalizeBatch(val)
				}
				if !yield(batch) {
					return
				}
			}
		}
	}
	if rv.Kind() == reflect.Slice {
		return func(yield func([][]byte) bool) {
			for i := 0; i < rv.Len(); i++ {
				val := rv.Index(i).Interface()
				var batch [][]byte
				if val != nil {
					batch = tnZlibIterNormalizeBatch(val)
				}
				if !yield(batch) {
					return
				}
			}
		}
	}
	panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "source is not iterable"))
}

func tnZlibIterCompress(format string, options []interface{}, seq iter.Seq[[][]byte], signal interface{}) iter.Seq[[][]byte] {
	return func(yield func([][]byte) bool) {
		tnZlibIterCheckAbort(signal)
		maxOut := tnZlibIterMaxOutput(options)
		var outBuf bytes.Buffer
		var w io.WriteCloser
		var err error
		switch format {
		case "gzip":
			w, err = gzip.NewWriterLevel(&outBuf, tnZlibIterLevel(options))
			if err != nil {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.level\\" is out of range"))
			}
		case "deflate":
			w, err = zlib.NewWriterLevel(&outBuf, tnZlibIterLevel(options))
			if err != nil {
				panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"options.level\\" is out of range"))
			}
		case "brotli":
			w = tnBrotliIterNewWriter(&outBuf, options)
		case "zstd":
			w, err = tnZstdIterNewWriter(&outBuf, options)
			if err != nil {
				panic(TnNodeError("Error", "ZSTD_error_GENERIC", "zstd compression failed"))
			}
		}
		totalOut := 0
		wroteAny := false
		closed := false
		emit := func() bool {
			if outBuf.Len() == 0 {
				return true
			}
			chunk := make([]byte, outBuf.Len())
			copy(chunk, outBuf.Bytes())
			outBuf.Reset()
			totalOut += len(chunk)
			if maxOut >= 0 && totalOut > maxOut {
				panic(TnNodeError("RangeError", "ERR_BUFFER_TOO_LARGE", "Cannot create a Buffer larger than maxOutputLength bytes"))
			}
			return yield([][]byte{chunk})
		}
		defer func() {
			if !closed && w != nil {
				w.Close()
			}
		}()
		for batch := range seq {
			tnZlibIterCheckAbort(signal)
			if batch == nil {
				if !closed {
					closed = true
					if format == "zstd" && !wroteAny {
						w.Close()
						outBuf.Reset()
						outBuf.Write([]byte{0x28, 0xb5, 0x2f, 0xfd, 0x20, 0x00, 0x01, 0x00, 0x00})
					} else {
						w.Close()
					}
					if !emit() {
						return
					}
				}
				continue
			}
			for _, c := range batch {
				if len(c) > 0 {
					wroteAny = true
					w.Write(c)
				}
			}
			if !emit() {
				return
			}
		}
	}
}

func tnZlibIterDecompress(format string, options []interface{}, seq iter.Seq[[][]byte], signal interface{}) iter.Seq[[][]byte] {
	return func(yield func([][]byte) bool) {
		tnZlibIterCheckAbort(signal)
		maxOut := tnZlibIterMaxOutput(options)
		totalOut := 0
		emitChunk := func(chunk []byte) bool {
			totalOut += len(chunk)
			if maxOut >= 0 && totalOut > maxOut {
				panic(TnNodeError("RangeError", "ERR_BUFFER_TOO_LARGE", "Cannot create a Buffer larger than maxOutputLength bytes"))
			}
			return yield([][]byte{chunk})
		}

		var pr *io.PipeReader
		var pw *io.PipeWriter
		var chunkCh chan []byte
		var writeDoneCh chan error
		var outCh chan []byte
		var cancelCh chan struct{}
		var readerDone chan struct{}
		var writerDone chan struct{}
		var decErr *TnError
		started := false
		inputClosed := false
		readerClosed := false

		startPipe := func() {
			started = true
			pr, pw = io.Pipe()
			chunkCh = make(chan []byte)
			writeDoneCh = make(chan error, 1)
			outCh = make(chan []byte, 4)
			cancelCh = make(chan struct{})
			readerDone = make(chan struct{})
			writerDone = make(chan struct{})

			go func() {
				defer close(writerDone)
				for c := range chunkCh {
					_, err := pw.Write(c)
					select {
					case writeDoneCh <- err:
					case <-cancelCh:
						return
					}
					if err != nil {
						return
					}
				}
				pw.Close()
			}()

			go func() {
				defer close(readerDone)
				defer close(outCh)
				defer pr.Close()

				var r io.Reader
				var closer io.Closer
				var mapErr func(error) *TnError

				switch format {
				case "gzip":
					zr, err := gzip.NewReader(pr)
					if err != nil {
						if err == io.EOF || err == io.ErrUnexpectedEOF {
							e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
							e.props["errno"] = float64(-5)
							decErr = e
						} else {
							decErr = tnZlibError(err)
						}
						return
					}
					r = zr
					closer = zr
					mapErr = func(err error) *TnError {
						if err == nil || err == io.EOF {
							return nil
						}
						return tnZlibError(err)
					}
				case "deflate":
					zr, err := zlib.NewReader(pr)
					if err != nil {
						if err == io.EOF || err == io.ErrUnexpectedEOF {
							e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
							e.props["errno"] = float64(-5)
							decErr = e
						} else {
							decErr = tnZlibError(err)
						}
						return
					}
					r = zr
					closer = zr
					mapErr = func(err error) *TnError {
						if err == nil || err == io.EOF {
							return nil
						}
						return tnZlibError(err)
					}
				case "brotli":
					r, mapErr = tnBrotliIterNewReader(pr)
				case "zstd":
					zr, mErr := tnZstdIterNewReader(pr)
					r = zr
					closer = zr
					mapErr = mErr
				}
				if closer != nil {
					defer closer.Close()
				}
				buf := make([]byte, 16384)
				for {
					n, err := r.Read(buf)
					if n > 0 {
						chunk := make([]byte, n)
						copy(chunk, buf[:n])
						select {
						case outCh <- chunk:
						case <-cancelCh:
							return
						}
					}
					if err != nil {
						if mapped := mapErr(err); mapped != nil {
							decErr = mapped
						}
						return
					}
				}
			}()
		}

		defer func() {
			if !started {
				return
			}
			close(cancelCh)
			if !inputClosed {
				inputClosed = true
				close(chunkCh)
			}
			pr.Close()
			pw.Close()
			<-readerDone
			<-writerDone
		}()

		for batch := range seq {
			tnZlibIterCheckAbort(signal)
			if batch == nil {
				if !started {
					e := TnNodeError("Error", "Z_BUF_ERROR", "unexpected end of file")
					e.props["errno"] = float64(-5)
					panic(e)
				}
				if !inputClosed {
					inputClosed = true
					close(chunkCh)
				}
				if !readerClosed {
					for out := range outCh {
						if !emitChunk(out) {
							return
						}
					}
					readerClosed = true
				}
				<-readerDone
				if decErr != nil {
					panic(decErr)
				}
				continue
			}
			for _, c := range batch {
				if len(c) == 0 || readerClosed {
					continue
				}
				if !started {
					startPipe()
				}
				sent := false
				for !sent && !readerClosed {
					select {
					case chunkCh <- c:
						sent = true
					case out, ok := <-outCh:
						if !ok {
							readerClosed = true
							break
						}
						if !emitChunk(out) {
							return
						}
					}
				}
				for sent && !readerClosed {
					select {
					case err := <-writeDoneCh:
						if err != nil {
							for out := range outCh {
								if !emitChunk(out) {
									return
								}
							}
							readerClosed = true
						}
						sent = false
					case out, ok := <-outCh:
						if !ok {
							readerClosed = true
							break
						}
						if !emitChunk(out) {
							return
						}
					}
				}
				if readerClosed {
					<-readerDone
					if decErr != nil {
						panic(decErr)
					}
				}
			}
		}
	}
}

func (t *TnZlibIterTransform) tnTransformSeq(seq iter.Seq[[][]byte], signal interface{}) iter.Seq[[][]byte] {
	if t.compress {
		return tnZlibIterCompress(t.format, t.options, seq, signal)
	}
	return tnZlibIterDecompress(t.format, t.options, seq, signal)
}

func (t *TnZlibIterTransform) transform(source interface{}, opts ...interface{}) iter.Seq[[][]byte] {
	var signal interface{}
	if t.async {
		signal = tnZlibIterSignal(opts)
	}
	return t.tnTransformSeq(tnZlibIterSourceSeq(source, t.async), signal)
}

func (t *TnZlibIterTransform) Get_transform() interface{} {
	return t.transform
}`;
