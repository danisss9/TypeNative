// node:stream/web (+ globals): WHATWG ReadableStream / WritableStream /
// TransformStream with their readers, writers and controllers, queuing
// strategies, TextEncoderStream / TextDecoderStream, CompressionStream /
// DecompressionStream; Readable.toWeb / fromWeb & co. bridge Node streams.
// Also Blob / File (node:buffer) and FormData. Everything runs on the event
// loop: promise reactions (pull, write and read completions) are microtasks.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule } from './registry.js';

const streamWebHelper = `// node:stream/web
type TnReadResult struct {
	value interface{}
	done  bool
}

// A JS callback (or a Go func) to call
func tnWebIsFunc(v interface{}) bool {
	if v == nil {
		return false
	}
	rv := reflect.ValueOf(v)
	return rv.Kind() == reflect.Func && !rv.IsNil()
}

func tnWebNumber(v interface{}) (float64, bool) {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Float32, reflect.Float64:
		return rv.Float(), true
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(rv.Int()), true
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(rv.Uint()), true
	}
	return 0, false
}

func tnWebArg(args []interface{}) interface{} {
	if len(args) > 0 {
		return args[0]
	}
	return nil
}

func tnWebTypeError(code string, message string) *TnError {
	return TnNodeError("TypeError", code, message)
}

// Calls fn, catching a throw
func tnWebCall(fn func() interface{}) (result interface{}, thrown interface{}, failed bool) {
	defer func() {
		if r := recover(); r != nil {
			thrown = r
			failed = true
		}
	}()
	return fn(), nil, false
}

// Runs then(value, reason, failed) on the loop once v settles: right after the
// current code (a microtask) when v is not a promise
func tnWebWhen(v interface{}, then func(value interface{}, reason interface{}, failed bool)) {
	rv := reflect.ValueOf(v)
	if !rv.IsValid() || rv.Kind() != reflect.Chan || rv.IsNil() {
		TnQueueMicrotask(func() { then(v, nil, false) })
		return
	}
	ctx := TnAsyncSnapshot()
	TnLoopRef()
	go func() {
		x, ok := rv.Recv()
		var value, reason interface{}
		failed := false
		if ok {
			if x.IsValid() {
				value = x.Interface()
			}
		} else {
			reason, failed = tnRejections.Load(v)
		}
		TnLoopPost(func() {
			defer TnLoopUnref()
			TnAsyncRun(ctx, func() { then(value, reason, failed) })
		})
	}()
}

func tnWebResolved() chan struct{} {
	ch := make(chan struct{})
	close(ch)
	return ch
}

func tnWebRejected(reason interface{}) chan struct{} {
	ch := make(chan struct{})
	TnReject(ch, reason)
	return ch
}

// A void promise settled by the outcome of v
func tnWebPromise(v interface{}) chan struct{} {
	ch := make(chan struct{})
	tnWebWhen(v, func(_ interface{}, reason interface{}, failed bool) {
		if failed {
			TnReject(ch, reason)
			return
		}
		close(ch)
	})
	return ch
}

// --- queuing strategies ---

type TnQueuingStrategy struct {
	highWaterMark float64
	bytes         bool
}

func TnNewQueuingStrategy(bytes bool, init interface{}) *TnQueuingStrategy {
	q := &TnQueuingStrategy{bytes: bytes}
	if n, ok := tnWebNumber(TnGet(init, "highWaterMark")); ok {
		q.highWaterMark = n
	} else {
		panic(tnWebTypeError("ERR_INVALID_ARG_TYPE", "The \\"init.highWaterMark\\" property must be of type number"))
	}
	return q
}

func (q *TnQueuingStrategy) size(chunk ...interface{}) float64 {
	if q.bytes {
		return tnWebByteLength(tnWebArg(chunk))
	}
	return 1
}

func tnWebByteLength(chunk interface{}) float64 {
	switch c := chunk.(type) {
	case []byte:
		return float64(len(c))
	case string:
		return float64(len(c))
	case *TnBlob:
		return float64(len(c.data))
	}
	if n, ok := tnWebNumber(TnGet(chunk, "byteLength")); ok {
		return n
	}
	return 0
}

type tnWebStrategy struct {
	hwm   float64
	size  interface{}
	bytes bool
}

func tnWebStrategyOf(strategy []interface{}, defaultHWM float64) tnWebStrategy {
	st := tnWebStrategy{hwm: defaultHWM}
	if len(strategy) == 0 || strategy[0] == nil || TnIsNil(strategy[0]) {
		return st
	}
	if q, ok := strategy[0].(*TnQueuingStrategy); ok {
		st.hwm = q.highWaterMark
		st.bytes = q.bytes
		return st
	}
	if n, ok := tnWebNumber(TnGet(strategy[0], "highWaterMark")); ok {
		st.hwm = n
	}
	if fn := TnGet(strategy[0], "size"); tnWebIsFunc(fn) {
		st.size = fn
	}
	return st
}

func (st tnWebStrategy) sizeOf(chunk interface{}) float64 {
	if st.bytes {
		return tnWebByteLength(chunk)
	}
	if st.size != nil {
		n, _ := tnWebNumber(TnInvoke(st.size, chunk))
		return n
	}
	return 1
}

// --- ReadableStream ---

type tnWebChunk struct {
	value interface{}
	size  float64
}

// A pending read: a promise, or (internal consumers) a callback run as a microtask
type tnWebRead struct {
	ch chan *TnReadResult
	cb func(res *TnReadResult, reason interface{}, failed bool)
}

func (r tnWebRead) settle(res *TnReadResult, reason interface{}, failed bool) {
	if r.cb != nil {
		cb := r.cb
		TnQueueMicrotask(func() { cb(res, reason, failed) })
		return
	}
	if failed {
		TnReject(r.ch, reason)
		return
	}
	r.ch <- res
}

type TnReadableStream struct {
	state          string
	storedError    interface{}
	queue          []tnWebChunk
	queueTotal     float64
	strategy       tnWebStrategy
	closeRequested bool
	started        bool
	pulling        bool
	pullAgain      bool
	disturbed      bool
	reader         *TnReadableStreamDefaultReader
	controller     *TnReadableStreamDefaultController
	pullFn         func() interface{}
	cancelFn       func(reason interface{}) interface{}
}

type TnReadableStreamDefaultController struct {
	stream *TnReadableStream
}

type TnReadableStreamDefaultReader struct {
	stream        *TnReadableStream
	reads         []tnWebRead
	closed        chan struct{}
	closedSettled bool
}

func tnNewWebReadable(st tnWebStrategy) *TnReadableStream {
	s := &TnReadableStream{state: "readable", strategy: st}
	s.controller = &TnReadableStreamDefaultController{stream: s}
	return s
}

// new ReadableStream(underlyingSource?, strategy?)
func TnNewReadableStream(args ...interface{}) *TnReadableStream {
	source := tnWebArg(args)
	var rest []interface{}
	if len(args) > 1 {
		rest = args[1:]
	}
	s := tnNewWebReadable(tnWebStrategyOf(rest, 1))
	if source == nil || TnIsNil(source) {
		s.startWith(nil)
		return s
	}
	if t, _ := TnGet(source, "type").(string); t == "bytes" {
		s.strategy.bytes = true
		if len(rest) == 0 {
			s.strategy.hwm = 0
		}
	}
	if pull := TnGet(source, "pull"); tnWebIsFunc(pull) {
		s.pullFn = func() interface{} { return TnInvoke(pull, s.controller) }
	}
	if cancel := TnGet(source, "cancel"); tnWebIsFunc(cancel) {
		s.cancelFn = func(reason interface{}) interface{} { return TnInvoke(cancel, reason) }
	}
	if start := TnGet(source, "start"); tnWebIsFunc(start) {
		s.startWith(func() interface{} { return TnInvoke(start, s.controller) })
		return s
	}
	s.startWith(nil)
	return s
}

// start runs synchronously (a throw escapes the constructor); pulling begins
// once its result settles
func (s *TnReadableStream) startWith(start func() interface{}) {
	var result interface{}
	if start != nil {
		result = start()
	}
	tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
		if failed {
			s.fail(reason)
			return
		}
		s.started = true
		s.pullIfNeeded()
	})
}

func (s *TnReadableStream) desiredSize() float64 { return s.strategy.hwm - s.queueTotal }

func (s *TnReadableStream) hasPendingReads() bool {
	return s.reader != nil && len(s.reader.reads) > 0
}

// No reader is waiting and the queue is full
func (s *TnReadableStream) backpressured() bool {
	return s.desiredSize() <= 0 && !s.hasPendingReads()
}

func (s *TnReadableStream) open() bool { return s.state == "readable" && !s.closeRequested }

func (s *TnReadableStream) pullIfNeeded() {
	if s.pullFn == nil || !s.started || !s.open() {
		return
	}
	if !s.hasPendingReads() && s.desiredSize() <= 0 {
		return
	}
	if s.pulling {
		s.pullAgain = true
		return
	}
	s.pulling = true
	result, thrown, failed := tnWebCall(s.pullFn)
	if failed {
		s.pulling = false
		s.fail(thrown)
		return
	}
	tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
		s.pulling = false
		if failed {
			s.fail(reason)
			return
		}
		if s.pullAgain {
			s.pullAgain = false
			s.pullIfNeeded()
		}
	})
}

func (s *TnReadableStream) enqueue(v interface{}) {
	if s.hasPendingReads() {
		rd := s.reader.reads[0]
		s.reader.reads = s.reader.reads[1:]
		rd.settle(&TnReadResult{value: v}, nil, false)
	} else {
		size := s.strategy.sizeOf(v)
		s.queue = append(s.queue, tnWebChunk{value: v, size: size})
		s.queueTotal += size
	}
	s.pullIfNeeded()
}

func (s *TnReadableStream) finishClose() {
	s.state = "closed"
	if r := s.reader; r != nil {
		reads := r.reads
		r.reads = nil
		for _, rd := range reads {
			rd.settle(&TnReadResult{done: true}, nil, false)
		}
		r.settleClosed(nil, false)
	}
}

func (s *TnReadableStream) fail(reason interface{}) {
	if s.state != "readable" {
		return
	}
	s.state = "errored"
	s.storedError = reason
	s.queue = nil
	s.queueTotal = 0
	if r := s.reader; r != nil {
		reads := r.reads
		r.reads = nil
		for _, rd := range reads {
			rd.settle(nil, reason, true)
		}
		r.settleClosed(reason, true)
	}
}

func (c *TnReadableStreamDefaultController) enqueue(chunk ...interface{}) {
	if !c.stream.open() {
		panic(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: Controller is already closed"))
	}
	c.stream.enqueue(tnWebArg(chunk))
}

func (c *TnReadableStreamDefaultController) close() {
	s := c.stream
	if !s.open() {
		panic(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: Controller is already closed"))
	}
	s.closeRequested = true
	if len(s.queue) == 0 {
		s.finishClose()
	}
}

func (c *TnReadableStreamDefaultController) error(reason ...interface{}) {
	c.stream.fail(tnWebArg(reason))
}

func (c *TnReadableStreamDefaultController) Get_desiredSize() float64 {
	switch c.stream.state {
	case "errored", "closed":
		return 0
	}
	return c.stream.desiredSize()
}

func (s *TnReadableStream) Get_locked() bool { return s.reader != nil }

func (s *TnReadableStream) getReader(options ...interface{}) *TnReadableStreamDefaultReader {
	if s.reader != nil {
		panic(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: ReadableStream is locked"))
	}
	r := &TnReadableStreamDefaultReader{stream: s, closed: make(chan struct{})}
	s.reader = r
	switch s.state {
	case "closed":
		r.settleClosed(nil, false)
	case "errored":
		r.settleClosed(s.storedError, true)
	}
	return r
}

func (r *TnReadableStreamDefaultReader) settleClosed(reason interface{}, failed bool) {
	if r.closedSettled {
		if failed {
			r.closed = tnWebRejected(reason)
		}
		return
	}
	r.closedSettled = true
	if failed {
		TnReject(r.closed, reason)
		return
	}
	close(r.closed)
}

func (r *TnReadableStreamDefaultReader) Get_closed() chan struct{} { return r.closed }

// read(): { value, done } — the next chunk, or done once the stream closed
func (r *TnReadableStreamDefaultReader) read(view ...interface{}) chan *TnReadResult {
	ch := make(chan *TnReadResult, 1)
	r.readInto(tnWebRead{ch: ch})
	return ch
}

func (r *TnReadableStreamDefaultReader) readInto(rd tnWebRead) {
	s := r.stream
	if s == nil {
		rd.settle(nil, tnWebTypeError("ERR_INVALID_STATE", "Invalid state: The reader is not attached to a stream"), true)
		return
	}
	s.disturbed = true
	switch s.state {
	case "closed":
		rd.settle(&TnReadResult{done: true}, nil, false)
		return
	case "errored":
		rd.settle(nil, s.storedError, true)
		return
	}
	if len(s.queue) > 0 {
		c := s.queue[0]
		s.queue = s.queue[1:]
		s.queueTotal -= c.size
		if s.queueTotal < 0 || len(s.queue) == 0 {
			s.queueTotal = 0
		}
		rd.settle(&TnReadResult{value: c.value}, nil, false)
		if s.closeRequested && len(s.queue) == 0 {
			s.finishClose()
		} else {
			s.pullIfNeeded()
		}
		return
	}
	r.reads = append(r.reads, rd)
	s.pullIfNeeded()
}

func (r *TnReadableStreamDefaultReader) releaseLock() {
	s := r.stream
	if s == nil {
		return
	}
	err := tnWebTypeError("ERR_INVALID_STATE", "Invalid state: Releasing reader")
	reads := r.reads
	r.reads = nil
	for _, rd := range reads {
		rd.settle(nil, err, true)
	}
	r.settleClosed(err, true)
	s.reader = nil
	r.stream = nil
}

func (r *TnReadableStreamDefaultReader) cancel(reason ...interface{}) chan struct{} {
	if r.stream == nil {
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: The reader is not attached to a stream"))
	}
	return r.stream.cancelWith(tnWebArg(reason))
}

func (s *TnReadableStream) cancel(reason ...interface{}) chan struct{} {
	if s.reader != nil {
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: ReadableStream is locked"))
	}
	return s.cancelWith(tnWebArg(reason))
}

func (s *TnReadableStream) cancelWith(reason interface{}) chan struct{} {
	s.disturbed = true
	switch s.state {
	case "closed":
		return tnWebResolved()
	case "errored":
		return tnWebRejected(s.storedError)
	}
	s.queue = nil
	s.queueTotal = 0
	s.finishClose()
	if s.cancelFn == nil {
		return tnWebResolved()
	}
	result, thrown, failed := tnWebCall(func() interface{} { return s.cancelFn(reason) })
	if failed {
		return tnWebRejected(thrown)
	}
	return tnWebPromise(result)
}

// tee(): two branches that each see every chunk
func (s *TnReadableStream) tee() []*TnReadableStream {
	reader := s.getReader()
	branches := []*TnReadableStream{tnNewWebReadable(tnWebStrategy{hwm: 1}), tnNewWebReadable(tnWebStrategy{hwm: 1})}
	canceled := []bool{false, false}
	reasons := []interface{}{nil, nil}
	reading := false
	for i := range branches {
		idx := i
		b := branches[i]
		b.pullFn = func() interface{} {
			if reading {
				return nil
			}
			reading = true
			reader.readInto(tnWebRead{cb: func(res *TnReadResult, reason interface{}, failed bool) {
				reading = false
				for j, br := range branches {
					if canceled[j] || !br.open() {
						continue
					}
					switch {
					case failed:
						br.fail(reason)
					case res.done:
						br.controller.close()
					default:
						br.enqueue(res.value)
					}
				}
			}})
			return nil
		}
		b.cancelFn = func(reason interface{}) interface{} {
			canceled[idx] = true
			reasons[idx] = reason
			if canceled[0] && canceled[1] {
				return reader.cancel([]interface{}{reasons[0], reasons[1]})
			}
			return nil
		}
	}
	for _, b := range branches {
		b.startWith(nil)
	}
	return branches
}

// for await (const chunk of stream) / stream.values(): one read ahead
func (s *TnReadableStream) tnIterator() chan interface{} { return s.values() }

func (s *TnReadableStream) values(options ...interface{}) chan interface{} {
	reader := s.getReader()
	out := make(chan interface{})
	go func() {
		for {
			res := make(chan *TnReadResult, 1)
			TnLoopPost(func() { reader.readInto(tnWebRead{ch: res}) })
			v, ok := <-res
			if !ok {
				reason, _ := tnRejections.Load(res)
				TnReject(out, reason)
				return
			}
			if v.done {
				TnLoopPost(func() { reader.releaseLock() })
				close(out)
				return
			}
			out <- v.value
		}
	}()
	return out
}

// Reads every chunk (on the loop); done gets them all, or the error
func tnWebReadAll(s *TnReadableStream, done func(chunks []interface{}, reason interface{}, failed bool)) {
	if s.reader != nil {
		done(nil, tnWebTypeError("ERR_INVALID_STATE", "Invalid state: ReadableStream is locked"), true)
		return
	}
	reader := s.getReader()
	chunks := []interface{}{}
	var next func()
	next = func() {
		reader.readInto(tnWebRead{cb: func(res *TnReadResult, reason interface{}, failed bool) {
			if failed {
				done(nil, reason, true)
				return
			}
			if res.done {
				reader.releaseLock()
				done(chunks, nil, false)
				return
			}
			chunks = append(chunks, res.value)
			next()
		}})
	}
	next()
}

func tnWebChunkBytes(chunk interface{}) []byte {
	switch c := chunk.(type) {
	case []byte:
		return c
	case string:
		return []byte(c)
	case *TnBlob:
		return c.data
	}
	panic(tnWebTypeError("ERR_INVALID_ARG_TYPE", "The \\"chunk\\" argument must be of type string or an instance of Buffer or Uint8Array"))
}

// ReadableStream.from(iterable): arrays, strings, async iterables, Node streams
func TnReadableStreamFrom(iterable interface{}) *TnReadableStream {
	if n, ok := iterable.(tnStreamLike); ok {
		return TnReadableToWeb(n, map[string]interface{}{"objectMode": true})
	}
	if ws, ok := iterable.(*TnReadableStream); ok {
		return ws
	}
	s := tnNewWebReadable(tnWebStrategy{hwm: 0})
	if str, ok := iterable.(string); ok {
		for _, r := range str {
			s.enqueue(string(r))
		}
		s.closeRequested = true
		s.startWith(nil)
		if len(s.queue) == 0 {
			s.finishClose()
		}
		return s
	}
	rv := reflect.ValueOf(iterable)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	switch rv.Kind() {
	case reflect.Slice, reflect.Array:
		items := []interface{}{}
		for i := 0; i < rv.Len(); i++ {
			items = append(items, rv.Index(i).Interface())
		}
		index := 0
		s.pullFn = func() interface{} {
			if index >= len(items) {
				s.controller.close()
				return nil
			}
			s.enqueue(items[index])
			index++
			return nil
		}
	case reflect.Chan:
		s.pullFn = func() interface{} {
			ch := make(chan struct{})
			TnLoopRef()
			go func() {
				v, ok := rv.Recv()
				var reason interface{}
				failed := false
				if !ok {
					reason, failed = tnRejections.Load(iterable)
				}
				TnLoopPost(func() {
					defer TnLoopUnref()
					switch {
					case failed:
						s.fail(reason)
					case !ok:
						if s.open() {
							s.controller.close()
						}
					default:
						if s.open() {
							s.enqueue(v.Interface())
						}
					}
					close(ch)
				})
			}()
			return ch
		}
	default:
		panic(tnWebTypeError("ERR_ARG_NOT_ITERABLE", "The \\"iterable\\" argument must be an iterable"))
	}
	s.startWith(nil)
	return s
}

// A byte stream reading r on a goroutine, one chunk per pull
func tnWebFromReader(r io.ReadCloser) *TnReadableStream {
	s := tnNewWebReadable(tnWebStrategy{hwm: 0, bytes: true})
	s.pullFn = func() interface{} {
		ch := make(chan struct{})
		TnLoopRef()
		go func() {
			buf := make([]byte, 65536)
			n, err := r.Read(buf)
			TnLoopPost(func() {
				defer TnLoopUnref()
				if n > 0 && s.open() {
					s.enqueue(buf[:n])
				}
				if err != nil && s.open() {
					r.Close()
					if err == io.EOF {
						s.controller.close()
					} else {
						e := TnNodeError("TypeError", "", "terminated")
						e.props["cause"] = TnNodeError("Error", "UND_ERR_SOCKET", err.Error())
						s.fail(e)
					}
				}
				close(ch)
			})
		}()
		return ch
	}
	s.cancelFn = func(reason interface{}) interface{} {
		r.Close()
		return nil
	}
	s.startWith(nil)
	return s
}

// A byte stream of data, in 64 KiB chunks
func tnWebFromBytes(data []byte) *TnReadableStream {
	s := tnNewWebReadable(tnWebStrategy{hwm: 0, bytes: true})
	offset := 0
	s.pullFn = func() interface{} {
		if offset >= len(data) {
			s.controller.close()
			return nil
		}
		end := offset + 65536
		if end > len(data) {
			end = len(data)
		}
		s.enqueue(append([]byte{}, data[offset:end]...))
		offset = end
		return nil
	}
	s.startWith(nil)
	return s
}

// An io.Reader over a byte stream: reads hop onto the loop (for Go consumers on other goroutines)
type tnWebStreamReader struct {
	reader *TnReadableStreamDefaultReader
	buf    []byte
	done   bool
}

func tnWebIOReader(s *TnReadableStream) *tnWebStreamReader {
	return &tnWebStreamReader{reader: s.getReader()}
}

func (r *tnWebStreamReader) Read(p []byte) (int, error) {
	for len(r.buf) == 0 {
		if r.done {
			return 0, io.EOF
		}
		res := make(chan *TnReadResult, 1)
		TnLoopPost(func() { r.reader.readInto(tnWebRead{ch: res}) })
		v, ok := <-res
		if !ok {
			reason, _ := tnRejections.Load(res)
			return 0, fmt.Errorf("%v", TnJSString(reason))
		}
		if v.done {
			r.done = true
			continue
		}
		r.buf = tnWebChunkBytes(v.value)
	}
	n := copy(p, r.buf)
	r.buf = r.buf[n:]
	return n, nil
}

// pipeTo(destination, { preventClose, preventAbort, preventCancel, signal })
func (s *TnReadableStream) pipeTo(dest *TnWritableStream, options ...interface{}) chan struct{} {
	ch := make(chan struct{})
	opts := tnWebArg(options)
	flag := func(name string) bool {
		b, _ := TnGet(opts, name).(bool)
		return b
	}
	preventClose, preventAbort, preventCancel := flag("preventClose"), flag("preventAbort"), flag("preventCancel")
	if s.reader != nil || dest.writer != nil {
		TnReject(ch, tnWebTypeError("ERR_INVALID_STATE", "Invalid state: The stream is locked"))
		return ch
	}
	reader := s.getReader()
	writer := dest.getWriter()
	done := false
	finish := func(reason interface{}, failed bool) {
		if done {
			return
		}
		done = true
		reader.releaseLock()
		writer.releaseLock()
		if failed {
			TnReject(ch, reason)
			return
		}
		close(ch)
	}
	if signal, ok := TnGet(opts, "signal").(*TnAbortSignal); ok && signal != nil {
		onAbort := func() {
			reason := tnWebAbortReason(signal)
			if !preventAbort {
				dest.abortWith(reason)
			}
			if !preventCancel {
				s.cancelWith(reason)
			}
			finish(reason, true)
		}
		if signal.aborted {
			onAbort()
			return ch
		}
		signal.addEventListener("abort", func(ev *TnEvent) { onAbort() })
	}
	var step func()
	step = func() {
		if done {
			return
		}
		tnWebWhen(writer.ready, func(_ interface{}, reason interface{}, failed bool) {
			if done {
				return
			}
			if failed || dest.state == "errored" {
				if dest.state == "errored" {
					reason = dest.storedError
				}
				if !preventCancel {
					s.cancelWith(reason)
				}
				finish(reason, true)
				return
			}
			reader.readInto(tnWebRead{cb: func(res *TnReadResult, reason interface{}, failed bool) {
				if done {
					return
				}
				if failed {
					if !preventAbort {
						dest.abortWith(reason)
					}
					finish(reason, true)
					return
				}
				if res.done {
					if preventClose {
						finish(nil, false)
						return
					}
					tnWebWhen(writer.close(), func(_ interface{}, reason interface{}, failed bool) { finish(reason, failed) })
					return
				}
				tnWebWhen(writer.write(res.value), func(_ interface{}, reason interface{}, failed bool) {
					if failed && !done {
						if !preventCancel {
							s.cancelWith(reason)
						}
						finish(reason, true)
					}
				})
				step()
			}})
		})
	}
	step()
	return ch
}

func tnWebAbortReason(signal *TnAbortSignal) interface{} {
	if signal.reason != nil {
		return signal.reason
	}
	return tnAbortError("This operation was aborted", "AbortError")
}

// pipeThrough({ writable, readable }, options): the readable side
func (s *TnReadableStream) pipeThrough(transform interface{}, options ...interface{}) *TnReadableStream {
	var writable *TnWritableStream
	var readable *TnReadableStream
	if t, ok := transform.(*TnTransformStream); ok {
		writable, readable = t.writable, t.readable
	} else {
		writable, _ = TnGet(transform, "writable").(*TnWritableStream)
		readable, _ = TnGet(transform, "readable").(*TnReadableStream)
	}
	if writable == nil || readable == nil {
		panic(tnWebTypeError("ERR_INVALID_ARG_TYPE", "The \\"transform\\" argument must have readable and writable streams"))
	}
	p := s.pipeTo(writable, options...)
	tnWebWhen(p, func(interface{}, interface{}, bool) {})
	return readable
}

// --- WritableStream ---

type tnWebWrite struct {
	chunk interface{}
	size  float64
	ch    chan struct{}
}

type TnWritableStream struct {
	state          string
	storedError    interface{}
	queue          []tnWebWrite
	queueTotal     float64
	strategy       tnWebStrategy
	started        bool
	inFlight       bool
	closeRequested bool
	closeCh        chan struct{}
	backpressure   bool
	writer         *TnWritableStreamDefaultWriter
	controller     *TnWritableStreamDefaultController
	writeFn        func(chunk interface{}) interface{}
	closeFn        func() interface{}
	abortFn        func(reason interface{}) interface{}
}

type TnWritableStreamDefaultController struct {
	stream *TnWritableStream
	signal *TnAbortSignal
}

type TnWritableStreamDefaultWriter struct {
	stream        *TnWritableStream
	ready         chan struct{}
	readySettled  bool
	closed        chan struct{}
	closedSettled bool
}

func tnNewWebWritable(st tnWebStrategy) *TnWritableStream {
	s := &TnWritableStream{state: "writable", strategy: st}
	s.controller = &TnWritableStreamDefaultController{stream: s, signal: TnNewAbortSignal()}
	s.backpressure = st.hwm <= 0
	return s
}

// new WritableStream(underlyingSink?, strategy?)
func TnNewWritableStream(args ...interface{}) *TnWritableStream {
	sink := tnWebArg(args)
	var rest []interface{}
	if len(args) > 1 {
		rest = args[1:]
	}
	s := tnNewWebWritable(tnWebStrategyOf(rest, 1))
	if sink == nil || TnIsNil(sink) {
		s.startWith(nil)
		return s
	}
	if write := TnGet(sink, "write"); tnWebIsFunc(write) {
		s.writeFn = func(chunk interface{}) interface{} { return TnInvoke(write, chunk, s.controller) }
	}
	if closeFn := TnGet(sink, "close"); tnWebIsFunc(closeFn) {
		s.closeFn = func() interface{} { return TnInvoke(closeFn) }
	}
	if abort := TnGet(sink, "abort"); tnWebIsFunc(abort) {
		s.abortFn = func(reason interface{}) interface{} { return TnInvoke(abort, reason) }
	}
	if start := TnGet(sink, "start"); tnWebIsFunc(start) {
		s.startWith(func() interface{} { return TnInvoke(start, s.controller) })
		return s
	}
	s.startWith(nil)
	return s
}

func (s *TnWritableStream) startWith(start func() interface{}) {
	var result interface{}
	if start != nil {
		result = start()
	}
	tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
		if failed {
			s.fail(reason)
			return
		}
		s.started = true
		s.advance()
	})
}

func (s *TnWritableStream) desiredSize() float64 { return s.strategy.hwm - s.queueTotal }

func (s *TnWritableStream) updateBackpressure() {
	bp := s.desiredSize() <= 0
	if bp == s.backpressure || s.state != "writable" || s.closeRequested {
		return
	}
	s.backpressure = bp
	if w := s.writer; w != nil {
		if bp {
			w.ready = make(chan struct{})
			w.readySettled = false
		} else {
			w.settleReady(nil, false)
		}
	}
}

func (s *TnWritableStream) enqueueWrite(chunk interface{}) chan struct{} {
	switch {
	case s.state == "errored":
		return tnWebRejected(s.storedError)
	case s.state == "closed":
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: WritableStream is closed"))
	case s.closeRequested:
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: WritableStream is closing"))
	}
	ch := make(chan struct{})
	size := s.strategy.sizeOf(chunk)
	s.queue = append(s.queue, tnWebWrite{chunk: chunk, size: size, ch: ch})
	s.queueTotal += size
	s.updateBackpressure()
	s.advance()
	return ch
}

func (s *TnWritableStream) advance() {
	if !s.started || s.inFlight || s.state != "writable" {
		return
	}
	if len(s.queue) == 0 {
		if s.closeRequested {
			s.runClose()
		}
		return
	}
	w := s.queue[0]
	s.inFlight = true
	var result interface{}
	if s.writeFn != nil {
		r, thrown, failed := tnWebCall(func() interface{} { return s.writeFn(w.chunk) })
		if failed {
			s.inFlight = false
			s.fail(thrown)
			return
		}
		result = r
	}
	tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
		s.inFlight = false
		if s.state != "writable" {
			return
		}
		s.queue = s.queue[1:]
		s.queueTotal -= w.size
		if s.queueTotal < 0 || len(s.queue) == 0 {
			s.queueTotal = 0
		}
		if failed {
			TnReject(w.ch, reason)
			s.fail(reason)
			return
		}
		close(w.ch)
		s.updateBackpressure()
		s.advance()
	})
}

func (s *TnWritableStream) runClose() {
	s.inFlight = true
	var result interface{}
	if s.closeFn != nil {
		r, thrown, failed := tnWebCall(s.closeFn)
		if failed {
			s.inFlight = false
			s.fail(thrown)
			return
		}
		result = r
	}
	tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
		s.inFlight = false
		if s.state != "writable" {
			return
		}
		if failed {
			s.fail(reason)
			return
		}
		s.state = "closed"
		close(s.closeCh)
		if w := s.writer; w != nil {
			w.settleClosed(nil, false)
		}
	})
}

func (s *TnWritableStream) closeWith() chan struct{} {
	if s.state == "closed" || s.state == "errored" || s.closeRequested {
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: WritableStream is closed"))
	}
	s.closeRequested = true
	s.closeCh = make(chan struct{})
	if w := s.writer; w != nil && s.backpressure {
		w.settleReady(nil, false)
	}
	s.advance()
	return s.closeCh
}

func (s *TnWritableStream) fail(reason interface{}) {
	if s.state != "writable" {
		return
	}
	s.state = "errored"
	s.storedError = reason
	for _, w := range s.queue {
		TnReject(w.ch, reason)
	}
	s.queue = nil
	s.queueTotal = 0
	if s.closeCh != nil {
		TnReject(s.closeCh, reason)
	}
	if w := s.writer; w != nil {
		w.settleReady(reason, true)
		w.settleClosed(reason, true)
	}
}

func (s *TnWritableStream) abortWith(reason interface{}) chan struct{} {
	if s.state != "writable" {
		return tnWebResolved()
	}
	s.controller.signal.abort(reason)
	var result interface{}
	if s.abortFn != nil {
		r, thrown, failed := tnWebCall(func() interface{} { return s.abortFn(reason) })
		if failed {
			s.fail(reason)
			return tnWebRejected(thrown)
		}
		result = r
	}
	s.fail(reason)
	return tnWebPromise(result)
}

func (c *TnWritableStreamDefaultController) error(reason ...interface{}) {
	c.stream.fail(tnWebArg(reason))
}

func (c *TnWritableStreamDefaultController) Get_signal() *TnAbortSignal { return c.signal }

func (s *TnWritableStream) Get_locked() bool { return s.writer != nil }

func (s *TnWritableStream) getWriter() *TnWritableStreamDefaultWriter {
	if s.writer != nil {
		panic(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: WritableStream is locked"))
	}
	w := &TnWritableStreamDefaultWriter{stream: s, ready: make(chan struct{}), closed: make(chan struct{})}
	s.writer = w
	switch s.state {
	case "writable":
		if !s.backpressure || s.closeRequested {
			w.settleReady(nil, false)
		}
	case "closed":
		w.settleReady(nil, false)
		w.settleClosed(nil, false)
	case "errored":
		w.settleReady(s.storedError, true)
		w.settleClosed(s.storedError, true)
	}
	return w
}

func (s *TnWritableStream) close() chan struct{} {
	if s.writer != nil {
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: WritableStream is locked"))
	}
	return s.closeWith()
}

func (s *TnWritableStream) abort(reason ...interface{}) chan struct{} {
	if s.writer != nil {
		return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: WritableStream is locked"))
	}
	return s.abortWith(tnWebArg(reason))
}

func (w *TnWritableStreamDefaultWriter) settleReady(reason interface{}, failed bool) {
	if w.readySettled {
		if failed {
			w.ready = tnWebRejected(reason)
		}
		return
	}
	w.readySettled = true
	if failed {
		TnReject(w.ready, reason)
		return
	}
	close(w.ready)
}

func (w *TnWritableStreamDefaultWriter) settleClosed(reason interface{}, failed bool) {
	if w.closedSettled {
		if failed {
			w.closed = tnWebRejected(reason)
		}
		return
	}
	w.closedSettled = true
	if failed {
		TnReject(w.closed, reason)
		return
	}
	close(w.closed)
}

func tnWebDetached() chan struct{} {
	return tnWebRejected(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: Writer is not bound to a WritableStream"))
}

func (w *TnWritableStreamDefaultWriter) Get_ready() chan struct{}  { return w.ready }
func (w *TnWritableStreamDefaultWriter) Get_closed() chan struct{} { return w.closed }
func (w *TnWritableStreamDefaultWriter) Get_desiredSize() float64 {
	if w.stream == nil || w.stream.state != "writable" {
		return 0
	}
	return w.stream.desiredSize()
}

func (w *TnWritableStreamDefaultWriter) write(chunk ...interface{}) chan struct{} {
	if w.stream == nil {
		return tnWebDetached()
	}
	return w.stream.enqueueWrite(tnWebArg(chunk))
}

func (w *TnWritableStreamDefaultWriter) close() chan struct{} {
	if w.stream == nil {
		return tnWebDetached()
	}
	return w.stream.closeWith()
}

func (w *TnWritableStreamDefaultWriter) abort(reason ...interface{}) chan struct{} {
	if w.stream == nil {
		return tnWebDetached()
	}
	return w.stream.abortWith(tnWebArg(reason))
}

func (w *TnWritableStreamDefaultWriter) releaseLock() {
	s := w.stream
	if s == nil {
		return
	}
	err := tnWebTypeError("ERR_INVALID_STATE", "Invalid state: Writer has been released")
	w.settleReady(err, true)
	w.settleClosed(err, true)
	s.writer = nil
	w.stream = nil
}

// --- TransformStream ---

type TnTransformStream struct {
	readable    *TnReadableStream
	writable    *TnWritableStream
	encoding    string
	fatal       bool
	ignoreBOM   bool
	controller  *TnTransformStreamDefaultController
	transformFn func(chunk interface{}) interface{}
	flushFn     func() interface{}
	cancelFn    func(reason interface{}) interface{}
	// A write waiting for the readable side to want more
	waiting func()
}

type TnTransformStreamDefaultController struct {
	ts *TnTransformStream
}

func (c *TnTransformStreamDefaultController) enqueue(chunk ...interface{}) {
	r := c.ts.readable
	if !r.open() {
		panic(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: Controller is already closed"))
	}
	r.enqueue(tnWebArg(chunk))
}

func (c *TnTransformStreamDefaultController) error(reason ...interface{}) {
	e := tnWebArg(reason)
	c.ts.readable.fail(e)
	c.ts.writable.fail(e)
}

func (c *TnTransformStreamDefaultController) terminate() {
	if c.ts.readable.open() {
		c.ts.readable.controller.close()
	}
	c.ts.writable.fail(tnWebTypeError("ERR_INVALID_STATE", "Invalid state: TransformStream has been terminated"))
}

func (c *TnTransformStreamDefaultController) Get_desiredSize() float64 {
	return c.ts.readable.controller.Get_desiredSize()
}

func tnNewWebTransform(ws tnWebStrategy, rs tnWebStrategy) *TnTransformStream {
	ts := &TnTransformStream{}
	ts.controller = &TnTransformStreamDefaultController{ts: ts}
	ts.readable = tnNewWebReadable(rs)
	ts.writable = tnNewWebWritable(ws)
	ts.readable.pullFn = func() interface{} {
		if fn := ts.waiting; fn != nil {
			ts.waiting = nil
			fn()
		}
		return nil
	}
	ts.readable.cancelFn = func(reason interface{}) interface{} {
		var result interface{}
		if ts.cancelFn != nil {
			result = ts.cancelFn(reason)
		}
		ts.writable.fail(reason)
		return result
	}
	ts.writable.writeFn = func(chunk interface{}) interface{} {
		ch := make(chan struct{})
		run := func() {
			result, thrown, failed := tnWebCall(func() interface{} {
				if ts.transformFn != nil {
					return ts.transformFn(chunk)
				}
				ts.controller.enqueue(chunk)
				return nil
			})
			if failed {
				ts.readable.fail(thrown)
				TnReject(ch, thrown)
				return
			}
			tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
				if failed {
					ts.readable.fail(reason)
					TnReject(ch, reason)
					return
				}
				close(ch)
			})
		}
		if ts.readable.backpressured() {
			ts.waiting = run
		} else {
			run()
		}
		return ch
	}
	ts.writable.closeFn = func() interface{} {
		ch := make(chan struct{})
		var result interface{}
		if ts.flushFn != nil {
			r, thrown, failed := tnWebCall(ts.flushFn)
			if failed {
				ts.readable.fail(thrown)
				TnReject(ch, thrown)
				return ch
			}
			result = r
		}
		tnWebWhen(result, func(_ interface{}, reason interface{}, failed bool) {
			if failed {
				ts.readable.fail(reason)
				TnReject(ch, reason)
				return
			}
			if ts.readable.open() {
				ts.readable.controller.close()
			}
			close(ch)
		})
		return ch
	}
	ts.writable.abortFn = func(reason interface{}) interface{} {
		ts.readable.fail(reason)
		return nil
	}
	return ts
}

// new TransformStream(transformer?, writableStrategy?, readableStrategy?)
func TnNewTransformStream(args ...interface{}) *TnTransformStream {
	transformer := tnWebArg(args)
	var wsArgs, rsArgs []interface{}
	if len(args) > 1 {
		wsArgs = args[1:2]
	}
	if len(args) > 2 {
		rsArgs = args[2:3]
	}
	ts := tnNewWebTransform(tnWebStrategyOf(wsArgs, 1), tnWebStrategyOf(rsArgs, 0))
	var start func() interface{}
	if transformer != nil && !TnIsNil(transformer) {
		if fn := TnGet(transformer, "transform"); tnWebIsFunc(fn) {
			ts.transformFn = func(chunk interface{}) interface{} { return TnInvoke(fn, chunk, ts.controller) }
		}
		if fn := TnGet(transformer, "flush"); tnWebIsFunc(fn) {
			ts.flushFn = func() interface{} { return TnInvoke(fn, ts.controller) }
		}
		if fn := TnGet(transformer, "cancel"); tnWebIsFunc(fn) {
			ts.cancelFn = func(reason interface{}) interface{} { return TnInvoke(fn, reason) }
		}
		if fn := TnGet(transformer, "start"); tnWebIsFunc(fn) {
			start = func() interface{} { return TnInvoke(fn, ts.controller) }
		}
	}
	ts.writable.startWith(start)
	ts.readable.startWith(nil)
	return ts
}

// A TransformStream running Go code per chunk and at the end
func tnGoTransform(transform func(chunk interface{}), flush func()) *TnTransformStream {
	ts := tnNewWebTransform(tnWebStrategy{hwm: 1}, tnWebStrategy{hwm: 0})
	ts.transformFn = func(chunk interface{}) interface{} {
		transform(chunk)
		return nil
	}
	if flush != nil {
		ts.flushFn = func() interface{} {
			flush()
			return nil
		}
	}
	ts.writable.startWith(nil)
	ts.readable.startWith(nil)
	return ts
}

// new TextEncoderStream(): strings in, UTF-8 bytes out
func TnNewTextEncoderStream() *TnTransformStream {
	var ts *TnTransformStream
	ts = tnGoTransform(func(chunk interface{}) {
		if s := TnJSString(chunk); s != "" {
			ts.controller.enqueue([]byte(s))
		}
	}, nil)
	ts.encoding = "utf-8"
	return ts
}

// new TextDecoderStream(label?, { fatal, ignoreBOM }): bytes in, strings out
// (characters split across chunks are kept for the next one)
func TnNewTextDecoderStream(args ...interface{}) *TnTransformStream {
	label := "utf-8"
	if len(args) > 0 {
		if l, ok := args[0].(string); ok && l != "" {
			label = strings.ToLower(l)
		}
	}
	var ts *TnTransformStream
	dec := TnNewStringDecoder(label)
	first := true
	emit := func(s string) {
		if first && s != "" {
			first = false
			if !ts.ignoreBOM {
				s = strings.TrimPrefix(s, "\\uFEFF")
			}
		}
		if s != "" {
			ts.controller.enqueue(s)
		}
	}
	ts = tnGoTransform(func(chunk interface{}) {
		emit(dec.write(tnWebChunkBytes(chunk)))
	}, func() {
		emit(dec.end())
	})
	ts.encoding = label
	if label == "utf8" || label == "unicode-1-1-utf-8" {
		ts.encoding = "utf-8"
	}
	if len(args) > 1 && args[1] != nil {
		ts.fatal, _ = TnGet(args[1], "fatal").(bool)
		ts.ignoreBOM, _ = TnGet(args[1], "ignoreBOM").(bool)
	}
	return ts
}

func tnWebCompressionFormat(format string) {
	switch format {
	case "gzip", "deflate", "deflate-raw":
		return
	}
	panic(tnWebTypeError("ERR_INVALID_ARG_VALUE", "The argument 'format' is invalid. Received '"+format+"'"))
}

// new CompressionStream('gzip' | 'deflate' | 'deflate-raw')
func TnNewCompressionStream(format string) *TnTransformStream {
	tnWebCompressionFormat(format)
	var buf bytes.Buffer
	var w io.WriteCloser
	switch format {
	case "gzip":
		w = gzip.NewWriter(&buf)
	case "deflate":
		w = zlib.NewWriter(&buf)
	default:
		w, _ = flate.NewWriter(&buf, flate.DefaultCompression)
	}
	var ts *TnTransformStream
	drain := func() {
		if buf.Len() > 0 {
			ts.controller.enqueue(append([]byte{}, buf.Bytes()...))
			buf.Reset()
		}
	}
	ts = tnGoTransform(func(chunk interface{}) {
		w.Write(tnWebChunkBytes(chunk))
		drain()
	}, func() {
		w.Close()
		drain()
	})
	return ts
}

// new DecompressionStream(format): decodes once the input ends
func TnNewDecompressionStream(format string) *TnTransformStream {
	tnWebCompressionFormat(format)
	var input bytes.Buffer
	var ts *TnTransformStream
	ts = tnGoTransform(func(chunk interface{}) {
		input.Write(tnWebChunkBytes(chunk))
	}, func() {
		var r io.Reader
		var err error
		switch format {
		case "gzip":
			r, err = gzip.NewReader(&input)
		case "deflate":
			r, err = zlib.NewReader(&input)
		default:
			r = flate.NewReader(&input)
		}
		var out []byte
		if err == nil {
			out, err = io.ReadAll(r)
		}
		if err != nil {
			panic(TnNodeError("TypeError", "ERR_INVALID_STATE", "The compressed data was not valid: "+err.Error()))
		}
		if len(out) > 0 {
			ts.controller.enqueue(out)
		}
	})
	return ts
}

// --- Node stream bridges ---

// Readable.toWeb(readable, { strategy }): paused while the web queue is full
func TnReadableToWeb(src tnStreamLike, options ...interface{}) *TnReadableStream {
	n := src.tnStream()
	var strategy []interface{}
	if len(options) > 0 && options[0] != nil {
		if st := TnGet(options[0], "strategy"); st != nil {
			strategy = []interface{}{st}
		}
	}
	ws := tnNewWebReadable(tnWebStrategyOf(strategy, 1))
	ws.pullFn = func() interface{} {
		if n.isPaused() {
			n.resume()
		}
		return nil
	}
	ws.cancelFn = func(reason interface{}) interface{} {
		n.destroy()
		return nil
	}
	n.on("data", func(chunk interface{}) {
		if !ws.open() {
			return
		}
		ws.enqueue(chunk)
		if ws.backpressured() {
			n.pause()
		}
	})
	n.TnEventEmitter.once("end", func() {
		if ws.open() {
			ws.controller.close()
		}
	})
	n.TnEventEmitter.once("error", func(err interface{}) { ws.fail(err) })
	ws.startWith(nil)
	return ws
}

// Readable.fromWeb(readableStream, options?)
func TnReadableFromWeb(ws *TnReadableStream, options ...interface{}) *TnStream {
	n := TnNewReadable(options...)
	reader := ws.getReader()
	reading := false
	n.setHook("_read", func(size float64) {
		if reading {
			return
		}
		reading = true
		reader.readInto(tnWebRead{cb: func(res *TnReadResult, reason interface{}, failed bool) {
			reading = false
			switch {
			case failed:
				n.destroy(reason)
			case res.done:
				n.push(nil)
			default:
				n.push(res.value)
			}
		}})
	})
	n.setHook("_destroy", func(err interface{}, cb func(args ...interface{})) {
		if ws.state == "readable" {
			reader.cancel(err)
		}
		cb(err)
	})
	return n
}

// Writable.toWeb(writable)
func TnWritableToWeb(dst tnStreamLike) *TnWritableStream {
	n := dst.tnStream()
	ws := tnNewWebWritable(tnWebStrategy{hwm: 1})
	ws.writeFn = func(chunk interface{}) interface{} {
		ch := make(chan struct{})
		n.write(chunk, func(err interface{}) {
			if err != nil && !TnIsNil(err) {
				TnReject(ch, err)
				return
			}
			close(ch)
		})
		return ch
	}
	ws.closeFn = func() interface{} {
		ch := make(chan struct{})
		n.end(func() { close(ch) })
		return ch
	}
	ws.abortFn = func(reason interface{}) interface{} {
		n.destroy(reason)
		return nil
	}
	n.TnEventEmitter.once("error", func(err interface{}) { ws.fail(err) })
	ws.startWith(nil)
	return ws
}

// Writable.fromWeb(writableStream, options?)
func TnWritableFromWeb(ws *TnWritableStream, options ...interface{}) *TnStream {
	n := TnNewWritable(options...)
	writer := ws.getWriter()
	n.sink = func(chunk interface{}, done func(err interface{})) {
		tnWebWhen(writer.write(chunk), func(_ interface{}, reason interface{}, failed bool) {
			if failed {
				done(reason)
				return
			}
			done(nil)
		})
	}
	n.sinkFinal = func(done func(err interface{})) {
		tnWebWhen(writer.close(), func(_ interface{}, reason interface{}, failed bool) {
			if failed {
				done(reason)
				return
			}
			done(nil)
		})
	}
	return n
}

// Duplex.toWeb(duplex): { readable, writable }
func TnDuplexToWeb(d tnStreamLike) *TnTransformStream {
	return &TnTransformStream{readable: TnReadableToWeb(d), writable: TnWritableToWeb(d)}
}

// Duplex.fromWeb({ readable, writable }, options?)
func TnDuplexFromWeb(pair interface{}, options ...interface{}) *TnStream {
	var readable *TnReadableStream
	var writable *TnWritableStream
	if t, ok := pair.(*TnTransformStream); ok {
		readable, writable = t.readable, t.writable
	} else {
		readable, _ = TnGet(pair, "readable").(*TnReadableStream)
		writable, _ = TnGet(pair, "writable").(*TnWritableStream)
	}
	r := TnReadableFromWeb(readable, options...)
	w := TnWritableFromWeb(writable, options...)
	d := TnNewDuplex(options...)
	d.sink = w.sink
	d.sinkFinal = w.sinkFinal
	r.on("data", func(chunk interface{}) { d.push(chunk) })
	r.TnEventEmitter.once("end", func() { d.push(nil) })
	r.TnEventEmitter.once("error", func(err interface{}) { d.destroy(err) })
	d.hooks["_read"] = func(size float64) {}
	return d
}

// stream.compose(...streams): one Duplex writing into the first stream and
// reading from the last (web streams convert to Node streams)
func TnCompose(streams ...interface{}) *TnStream {
	nodes := []*TnStream{}
	for _, st := range streams {
		switch x := st.(type) {
		case tnStreamLike:
			nodes = append(nodes, x.tnStream())
		case *TnReadableStream:
			nodes = append(nodes, TnReadableFromWeb(x, map[string]interface{}{"objectMode": true}))
		case *TnWritableStream:
			nodes = append(nodes, TnWritableFromWeb(x, map[string]interface{}{"objectMode": true}))
		case *TnTransformStream:
			nodes = append(nodes, TnDuplexFromWeb(x, map[string]interface{}{"objectMode": true}))
		default:
			panic(tnWebTypeError("ERR_INVALID_ARG_VALUE", "The argument 'streams' must be streams"))
		}
	}
	if len(nodes) == 0 {
		panic(tnWebTypeError("ERR_MISSING_ARGS", "The \\"streams\\" argument must be specified"))
	}
	for i := 0; i+1 < len(nodes); i++ {
		TnPipe[tnStreamLike](nodes[i], nodes[i+1])
	}
	first, last := nodes[0], nodes[len(nodes)-1]
	d := TnNewDuplex(map[string]interface{}{"objectMode": true})
	d.readableSide = last.readableSide
	d.writableSide = first.writableSide
	if first.writableSide {
		d.sink = func(chunk interface{}, done func(err interface{})) {
			first.write(chunk, func(err interface{}) { done(err) })
		}
		d.sinkFinal = func(done func(err interface{})) {
			first.end()
			if last.readableSide {
				done(nil)
				return
			}
			last.TnEventEmitter.once("finish", func() { done(nil) })
		}
	}
	if last.readableSide {
		d.hooks["_read"] = func(size float64) {}
		last.on("data", func(chunk interface{}) { d.push(chunk) })
		last.TnEventEmitter.once("end", func() { d.push(nil) })
	}
	for _, n := range nodes {
		n.TnEventEmitter.once("error", func(err interface{}) { d.destroy(err) })
	}
	return d
}

// --- Blob / File ---

type TnBlob struct {
	data         []byte
	type_        string
	name         string
	lastModified float64
	isFile       bool
}

func tnBlobParts(parts interface{}) []byte {
	out := []byte{}
	if parts == nil || TnIsNil(parts) {
		return out
	}
	rv := reflect.ValueOf(parts)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array {
		panic(tnWebTypeError("ERR_INVALID_ARG_TYPE", "The \\"sources\\" argument must be a sequence"))
	}
	if b, ok := rv.Interface().([]byte); ok {
		return append(out, b...)
	}
	for i := 0; i < rv.Len(); i++ {
		switch x := rv.Index(i).Interface().(type) {
		case string:
			out = append(out, x...)
		case []byte:
			out = append(out, x...)
		case *TnBlob:
			out = append(out, x.data...)
		default:
			out = append(out, TnJSString(x)...)
		}
	}
	return out
}

func tnBlobType(options interface{}) string {
	t, _ := TnGet(options, "type").(string)
	for _, c := range t {
		if c < 0x20 || c > 0x7e {
			return ""
		}
	}
	return strings.ToLower(t)
}

// new Blob(parts?, { type })
func TnNewBlob(args ...interface{}) *TnBlob {
	b := &TnBlob{data: tnBlobParts(tnWebArg(args))}
	if len(args) > 1 && args[1] != nil {
		b.type_ = tnBlobType(args[1])
	}
	return b
}

// new File(parts, name, { type, lastModified })
func TnNewFile(parts interface{}, name string, options ...interface{}) *TnBlob {
	f := &TnBlob{data: tnBlobParts(parts), name: name, isFile: true, lastModified: float64(time.Now().UnixMilli())}
	if len(options) > 0 && options[0] != nil {
		f.type_ = tnBlobType(options[0])
		if n, ok := tnWebNumber(TnGet(options[0], "lastModified")); ok {
			f.lastModified = n
		}
	}
	return f
}

func (b *TnBlob) Get_size() float64         { return float64(len(b.data)) }
func (b *TnBlob) Get_type_() string         { return b.type_ }
func (b *TnBlob) Get_name() string          { return b.name }
func (b *TnBlob) Get_lastModified() float64 { return b.lastModified }

func (b *TnBlob) text() chan string {
	ch := make(chan string, 1)
	ch <- TnBufferToString(b.data, "utf8")
	return ch
}

func (b *TnBlob) bytes() chan []byte {
	ch := make(chan []byte, 1)
	ch <- append([]byte{}, b.data...)
	return ch
}

func (b *TnBlob) arrayBuffer() chan []byte { return b.bytes() }

func (b *TnBlob) stream() *TnReadableStream { return tnWebFromBytes(b.data) }

// slice(start?, end?, contentType?)
func (b *TnBlob) slice(args ...interface{}) *TnBlob {
	size := len(b.data)
	clamp := func(v interface{}, def int) int {
		n, ok := tnWebNumber(v)
		if !ok {
			return def
		}
		i := int(n)
		if i < 0 {
			i += size
			if i < 0 {
				i = 0
			}
		}
		if i > size {
			i = size
		}
		return i
	}
	start, end := 0, size
	if len(args) > 0 {
		start = clamp(args[0], 0)
	}
	if len(args) > 1 {
		end = clamp(args[1], size)
	}
	if end < start {
		end = start
	}
	out := &TnBlob{data: append([]byte{}, b.data[start:end]...)}
	if len(args) > 2 {
		out.type_ = tnBlobType(map[string]interface{}{"type": args[2]})
	}
	return out
}

// --- FormData ---

type tnFormEntry struct {
	name  string
	value interface{}
}

type TnFormData struct {
	entries_ []tnFormEntry
}

func TnNewFormData(args ...interface{}) *TnFormData { return &TnFormData{} }

// Blobs become Files (named "blob" unless a filename is given); other values strings
func tnFormValue(value interface{}, filename []string) interface{} {
	if b, ok := value.(*TnBlob); ok {
		name := b.name
		if !b.isFile {
			name = "blob"
		}
		if len(filename) > 0 {
			name = filename[0]
		}
		if b.isFile && name == b.name {
			return b
		}
		return &TnBlob{data: b.data, type_: b.type_, name: name, isFile: true, lastModified: float64(time.Now().UnixMilli())}
	}
	return TnJSString(value)
}

func (f *TnFormData) append(name string, value interface{}, filename ...string) {
	f.entries_ = append(f.entries_, tnFormEntry{name: name, value: tnFormValue(value, filename)})
}

func (f *TnFormData) set(name string, value interface{}, filename ...string) {
	entry := tnFormEntry{name: name, value: tnFormValue(value, filename)}
	out := []tnFormEntry{}
	replaced := false
	for _, e := range f.entries_ {
		if e.name != name {
			out = append(out, e)
		} else if !replaced {
			out = append(out, entry)
			replaced = true
		}
	}
	if !replaced {
		out = append(out, entry)
	}
	f.entries_ = out
}

func (f *TnFormData) get(name string) interface{} {
	for _, e := range f.entries_ {
		if e.name == name {
			return e.value
		}
	}
	return nil
}

func (f *TnFormData) getAll(name string) []interface{} {
	out := []interface{}{}
	for _, e := range f.entries_ {
		if e.name == name {
			out = append(out, e.value)
		}
	}
	return out
}

func (f *TnFormData) has(name string) bool {
	for _, e := range f.entries_ {
		if e.name == name {
			return true
		}
	}
	return false
}

func (f *TnFormData) delete(name string) {
	out := []tnFormEntry{}
	for _, e := range f.entries_ {
		if e.name != name {
			out = append(out, e)
		}
	}
	f.entries_ = out
}

func (f *TnFormData) entries() [][]interface{} {
	out := [][]interface{}{}
	for _, e := range f.entries_ {
		out = append(out, []interface{}{e.name, e.value})
	}
	return out
}

func (f *TnFormData) keys() []string {
	out := []string{}
	for _, e := range f.entries_ {
		out = append(out, e.name)
	}
	return out
}

func (f *TnFormData) values() []interface{} {
	out := []interface{}{}
	for _, e := range f.entries_ {
		out = append(out, e.value)
	}
	return out
}

func (f *TnFormData) forEach(fn interface{}) {
	for _, e := range f.entries_ {
		TnInvoke(fn, e.value, e.name, f)
	}
}

func (f *TnFormData) tnIterator() [][]interface{} { return f.entries() }

// multipart/form-data encoding; returns the body and its content type
func (f *TnFormData) encode() ([]byte, string) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for _, e := range f.entries_ {
		switch v := e.value.(type) {
		case *TnBlob:
			h := textproto.MIMEHeader{}
			h.Set("Content-Disposition", fmt.Sprintf("form-data; name=%q; filename=%q", e.name, v.name))
			ct := v.type_
			if ct == "" {
				ct = "application/octet-stream"
			}
			h.Set("Content-Type", ct)
			part, _ := w.CreatePart(h)
			part.Write(v.data)
		default:
			w.WriteField(e.name, TnJSString(v))
		}
	}
	w.Close()
	return buf.Bytes(), "multipart/form-data; boundary=" + w.Boundary()
}

// Parses a multipart/form-data or application/x-www-form-urlencoded body
func tnParseFormData(data []byte, contentType string) (*TnFormData, error) {
	f := &TnFormData{}
	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return nil, err
	}
	switch mediaType {
	case "multipart/form-data":
		r := multipart.NewReader(bytes.NewReader(data), params["boundary"])
		for {
			part, err := r.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				return nil, err
			}
			content, err := io.ReadAll(part)
			if err != nil {
				return nil, err
			}
			if part.FileName() != "" {
				ct := part.Header.Get("Content-Type")
				f.entries_ = append(f.entries_, tnFormEntry{name: part.FormName(), value: &TnBlob{data: content, type_: ct, name: part.FileName(), isFile: true, lastModified: float64(time.Now().UnixMilli())}})
			} else {
				f.entries_ = append(f.entries_, tnFormEntry{name: part.FormName(), value: string(content)})
			}
		}
	case "application/x-www-form-urlencoded":
		for _, pair := range strings.Split(string(data), "&") {
			if pair == "" {
				continue
			}
			k, v, _ := strings.Cut(pair, "=")
			k, _ = tnurl.QueryUnescape(k)
			v, _ = tnurl.QueryUnescape(v)
			f.entries_ = append(f.entries_, tnFormEntry{name: k, value: v})
		}
	default:
		return nil, fmt.Errorf("unsupported content type %s", mediaType)
	}
	return f, nil
}`;

// Parameter types of underlying source / sink / transformer methods
function sourceTypes(controller: string): Record<string, string[]> {
  return { start: [controller], pull: [controller], cancel: ['interface{}'] };
}

export function registerStreamWeb(r: NodeRegistry): void {
  defineModule(r, 'stream/web');
  r.namespaces['stream.web'] = 'stream/web';
  defineHelper(
    r,
    'nodeStreamWeb',
    ['bytes', 'compress/flate', 'compress/gzip', 'compress/zlib', 'fmt', 'io', 'mime', 'mime/multipart', 'net/textproto', 'reflect', 'strings', 'time', 'net/url'],
    ['nodeStream', 'nodeEvents', 'promise', 'eventLoop', 'dynamic', 'error', 'nodeInvoke', 'buffer', 'stringDecoder'],
    streamWebHelper
  );
  const use = () => r.helper('nodeStreamWeb');
  const web = (name: string) => `stream/web.${name}`;

  defineClass(r, web('ReadableStreamReadResult'), '*TnReadResult', 'class', '', 'value=interface{}; done=bool', '', '');
  defineClass(
    r,
    web('ReadableStream'),
    '*TnReadableStream',
    'class',
    'getReader=*TnReadableStreamDefaultReader; cancel=chan struct{}; tee=[]*TnReadableStream; pipeTo=chan struct{}; pipeThrough=*TnReadableStream; values=chan interface{}',
    '',
    'locked=bool',
    ''
  );
  r.iterators['*TnReadableStream'] = 'tnIterator';
  r.classes[web('ReadableStream')].methods['tnIterator'] = 'chan interface{}';
  defineClass(
    r,
    web('ReadableStreamDefaultReader'),
    '*TnReadableStreamDefaultReader',
    'class',
    'read=chan *TnReadResult; releaseLock=; cancel=chan struct{}',
    '',
    'closed=chan struct{}',
    ''
  );
  r.classes[web('ReadableStreamBYOBReader')] = r.classes[web('ReadableStreamDefaultReader')];
  defineClass(r, web('ReadableStreamDefaultController'), '*TnReadableStreamDefaultController', 'class', 'enqueue=; close=; error=', '', 'desiredSize=float64', '');
  r.classes[web('ReadableByteStreamController')] = r.classes[web('ReadableStreamDefaultController')];
  defineClass(r, web('WritableStream'), '*TnWritableStream', 'class', 'getWriter=*TnWritableStreamDefaultWriter; close=chan struct{}; abort=chan struct{}', '', 'locked=bool', '');
  defineClass(
    r,
    web('WritableStreamDefaultWriter'),
    '*TnWritableStreamDefaultWriter',
    'class',
    'write=chan struct{}; close=chan struct{}; abort=chan struct{}; releaseLock=',
    '',
    'ready=chan struct{}; closed=chan struct{}; desiredSize=float64',
    ''
  );
  defineClass(r, web('WritableStreamDefaultController'), '*TnWritableStreamDefaultController', 'class', 'error=', '', 'signal=*TnAbortSignal', '');
  defineClass(r, web('TransformStreamDefaultController'), '*TnTransformStreamDefaultController', 'class', 'enqueue=; error=; terminate=', '', 'desiredSize=float64', '');
  const transformCls = defineClass(
    r,
    web('TransformStream'),
    '*TnTransformStream',
    'class',
    '',
    'readable=*TnReadableStream; writable=*TnWritableStream; encoding=string; fatal=bool; ignoreBOM=bool',
    '',
    ''
  );
  for (const name of ['TextEncoderStream', 'TextDecoderStream', 'CompressionStream', 'DecompressionStream']) r.classes[web(name)] = transformCls;
  r.classByGoType['*TnTransformStream'] = web('TransformStream');
  const strategyCls = defineClass(r, web('CountQueuingStrategy'), '*TnQueuingStrategy', 'class', 'size=float64', 'highWaterMark=float64', '', '');
  r.classes[web('ByteLengthQueuingStrategy')] = strategyCls;

  const globals = [
    'ReadableStream',
    'ReadableStreamDefaultReader',
    'ReadableStreamBYOBReader',
    'ReadableStreamDefaultController',
    'ReadableByteStreamController',
    'WritableStream',
    'WritableStreamDefaultWriter',
    'WritableStreamDefaultController',
    'TransformStream',
    'TransformStreamDefaultController',
    'TextEncoderStream',
    'TextDecoderStream',
    'CompressionStream',
    'DecompressionStream',
    'CountQueuingStrategy',
    'ByteLengthQueuingStrategy'
  ];
  for (const name of globals) r.globals[name] = web(name);

  const ctor = (name: string, emit: (c: NodeCall) => string) => {
    r.constructors[web(name)] = (c: NodeCall) => {
      use();
      return emit(c);
    };
  };
  ctor('ReadableStream', (c: NodeCall) => `TnNewReadableStream(${c.args.join(', ')})`);
  ctor('WritableStream', (c: NodeCall) => `TnNewWritableStream(${c.args.join(', ')})`);
  ctor('TransformStream', (c: NodeCall) => `TnNewTransformStream(${c.args.join(', ')})`);
  ctor('TextEncoderStream', (_c: NodeCall) => 'TnNewTextEncoderStream()');
  ctor('TextDecoderStream', (c: NodeCall) => `TnNewTextDecoderStream(${c.args.join(', ')})`);
  ctor('CompressionStream', (c: NodeCall) => `TnNewCompressionStream(${c.args[0]})`);
  ctor('DecompressionStream', (c: NodeCall) => `TnNewDecompressionStream(${c.args[0]})`);
  ctor('CountQueuingStrategy', (c: NodeCall) => `TnNewQueuingStrategy(false, ${c.args[0] ?? 'nil'})`);
  ctor('ByteLengthQueuingStrategy', (c: NodeCall) => `TnNewQueuingStrategy(true, ${c.args[0] ?? 'nil'})`);
  ctor('ReadableStreamDefaultReader', (c: NodeCall) => `${c.args[0]}.getReader()`);
  ctor('ReadableStreamBYOBReader', (c: NodeCall) => `${c.args[0]}.getReader()`);
  ctor('WritableStreamDefaultWriter', (c: NodeCall) => `${c.args[0]}.getWriter()`);
  r.optionTypers[web('ReadableStream')] = (_n: any) => sourceTypes('*TnReadableStreamDefaultController');
  r.optionTypers[web('WritableStream')] = (_n: any) => ({
    start: ['*TnWritableStreamDefaultController'],
    write: ['interface{}', '*TnWritableStreamDefaultController'],
    close: [],
    abort: ['interface{}']
  });
  r.optionTypers[web('TransformStream')] = (_n: any) => ({
    start: ['*TnTransformStreamDefaultController'],
    transform: ['interface{}', '*TnTransformStreamDefaultController'],
    flush: ['*TnTransformStreamDefaultController'],
    cancel: ['interface{}']
  });
  r.functions[web('ReadableStream.from')] = (c: NodeCall) => {
    use();
    return `TnReadableStreamFrom(${c.args[0]})`;
  };
  r.results[web('ReadableStream.from')] = '*TnReadableStream';

  // Node stream bridges
  const bridge = (key: string, goName: string, result: string) => {
    r.functions[key] = (c: NodeCall) => {
      use();
      return `${goName}(${c.args.join(', ')})`;
    };
    r.results[key] = result;
  };
  bridge('stream.Readable.toWeb', 'TnReadableToWeb', '*TnReadableStream');
  bridge('stream.Readable.fromWeb', 'TnReadableFromWeb', '*TnStream');
  bridge('stream.Writable.toWeb', 'TnWritableToWeb', '*TnWritableStream');
  bridge('stream.Writable.fromWeb', 'TnWritableFromWeb', '*TnStream');
  bridge('stream.Duplex.toWeb', 'TnDuplexToWeb', '*TnTransformStream');
  bridge('stream.Duplex.fromWeb', 'TnDuplexFromWeb', '*TnStream');
  bridge('stream.compose', 'TnCompose', '*TnStream');

  // Blob / File (node:buffer and globals)
  const blobCls = defineClass(
    r,
    'buffer.Blob',
    '*TnBlob',
    'class',
    'text=chan string; bytes=chan []byte; arrayBuffer=chan []byte; slice=*TnBlob; stream=*TnReadableStream',
    '',
    'size=float64; type=string; name=string; lastModified=float64',
    ''
  );
  r.classes['buffer.File'] = blobCls;
  r.globals['Blob'] = 'buffer.Blob';
  r.globals['File'] = 'buffer.File';
  r.constructors['buffer.Blob'] = (c: NodeCall) => {
    use();
    return `TnNewBlob(${c.args.join(', ')})`;
  };
  r.constructors['buffer.File'] = (c: NodeCall) => {
    use();
    return `TnNewFile(${c.args.join(', ')})`;
  };

  // FormData (global)
  defineClass(
    r,
    'globals.FormData',
    '*TnFormData',
    'class',
    'append=; set=; get=interface{}; getAll=[]interface{}; has=bool; delete=; entries=[][]interface{}; keys=[]string; values=[]interface{}; forEach=',
    '',
    '',
    ''
  );
  r.iterators['*TnFormData'] = 'tnIterator';
  r.classes['globals.FormData'].methods['tnIterator'] = '[][]interface{}';
  r.paramTypers['globals.FormData#forEach'] = (_n: any[]) => ['interface{}', 'string', '*TnFormData'];
  r.globals['FormData'] = 'globals.FormData';
  r.constructors['globals.FormData'] = (c: NodeCall) => {
    use();
    return `TnNewFormData(${c.args.join(', ')})`;
  };
}
