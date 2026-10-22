// node:stream (+ stream/promises, stream/consumers): Readable / Writable /
// Duplex / Transform / PassThrough on the event loop. Constructor options
// (read / write / transform / flush / final) and subclass overrides
// (_read / _write / _transform / _flush / _final) both work; pipe, pipeline,
// finished, Readable.from, async iteration. Also used by fs streams,
// process.stdin / stdout / stderr, zlib streams, child processes and readline.
import { defineClass, defineHelper, defineModule, setResults, getOption, isObjectLiteral } from './registry.js';
const streamHelper = `// node:stream
type tnWriteReq struct {
	chunk    interface{}
	encoding string
	cb       interface{}
}

type TnStream struct {
	TnEventEmitter
	readableSide bool
	writableSide bool
	isTransform  bool
	objectMode   bool
	decodeStrings bool
	encoding     string
	decoder      *TnStringDecoder
	options      interface{}
	hooks        map[string]interface{}
	tnSelf       interface{}
	// readable
	queue         []interface{}
	readEnded     bool
	endEmitted    bool
	flowing       int
	reading       bool
	flowScheduled bool
	source        func(s *TnStream)
	sourceStarted bool
	// writable
	writeQueue   []tnWriteReq
	writing      bool
	ending       bool
	writeEnded   bool
	finishing    bool
	finished     bool
	sink         func(chunk interface{}, done func(err interface{}))
	sinkFinal    func(done func(err interface{}))
	goTransform  func(chunk []byte)
	goFlush      func() []byte
	// state
	destroyed  bool
	closed     bool
	errored    interface{}
	bytesRead    float64
	bytesWritten float64
	path         string
	fd           float64
	// Releases an underlying handle (sockets) once the stream closes or is destroyed
	onClose func()
	// Defers 'close' past the end of both sides (client requests wait for their response)
	closeHeld bool
	// The async context the stream was created in (its events run in it)
	asyncCtx TnAsyncContext
}

// Queues fn on the loop, in the stream's async context
func (s *TnStream) post(fn func()) {
	ctx := s.asyncCtx
	if ctx == nil {
		TnLoopPost(fn)
		return
	}
	TnLoopPost(func() { TnAsyncRun(ctx, fn) })
}

type tnStreamLike interface {
	tnStream() *TnStream
}

func (s *TnStream) tnStream() *TnStream { return s }

func tnStreamOption(options interface{}, key string) interface{} {
	if options == nil {
		return nil
	}
	return TnGet(options, key)
}

func tnNewStreamBase(options []interface{}) *TnStream {
	s := &TnStream{flowing: -1, decodeStrings: true, hooks: map[string]interface{}{}, asyncCtx: TnAsyncSnapshot()}
	if len(options) > 0 && options[0] != nil {
		s.options = options[0]
		if b, ok := tnStreamOption(s.options, "objectMode").(bool); ok {
			s.objectMode = b
		}
		if b, ok := tnStreamOption(s.options, "decodeStrings").(bool); ok {
			s.decodeStrings = b
		}
		if enc, ok := tnStreamOption(s.options, "encoding").(string); ok && enc != "" {
			s.setEncoding(enc)
		}
		for _, name := range []string{"read", "write", "transform", "flush", "final", "destroy"} {
			if fn := tnStreamOption(s.options, name); fn != nil && reflect.ValueOf(fn).Kind() == reflect.Func && !reflect.ValueOf(fn).IsNil() {
				s.hooks["_"+name] = fn
			}
		}
	}
	return s
}

func TnNewReadable(options ...interface{}) *TnStream {
	s := tnNewStreamBase(options)
	s.readableSide = true
	return s
}

func TnNewWritable(options ...interface{}) *TnStream {
	s := tnNewStreamBase(options)
	s.writableSide = true
	return s
}

func TnNewDuplex(options ...interface{}) *TnStream {
	s := tnNewStreamBase(options)
	s.readableSide, s.writableSide = true, true
	return s
}

func TnNewTransform(options ...interface{}) *TnStream {
	s := TnNewDuplex(options...)
	s.isTransform = true
	return s
}

func TnNewPassThrough(options ...interface{}) *TnStream {
	return TnNewTransform(options...)
}

// Subclass overrides (_transform …) registered by the subclass constructor
func (s *TnStream) setHook(name string, fn interface{}) {
	if s.hooks == nil {
		s.hooks = map[string]interface{}{}
	}
	s.hooks[name] = fn
}

func (s *TnStream) hook(name string) interface{} {
	if s.hooks == nil {
		return nil
	}
	return s.hooks[name]
}

// --- readable side ---

func (s *TnStream) toChunk(chunk interface{}, enc string) interface{} {
	if s.objectMode {
		return chunk
	}
	switch c := chunk.(type) {
	case string:
		if s.encoding != "" {
			return c
		}
		return TnBufferFromString(c, enc)
	case []byte:
		if s.decoder != nil {
			return s.decoder.write(c)
		}
		return c
	}
	return chunk
}

func (s *TnStream) push(chunk interface{}, encoding ...string) bool {
	if chunk == nil {
		s.readEnded = true
		if s.decoder != nil {
			if rest := s.decoder.end(); rest != "" {
				s.queue = append(s.queue, rest)
			}
		}
		s.scheduleFlow()
		return false
	}
	if s.readEnded {
		s.errorLater(TnNodeError("Error", "ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF"))
		return false
	}
	enc := ""
	if len(encoding) > 0 {
		enc = encoding[0]
	}
	c := s.toChunk(chunk, enc)
	if b, ok := c.([]byte); ok {
		s.bytesRead += float64(len(b))
	}
	s.queue = append(s.queue, c)
	s.scheduleFlow()
	return len(s.queue) < 16
}

func (s *TnStream) unshift(chunk interface{}, encoding ...string) {
	s.queue = append([]interface{}{s.toChunk(chunk, "")}, s.queue...)
}

func (s *TnStream) scheduleFlow() {
	if s.flowScheduled || s.destroyed {
		return
	}
	s.flowScheduled = true
	s.post(func() {
		s.flowScheduled = false
		s.flow()
	})
}

func (s *TnStream) flow() {
	if s.destroyed {
		return
	}
	for s.flowing == 1 && len(s.queue) > 0 {
		chunk := s.queue[0]
		s.queue = s.queue[1:]
		s.emit("data", chunk)
	}
	if len(s.queue) == 0 && s.readEnded {
		s.emitEnd()
		return
	}
	if s.flowing == 1 {
		s.requestRead()
	}
}

func (s *TnStream) requestRead() {
	if s.reading || s.readEnded || s.destroyed {
		return
	}
	if s.source != nil && !s.sourceStarted {
		s.sourceStarted = true
		s.source(s)
	}
	if fn := s.hook("_read"); fn != nil {
		s.reading = true
		TnInvoke(fn, float64(16384))
		s.reading = false
	}
}

func (s *TnStream) emitEnd() {
	if s.endEmitted {
		return
	}
	s.endEmitted = true
	s.emit("end")
	if !s.writableSide || s.finished {
		s.emitClose()
	}
}

func (s *TnStream) releaseHandle() {
	if s.onClose != nil {
		release := s.onClose
		s.onClose = nil
		release()
	}
}

func (s *TnStream) emitClose() {
	if s.closed || s.closeHeld {
		return
	}
	s.closed = true
	s.releaseHandle()
	s.post(func() { s.emit("close") })
}

func (s *TnStream) errorLater(err interface{}) {
	s.post(func() { s.destroy(err) })
}

// on('data') starts the flow (as in Node)
func (s *TnStream) on(event string, fn interface{}) *TnEventEmitter {
	s.TnEventEmitter.on(event, fn)
	s.listening(event)
	return &s.TnEventEmitter
}

func (s *TnStream) addListener(event string, fn interface{}) *TnEventEmitter { return s.on(event, fn) }

func (s *TnStream) once(event string, fn interface{}) *TnEventEmitter {
	s.TnEventEmitter.once(event, fn)
	s.listening(event)
	return &s.TnEventEmitter
}

func (s *TnStream) listening(event string) {
	if event == "data" && s.flowing != 0 && s.readableSide {
		s.resume()
	}
	if event == "end" && s.readableSide && s.flowing == -1 && s.endEmitted {
		return
	}
}

func (s *TnStream) resume() *TnStream {
	s.flowing = 1
	s.scheduleFlow()
	return s
}

func (s *TnStream) pause() *TnStream {
	s.flowing = 0
	return s
}

func (s *TnStream) isPaused() bool { return s.flowing == 0 }

// read(): paused-mode pull of the next buffered chunk (null when none)
func (s *TnStream) read(size ...float64) interface{} {
	if len(s.queue) == 0 {
		s.requestRead()
		if s.readEnded {
			s.scheduleFlow()
		}
		return nil
	}
	chunk := s.queue[0]
	s.queue = s.queue[1:]
	return chunk
}

func (s *TnStream) setEncoding(enc string) *TnStream {
	s.encoding = tnEncoding(enc)
	s.decoder = TnNewStringDecoder(enc)
	return s
}

func (s *TnStream) destroy(err ...interface{}) *TnStream {
	if s.destroyed {
		return s
	}
	s.destroyed = true
	s.closeHeld = false
	var e interface{}
	if len(err) > 0 {
		e = err[0]
	}
	finish := func() {
		s.releaseHandle()
		if e != nil {
			s.errored = e
			s.post(func() {
				s.emit("error", e)
				s.closed = true
				s.emit("close")
			})
			return
		}
		s.emitClose()
	}
	if fn := s.hook("_destroy"); fn != nil {
		TnInvoke(fn, e, func(args ...interface{}) {
			if len(args) > 0 && args[0] != nil {
				e = args[0]
			}
			finish()
		})
		return s
	}
	finish()
	return s
}

// --- writable side ---

func (s *TnStream) write(chunk interface{}, args ...interface{}) bool {
	enc := ""
	var cb interface{}
	for _, a := range args {
		switch x := a.(type) {
		case string:
			enc = x
		case nil:
		default:
			if reflect.ValueOf(a).Kind() == reflect.Func {
				cb = x
			}
		}
	}
	if s.writeEnded || s.destroyed {
		err := TnNodeError("Error", "ERR_STREAM_WRITE_AFTER_END", "write after end")
		if cb != nil {
			s.post(func() { TnInvoke(cb, err) })
		}
		s.errorLater(err)
		return false
	}
	if !s.objectMode {
		if str, ok := chunk.(string); ok && s.decodeStrings {
			chunk = TnBufferFromString(str, enc)
		}
	}
	if enc == "" {
		enc = "buffer"
		if _, ok := chunk.(string); ok {
			enc = "utf8"
		}
	}
	s.writeQueue = append(s.writeQueue, tnWriteReq{chunk: chunk, encoding: enc, cb: cb})
	s.processWrites()
	return len(s.writeQueue) < 16
}

func (s *TnStream) processWrites() {
	if s.writing || s.destroyed {
		return
	}
	if len(s.writeQueue) == 0 {
		if s.ending {
			s.finish()
		}
		return
	}
	req := s.writeQueue[0]
	s.writeQueue = s.writeQueue[1:]
	s.writing = true
	called := false
	done := func(args ...interface{}) {
		if called {
			return
		}
		called = true
		var err interface{}
		if len(args) > 0 {
			err = args[0]
		}
		s.writing = false
		if b, ok := req.chunk.([]byte); ok {
			s.bytesWritten += float64(len(b))
		}
		if req.cb != nil {
			TnInvoke(req.cb, err)
		}
		if err != nil && !TnIsNil(err) {
			s.destroy(err)
			return
		}
		if len(s.writeQueue) == 0 && !s.ending {
			s.post(func() { s.emit("drain") })
		}
		s.post(s.processWrites)
	}
	switch {
	case s.sink != nil:
		s.sink(req.chunk, func(err interface{}) { done(err) })
	case s.isTransform:
		s.runTransform(req.chunk, req.encoding, done)
	default:
		fn := s.hook("_write")
		if fn == nil {
			done(TnNodeError("Error", "ERR_METHOD_NOT_IMPLEMENTED", "The _write() method is not implemented"))
			return
		}
		TnInvoke(fn, req.chunk, req.encoding, done)
	}
}

func (s *TnStream) runTransform(chunk interface{}, encoding string, done func(args ...interface{})) {
	if s.goTransform != nil {
		if b, ok := chunk.([]byte); ok {
			s.goTransform(b)
		}
		done()
		return
	}
	fn := s.hook("_transform")
	if fn == nil {
		s.push(chunk)
		done()
		return
	}
	TnInvoke(fn, chunk, encoding, func(args ...interface{}) {
		if len(args) > 1 && args[1] != nil {
			s.push(args[1])
		}
		if len(args) > 0 {
			done(args[0])
		} else {
			done()
		}
	})
}

func (s *TnStream) end(args ...interface{}) *TnStream {
	var cb interface{}
	rest := []interface{}{}
	for _, a := range args {
		if a != nil && reflect.ValueOf(a).Kind() == reflect.Func {
			cb = a
		} else {
			rest = append(rest, a)
		}
	}
	if len(rest) > 0 && rest[0] != nil && !s.writeEnded {
		s.write(rest[0], rest[1:]...)
	}
	if cb != nil {
		s.TnEventEmitter.once("finish", cb)
	}
	if s.writeEnded {
		return s
	}
	s.writeEnded = true
	s.ending = true
	s.processWrites()
	return s
}

func (s *TnStream) finish() {
	if s.finishing || s.finished {
		return
	}
	s.finishing = true
	complete := func(args ...interface{}) {
		if len(args) > 0 && args[0] != nil && !TnIsNil(args[0]) {
			s.destroy(args[0])
			return
		}
		s.post(func() {
			s.finished = true
			s.emit("finish")
			if !s.readableSide || s.endEmitted {
				s.emitClose()
			}
		})
	}
	if s.isTransform {
		flushed := func(args ...interface{}) {
			if len(args) > 1 && args[1] != nil {
				s.push(args[1])
			}
			s.push(nil)
			if len(args) > 0 {
				complete(args[0])
			} else {
				complete()
			}
		}
		if s.goFlush != nil {
			if out := s.goFlush(); len(out) > 0 {
				s.push(out)
			}
			flushed()
			return
		}
		if fn := s.hook("_flush"); fn != nil {
			TnInvoke(fn, flushed)
			return
		}
		flushed()
		return
	}
	if fn := s.hook("_final"); fn != nil {
		TnInvoke(fn, complete)
		return
	}
	if s.sinkFinal != nil {
		s.sinkFinal(func(err interface{}) { complete(err) })
		return
	}
	complete()
}

func (s *TnStream) cork()                              {}
func (s *TnStream) uncork()                            {}
func (s *TnStream) setDefaultEncoding(enc string) *TnStream { return s }

func (s *TnStream) Get_readable() bool {
	return s.readableSide && !s.destroyed && !s.endEmitted
}
func (s *TnStream) Get_writable() bool {
	return s.writableSide && !s.destroyed && !s.writeEnded
}
func (s *TnStream) Get_readableEnded() bool     { return s.endEmitted }
func (s *TnStream) Get_writableEnded() bool     { return s.writeEnded }
func (s *TnStream) Get_writableFinished() bool  { return s.finished }
func (s *TnStream) Get_destroyed() bool         { return s.destroyed }
func (s *TnStream) Get_closed() bool            { return s.closed }
func (s *TnStream) Get_errored() interface{}    { return s.errored }
func (s *TnStream) Get_readableLength() float64 { return float64(len(s.queue)) }
func (s *TnStream) Get_writableLength() float64 { return float64(len(s.writeQueue)) }
func (s *TnStream) Get_readableObjectMode() bool { return s.objectMode }
func (s *TnStream) Get_writableObjectMode() bool { return s.objectMode }
func (s *TnStream) Get_readableFlowing() interface{} {
	if s.flowing == -1 {
		return nil
	}
	return s.flowing == 1
}
func (s *TnStream) Get_bytesRead() float64    { return s.bytesRead }
func (s *TnStream) Get_bytesWritten() float64 { return s.bytesWritten }
func (s *TnStream) Get_path() string          { return s.path }

// src.pipe(dest, { end }): returns dest
func TnPipe[D tnStreamLike](source tnStreamLike, dest D, options ...interface{}) D {
	src := source.tnStream()
	dst := dest.tnStream()
	end := true
	if len(options) > 0 && options[0] != nil {
		if e, ok := TnGet(options[0], "end").(bool); ok {
			end = e
		}
	}
	dst.emit("pipe", src)
	src.on("data", func(chunk interface{}) {
		if !dst.write(chunk) {
			src.pause()
			dst.TnEventEmitter.once("drain", func() { src.resume() })
		}
	})
	if end {
		src.TnEventEmitter.once("end", func() { dst.end() })
	}
	return dest
}

// Readable.from(iterable): arrays, strings, Buffers, async generators (channels)
func TnReadableFrom(iterable interface{}, options ...interface{}) *TnStream {
	s := TnNewReadable(options...)
	s.objectMode = true
	if len(options) > 0 && options[0] != nil {
		if b, ok := TnGet(options[0], "objectMode").(bool); ok {
			s.objectMode = b
		}
	}
	switch x := iterable.(type) {
	case string, []byte:
		s.queue = append(s.queue, x)
		s.readEnded = true
		return s
	}
	rv := reflect.ValueOf(iterable)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	switch rv.Kind() {
	case reflect.Slice, reflect.Array:
		for i := 0; i < rv.Len(); i++ {
			s.queue = append(s.queue, rv.Index(i).Interface())
		}
		s.readEnded = true
	case reflect.Chan:
		s.source = func(st *TnStream) {
			TnLoopRef()
			go func() {
				for {
					v, ok := rv.Recv()
					if !ok {
						break
					}
					value := v.Interface()
					TnLoopPost(func() { st.push(value) })
				}
				TnLoopPost(func() {
					defer TnLoopUnref()
					st.push(nil)
				})
			}()
		}
	}
	return s
}

// for await (const chunk of readable)
func (s *TnStream) tnIterator() chan interface{} {
	ch := make(chan interface{}, 65536)
	s.on("data", func(chunk interface{}) { ch <- chunk })
	s.TnEventEmitter.once("end", func() { close(ch) })
	s.TnEventEmitter.once("error", func(err interface{}) { TnReject(ch, err) })
	return ch
}

// pipeline(...streams, callback?): errors destroy every stream
func TnPipeline(callback interface{}, streams ...tnStreamLike) *TnStream {
	all := make([]*TnStream, len(streams))
	for i, st := range streams {
		all[i] = st.tnStream()
	}
	done := false
	finish := func(err interface{}) {
		if done {
			return
		}
		done = true
		if err != nil {
			for _, st := range all {
				st.destroy()
			}
		}
		if callback != nil {
			TnInvoke(callback, err)
		}
	}
	for i := 0; i+1 < len(all); i++ {
		TnPipe[tnStreamLike](all[i], all[i+1])
	}
	for _, st := range all {
		st.TnEventEmitter.once("error", func(err interface{}) { finish(err) })
	}
	last := all[len(all)-1]
	if last.writableSide {
		last.TnEventEmitter.once("finish", func() { finish(nil) })
	} else {
		last.TnEventEmitter.once("end", func() { finish(nil) })
	}
	return last
}

func TnPipelinePromise(streams ...tnStreamLike) chan struct{} {
	ch := make(chan struct{}, 1)
	TnLoopRef()
	TnPipeline(func(err interface{}) {
		defer TnLoopUnref()
		if err != nil {
			TnReject(ch, err)
			return
		}
		ch <- struct{}{}
	}, streams...)
	return ch
}

// finished(stream, callback): end / finish, or the error
func TnFinished(stream tnStreamLike, callback interface{}) {
	s := stream.tnStream()
	called := false
	call := func(err interface{}) {
		if !called {
			called = true
			TnInvoke(callback, err)
		}
	}
	s.TnEventEmitter.once("error", func(err interface{}) { call(err) })
	if s.readableSide {
		s.TnEventEmitter.once("end", func() { call(nil) })
	} else {
		s.TnEventEmitter.once("finish", func() { call(nil) })
	}
	s.TnEventEmitter.once("close", func() { call(nil) })
}

func TnFinishedPromise(stream tnStreamLike) chan struct{} {
	ch := make(chan struct{}, 1)
	TnLoopRef()
	TnFinished(stream, func(err interface{}) {
		defer TnLoopUnref()
		if err != nil {
			TnReject(ch, err)
			return
		}
		ch <- struct{}{}
	})
	return ch
}

// stream/consumers: collect the whole stream
func tnConsume[T any](stream tnStreamLike, convert func(chunks []interface{}) T) chan T {
	s := stream.tnStream()
	ch := make(chan T, 1)
	chunks := []interface{}{}
	TnLoopRef()
	s.on("data", func(chunk interface{}) { chunks = append(chunks, chunk) })
	s.TnEventEmitter.once("end", func() {
		defer TnLoopUnref()
		ch <- convert(chunks)
	})
	s.TnEventEmitter.once("error", func(err interface{}) {
		defer TnLoopUnref()
		TnReject(ch, err)
	})
	return ch
}

func tnChunksBytes(chunks []interface{}) []byte {
	out := []byte{}
	for _, c := range chunks {
		switch x := c.(type) {
		case []byte:
			out = append(out, x...)
		case string:
			out = append(out, x...)
		default:
			out = append(out, TnJSString(x)...)
		}
	}
	return out
}

func TnConsumeText(stream tnStreamLike) chan string {
	return tnConsume(stream, func(chunks []interface{}) string { return tnDecodeUTF8(tnChunksBytes(chunks)) })
}

func TnConsumeBuffer(stream tnStreamLike) chan []byte {
	return tnConsume(stream, func(chunks []interface{}) []byte { return tnChunksBytes(chunks) })
}

func TnConsumeJSON(stream tnStreamLike) chan interface{} {
	return tnConsume(stream, func(chunks []interface{}) interface{} {
		var v interface{}
		if err := json.Unmarshal(tnChunksBytes(chunks), &v); err != nil {
			panic(TnNodeError("SyntaxError", "", err.Error()))
		}
		return v
	})
}

// process.stdout / stderr: writable streams over the Go files
var tnStdoutStream *TnStream
var tnStderrStream *TnStream
var tnStdinStream *TnStream

func tnFileSink(f *os.File) *TnStream {
	s := TnNewWritable()
	s.sink = func(chunk interface{}, done func(err interface{})) {
		switch c := chunk.(type) {
		case []byte:
			f.Write(c)
		case string:
			f.WriteString(c)
		default:
			f.WriteString(TnJSString(c))
		}
		done(nil)
	}
	return s
}

func TnStdout() *TnStream {
	if tnStdoutStream == nil {
		tnStdoutStream = tnFileSink(os.Stdout)
		tnStdoutStream.fd = 1
	}
	return tnStdoutStream
}

func TnStderr() *TnStream {
	if tnStderrStream == nil {
		tnStderrStream = tnFileSink(os.Stderr)
		tnStderrStream.fd = 2
	}
	return tnStderrStream
}

// process.stdin: reads (on its own goroutine) while flowing; keeps the
// process alive only while flowing
func TnStdin() *TnStream {
	if tnStdinStream != nil {
		return tnStdinStream
	}
	s := TnNewReadable()
	s.fd = 0
	tnStdinStream = s
	refHeld := false
	s.source = func(st *TnStream) {
		go func() {
			buf := make([]byte, 65536)
			for {
				n, err := tnStdin().Read(buf)
				if n > 0 {
					chunk := append([]byte{}, buf[:n]...)
					TnLoopPost(func() { st.push(chunk) })
				}
				if err != nil {
					TnLoopPost(func() {
						st.push(nil)
						if refHeld {
							refHeld = false
							TnLoopUnref()
						}
					})
					return
				}
			}
		}()
	}
	s.hooks["_stdinRef"] = func(flowing bool) {
		if flowing && !refHeld && !s.readEnded {
			refHeld = true
			TnLoopRef()
		} else if !flowing && refHeld {
			refHeld = false
			TnLoopUnref()
		}
	}
	return s
}

func (s *TnStream) stdinRef(flowing bool) {
	if fn, ok := s.hooks["_stdinRef"].(func(bool)); ok {
		fn(flowing)
	}
}`;
const fileStreamHelper = `// fs.createReadStream / createWriteStream
func TnCreateReadStream(path string, options ...interface{}) *TnStream {
	s := TnNewReadable()
	s.path = path
	start, end := int64(0), int64(-1)
	chunkSize := 65536
	if len(options) > 0 && options[0] != nil {
		opts := options[0]
		if enc, ok := opts.(string); ok {
			s.setEncoding(enc)
		} else {
			if enc, ok := TnGet(opts, "encoding").(string); ok && enc != "" {
				s.setEncoding(enc)
			}
			if v, ok := TnGet(opts, "start").(float64); ok {
				start = int64(v)
			}
			if v, ok := TnGet(opts, "end").(float64); ok {
				end = int64(v)
			}
			if v, ok := TnGet(opts, "highWaterMark").(float64); ok && v > 0 {
				chunkSize = int(v)
			}
		}
	}
	s.source = func(st *TnStream) {
		TnLoopRef()
		go func() {
			f, err := os.Open(path)
			if err != nil {
				sysErr := TnSysError(err, "open", path)
				TnLoopPost(func() {
					defer TnLoopUnref()
					st.destroy(sysErr)
				})
				return
			}
			defer f.Close()
			TnLoopPost(func() {
				st.emit("open", float64(3))
				st.emit("ready")
			})
			if start > 0 {
				f.Seek(start, 0)
			}
			remaining := int64(-1)
			if end >= 0 {
				remaining = end - start + 1
			}
			buf := make([]byte, chunkSize)
			for remaining != 0 {
				want := len(buf)
				if remaining > 0 && int64(want) > remaining {
					want = int(remaining)
				}
				n, readErr := f.Read(buf[:want])
				if n > 0 {
					chunk := append([]byte{}, buf[:n]...)
					TnLoopPost(func() { st.push(chunk) })
					if remaining > 0 {
						remaining -= int64(n)
					}
				}
				if readErr != nil {
					break
				}
			}
			TnLoopPost(func() {
				defer TnLoopUnref()
				st.push(nil)
			})
		}()
	}
	return s
}

func TnCreateWriteStream(path string, options ...interface{}) *TnStream {
	s := TnNewWritable()
	s.path = path
	flags := "w"
	if len(options) > 0 && options[0] != nil {
		if f, ok := TnGet(options[0], "flags").(string); ok && f != "" {
			flags = f
		}
		if enc, ok := TnGet(options[0], "encoding").(string); ok && enc != "" {
			s.decodeStrings = true
		}
	}
	f, err := os.OpenFile(path, tnOpenFlags(flags), 0o666)
	if err != nil {
		s.errorLater(TnSysError(err, "open", path))
		return s
	}
	TnLoopRef()
	TnLoopPost(func() {
		s.emit("open", float64(3))
		s.emit("ready")
	})
	s.sink = func(chunk interface{}, done func(err interface{})) {
		var b []byte
		switch c := chunk.(type) {
		case []byte:
			b = c
		case string:
			b = []byte(c)
		default:
			b = []byte(TnJSString(c))
		}
		if _, err := f.Write(b); err != nil {
			done(TnSysError(err, "write", path))
			return
		}
		done(nil)
	}
	s.sinkFinal = func(done func(err interface{})) {
		err := f.Close()
		TnLoopUnref()
		if err != nil {
			done(TnSysError(err, "close", path))
			return
		}
		done(nil)
	}
	return s
}`;
const zlibStreamHelper = `// zlib streams: Transforms buffering the input, (de)compressed at the end
func TnZlibStream(format string, decompress bool, options ...interface{}) *TnStream {
	s := TnNewTransform()
	input := []byte{}
	s.goTransform = func(chunk []byte) { input = append(input, chunk...) }
	s.goFlush = func() []byte {
		if decompress {
			return tnDecompress(format, input)
		}
		return tnCompress(format, input, options)
	}
	return s
}`;
// Go parameter types of option / override methods
// Method and getter specs of TnStream, shared with classes that embed it (net.Socket, http messages)
export const STREAM_METHODS = 'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64; push=bool; unshift=; read=interface{}; resume=*TnStream; pause=*TnStream; isPaused=bool; setEncoding=*TnStream; destroy=*TnStream; write=bool; end=*TnStream; cork=; uncork=; setDefaultEncoding=*TnStream';
export const STREAM_GETTERS = 'readable=bool; writable=bool; readableEnded=bool; writableEnded=bool; writableFinished=bool; destroyed=bool; closed=bool; errored=interface{}; readableLength=float64; writableLength=float64; readableObjectMode=bool; writableObjectMode=bool; readableFlowing=interface{}; bytesRead=float64; bytesWritten=float64; path=string';
const STREAM_HOOK_PARAMS = {
    read: ['float64'],
    write: ['interface{}', 'string', 'TnCallback'],
    transform: ['interface{}', 'string', 'TnCallback'],
    flush: ['TnCallback'],
    final: ['TnCallback'],
    destroy: ['interface{}', 'TnCallback']
};
export function registerStream(r) {
    for (const mod of ['stream', 'stream/promises', 'stream/consumers'])
        defineModule(r, mod);
    r.namespaces['stream.promises'] = 'stream/promises';
    r.namespaces['stream.default'] = 'stream.Stream';
    defineHelper(r, 'nodeStream', ['encoding/json', 'os', 'reflect'], ['nodeEvents', 'buffer', 'stringDecoder', 'eventLoop', 'promise', 'dynamic', 'nodeInvoke', 'stdinReader'], streamHelper);
    defineHelper(r, 'stdinReader', ['bufio', 'os'], [], `// One buffered reader shared by process.stdin, readline and question()
var tnStdinBuffered *bufio.Reader

func tnStdin() *bufio.Reader {
	if tnStdinBuffered == nil {
		tnStdinBuffered = bufio.NewReader(os.Stdin)
	}
	return tnStdinBuffered
}`);
    const methods = STREAM_METHODS;
    const getters = STREAM_GETTERS;
    const cls = defineClass(r, 'stream.Duplex', '*TnStream', 'class', methods, 'tnSelf=interface{}', getters, '');
    for (const name of ['Readable', 'Writable', 'Transform', 'PassThrough', 'Stream'])
        r.classes[`stream.${name}`] = cls;
    for (const name of ['ReadStream', 'WriteStream'])
        r.classes[`fs.${name}`] = cls;
    r.classes['stream.default'] = cls;
    r.iterators['*TnStream'] = 'tnIterator';
    cls.methods['tnIterator'] = 'chan interface{}';
    const use = () => r.helper('nodeStream');
    const ctors = {
        Readable: 'TnNewReadable',
        Writable: 'TnNewWritable',
        Duplex: 'TnNewDuplex',
        Transform: 'TnNewTransform',
        PassThrough: 'TnNewPassThrough',
        Stream: 'TnNewDuplex'
    };
    for (const name of Object.keys(ctors)) {
        const goCtor = ctors[name];
        r.constructors[`stream.${name}`] = (call) => {
            use();
            return `${goCtor}(${call.args.slice(0, 1).join(', ')})`;
        };
        // Option methods (read / write / transform …) get Node's parameter types
        r.optionTypers[`stream.${name}`] = (node) => {
            const objectMode = isObjectLiteral(node) && getOption(node, 'objectMode')?.kind === 'TrueKeyword';
            const out = {};
            for (const hook of Object.keys(STREAM_HOOK_PARAMS)) {
                const params = [...STREAM_HOOK_PARAMS[hook]];
                if (!objectMode && (hook === 'write' || hook === 'transform'))
                    params[0] = '[]byte';
                out[hook] = params;
            }
            return out;
        };
        r.hookPrefixes[`stream.${name}`] = '_';
    }
    r.constructors['stream.default'] = r.constructors['stream.Stream'];
    r.optionTypers['stream.default'] = r.optionTypers['stream.Stream'];
    for (const hook of Object.keys(STREAM_HOOK_PARAMS))
        r.hookParams[`_${hook}`] = STREAM_HOOK_PARAMS[hook];
    r.methods['stream.Duplex#pipe'] = (c) => {
        use();
        return `TnPipe(${c.recv}, ${c.args.join(', ')})`;
    };
    r.typers['stream.Duplex#pipe'] = (c) => c.types[0] || '*TnStream';
    r.paramTypers['stream.Duplex#on'] = (nodes) => streamListenerTypes(nodes);
    r.paramTypers['stream.Duplex#once'] = r.paramTypers['stream.Duplex#on'];
    r.functions['stream.Readable.from'] = (call) => {
        use();
        return `TnReadableFrom(${call.args.join(', ')})`;
    };
    r.results['stream.Readable.from'] = '*TnStream';
    const pipeline = (call) => {
        use();
        const last = call.nodes.length - 1;
        const hasCallback = last >= 0 && (call.nodes[last].kind === 'ArrowFunction' || call.nodes[last].kind === 'FunctionExpression');
        const streams = hasCallback ? call.args.slice(0, last) : call.args;
        return `TnPipeline(${hasCallback ? call.args[last] : 'nil'}, ${streams.join(', ')})`;
    };
    r.functions['stream.pipeline'] = pipeline;
    r.results['stream.pipeline'] = '*TnStream';
    r.paramTypers['stream.pipeline'] = (_n) => ['interface{}'];
    r.functions['stream.finished'] = (call) => {
        use();
        return `TnFinished(${call.args[0]}, ${call.args[call.args.length - 1]})`;
    };
    r.paramTypers['stream.finished'] = (_n) => ['interface{}'];
    r.functions['stream/promises.pipeline'] = (call) => {
        use();
        return `TnPipelinePromise(${call.args.join(', ')})`;
    };
    r.functions['stream/promises.finished'] = (call) => {
        use();
        return `TnFinishedPromise(${call.args[0]})`;
    };
    setResults(r, 'stream/promises', 'pipeline=chan struct{}; finished=chan struct{}');
    const consumer = (name, goName, result) => {
        r.functions[`stream/consumers.${name}`] = (call) => {
            use();
            return `${goName}(${call.args[0]})`;
        };
        r.results[`stream/consumers.${name}`] = result;
    };
    consumer('text', 'TnConsumeText', 'chan string');
    consumer('buffer', 'TnConsumeBuffer', 'chan []byte');
    consumer('json', 'TnConsumeJSON', 'chan interface{}');
    // process.stdout / stderr / stdin as streams (stdout.write stays a direct call)
    const stdio = (name, goName) => {
        r.values[`process.${name}`] = (_c) => {
            use();
            return `${goName}()`;
        };
        r.valueTypes[`process.${name}`] = '*TnStream';
    };
    stdio('stdout', 'TnStdout');
    stdio('stderr', 'TnStderr');
    stdio('stdin', 'TnStdin');
    // fs.createReadStream / createWriteStream
    defineHelper(r, 'fileStreams', ['os'], ['nodeStream', 'nodeFs'], fileStreamHelper);
    r.functions['fs.createReadStream'] = (call) => {
        r.helper('fileStreams');
        return `TnCreateReadStream(${call.args.join(', ')})`;
    };
    r.functions['fs.createWriteStream'] = (call) => {
        r.helper('fileStreams');
        return `TnCreateWriteStream(${call.args.join(', ')})`;
    };
    setResults(r, 'fs', 'createReadStream=*TnStream; createWriteStream=*TnStream');
    // zlib.createGzip() & co.
    defineHelper(r, 'zlibStreams', [], ['nodeStream', 'nodeZlib'], zlibStreamHelper);
    const zlibStreams = {
        createGzip: 'gzip:false',
        createGunzip: 'gunzip:true',
        createDeflate: 'deflate:false',
        createInflate: 'inflate:true',
        createDeflateRaw: 'deflateRaw:false',
        createInflateRaw: 'inflateRaw:true',
        createUnzip: 'unzip:true',
        createBrotliCompress: 'brotli:false',
        createBrotliDecompress: 'brotli:true'
    };
    for (const name of Object.keys(zlibStreams)) {
        const parts = zlibStreams[name].split(':');
        r.functions[`zlib.${name}`] = (call) => {
            r.helper('zlibStreams');
            if (parts[0] === 'brotli')
                r.helper('nodeBrotli');
            const options = call.args.length > 0 ? `, ${call.args[0]}` : '';
            return `TnZlibStream(${JSON.stringify(parts[0])}, ${parts[1]}${options})`;
        };
        r.results[`zlib.${name}`] = '*TnStream';
    }
    for (const method of ['on', 'once', 'resume', 'pause', 'setEncoding', 'pipe', 'read', 'destroy']) {
        r.functions[`process.stdin.${method}`] = (call) => {
            use();
            if (method === 'pipe')
                return `TnPipe(TnStdin(), ${call.args.join(', ')})`;
            const refCall = method === 'destroy' ? '; TnStdin().stdinRef(false)' : '; TnStdin().stdinRef(TnStdin().flowing == 1)';
            return `func() *TnStream { TnStdin().${method}(${call.args.join(', ')})${refCall}; return TnStdin() }()`;
        };
        r.results[`process.stdin.${method}`] = '*TnStream';
    }
    r.paramTypers['process.stdin.on'] = (nodes) => streamListenerTypes(nodes);
    r.paramTypers['process.stdin.once'] = r.paramTypers['process.stdin.on'];
}
// Listener parameters of stream events
export function streamListenerTypes(nodes) {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'data')
        return ['interface{}'];
    if (name === 'error')
        return ['interface{}'];
    if (name === 'keypress')
        return ['string', '*TnKey'];
    return [];
}
