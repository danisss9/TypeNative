// node:http / node:https — servers and clients on Go's net/http.
//
// Server: a net/http handler goroutine per request streams the body into an
// IncomingMessage (a Readable) and posts 'request' to the loop; the
// ServerResponse (a Writable) queues header / body / end operations that the
// handler goroutine applies, so the ResponseWriter is only touched there.
// Client: http.request returns a ClientRequest (a Writable); the request goes
// out on the first write or on end(), the response is an IncomingMessage.
// Like Node: no redirects are followed and bodies are not decompressed.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { STREAM_METHODS, STREAM_GETTERS, streamListenerTypes } from './stream.js';
import { SERVER_METHODS } from './net.js';
const httpHelper = `// node:http
var TnHttpMethods = []string{"ACL", "BIND", "CHECKOUT", "CONNECT", "COPY", "DELETE", "GET", "HEAD", "LINK", "LOCK", "M-SEARCH", "MERGE", "MKACTIVITY", "MKCALENDAR", "MKCOL", "MOVE", "NOTIFY", "OPTIONS", "PATCH", "POST", "PROPFIND", "PROPPATCH", "PURGE", "PUT", "QUERY", "REBIND", "REPORT", "SEARCH", "SOURCE", "SUBSCRIBE", "TRACE", "UNBIND", "UNLINK", "UNLOCK", "UNSUBSCRIBE"}

// http.STATUS_CODES
func TnHttpStatusCodes() *TnMap[float64, string] {
	m := TnNewMap[float64, string]()
	for code := 100; code < 600; code++ {
		if text := tnStatusText(code); text != "" {
			m.Set(float64(code), text)
		}
	}
	return m
}

// Node's reason phrases where they differ from Go's
func tnStatusText(code int) string {
	switch code {
	case 302:
		return "Found"
	case 413:
		return "Payload Too Large"
	case 414:
		return "URI Too Long"
	case 416:
		return "Range Not Satisfiable"
	case 418:
		return "I'm a Teapot"
	case 509:
		return "Bandwidth Limit Exceeded"
	}
	return http.StatusText(code)
}

// Name / value pairs of a dynamic object (records, object literals, maps)
func tnEntries(v interface{}) [][2]interface{} {
	out := [][2]interface{}{}
	if v == nil || TnIsNil(v) {
		return out
	}
	if withEntries, ok := v.(interface{ Entries() [][]interface{} }); ok {
		for _, e := range withEntries.Entries() {
			out = append(out, [2]interface{}{fmt.Sprint(e[0]), e[1]})
		}
		return out
	}
	switch m := v.(type) {
	case map[string]interface{}:
		keys := make([]string, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			out = append(out, [2]interface{}{k, m[k]})
		}
		return out
	case map[string]string:
		keys := make([]string, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			out = append(out, [2]interface{}{k, m[k]})
		}
		return out
	case [][]string:
		for _, pair := range m {
			if len(pair) == 2 {
				out = append(out, [2]interface{}{pair[0], pair[1]})
			}
		}
		return out
	case []string:
		for i := 0; i+1 < len(m); i += 2 {
			out = append(out, [2]interface{}{m[i], m[i+1]})
		}
		return out
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		sv := rv.Elem()
		for i := 0; i < sv.NumField(); i++ {
			f := sv.Field(i)
			name := sv.Type().Field(i).Name
			if tag := sv.Type().Field(i).Tag.Get("json"); tag != "" && tag != "-" {
				name = strings.Split(tag, ",")[0]
			}
			value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
			out = append(out, [2]interface{}{strings.TrimSuffix(name, "_"), value})
		}
	}
	return out
}

// Header values as strings: arrays become several values
func tnHeaderStrings(v interface{}) []string {
	switch x := v.(type) {
	case nil:
		return nil
	case string:
		return []string{x}
	case []string:
		return x
	case []interface{}:
		out := []string{}
		for _, item := range x {
			out = append(out, TnJSString(item))
		}
		return out
	}
	if n, ok := tnNetNumber(v); ok {
		return []string{strconv.FormatFloat(n, 'f', -1, 64)}
	}
	return []string{TnJSString(v)}
}

// Outgoing headers: case-insensitive, keeping the first spelling and the order
type tnHeaderStore struct {
	names  map[string]string
	values map[string]interface{}
	order  []string
}

func newTnHeaderStore() *tnHeaderStore {
	return &tnHeaderStore{names: map[string]string{}, values: map[string]interface{}{}}
}

func (h *tnHeaderStore) set(name string, value interface{}) {
	key := strings.ToLower(name)
	if _, ok := h.values[key]; !ok {
		h.order = append(h.order, key)
		h.names[key] = name
	}
	h.values[key] = value
}

func (h *tnHeaderStore) get(name string) interface{} { return h.values[strings.ToLower(name)] }

func (h *tnHeaderStore) has(name string) bool {
	_, ok := h.values[strings.ToLower(name)]
	return ok
}

func (h *tnHeaderStore) remove(name string) {
	key := strings.ToLower(name)
	if _, ok := h.values[key]; !ok {
		return
	}
	delete(h.values, key)
	delete(h.names, key)
	for i, k := range h.order {
		if k == key {
			h.order = append(h.order[:i], h.order[i+1:]...)
			break
		}
	}
}

func (h *tnHeaderStore) record() *TnMap[string, interface{}] {
	m := TnNewMap[string, interface{}]()
	for _, k := range h.order {
		m.Set(k, h.values[k])
	}
	return m
}

func (h *tnHeaderStore) keys() []string {
	return append([]string{}, h.order...)
}

func (h *tnHeaderStore) rawNames() []string {
	out := []string{}
	for _, k := range h.order {
		out = append(out, h.names[k])
	}
	return out
}

func (h *tnHeaderStore) toGo(dst http.Header) {
	for _, k := range h.order {
		name := h.names[k]
		dst.Del(name)
		for _, v := range tnHeaderStrings(h.values[k]) {
			dst[http.CanonicalHeaderKey(name)] = append(dst[http.CanonicalHeaderKey(name)], v)
		}
	}
}

func (h *tnHeaderStore) setAll(headers interface{}) {
	for _, e := range tnEntries(headers) {
		h.set(fmt.Sprint(e[0]), e[1])
	}
}

// http.IncomingMessage: a request on the server, a response on the client
type TnIncomingMessage struct {
	TnStream
	method           string
	url              string
	httpVersion      string
	httpVersionMajor float64
	httpVersionMinor float64
	headers          *TnMap[string, string]
	headersDistinct  *TnMap[string, []string]
	rawHeaders       []string
	trailers         *TnMap[string, string]
	statusCode       float64
	statusMessage    string
	complete         bool
	aborted          bool
	socket           *TnSocket
}

func (m *TnIncomingMessage) Get_socket() *TnSocket     { return m.socket }
func (m *TnIncomingMessage) Get_connection() *TnSocket { return m.socket }
func (m *TnIncomingMessage) setTimeout(ms float64, cb ...interface{}) *TnIncomingMessage {
	if m.socket != nil {
		m.socket.setTimeout(ms, cb...)
	}
	return m
}

// Headers as Node shows them: lower-case names, repeated values joined
func tnIncomingHeaders(m *TnIncomingMessage, h http.Header, host string, chunked bool) {
	m.headers = TnNewMap[string, string]()
	m.headersDistinct = TnNewMap[string, []string]()
	m.rawHeaders = []string{}
	add := func(name string, values []string) {
		key := strings.ToLower(name)
		for _, v := range values {
			m.rawHeaders = append(m.rawHeaders, name, v)
		}
		m.headersDistinct.Set(key, append([]string{}, values...))
		sep := ", "
		if key == "cookie" {
			sep = "; "
		}
		m.headers.Set(key, strings.Join(values, sep))
	}
	if host != "" {
		add("Host", []string{host})
	}
	names := make([]string, 0, len(h))
	for name := range h {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		add(name, h[name])
	}
	if chunked && !m.headers.Has("transfer-encoding") {
		add("Transfer-Encoding", []string{"chunked"})
	}
}

func tnNewIncoming() *TnIncomingMessage {
	m := &TnIncomingMessage{}
	m.TnStream = *TnNewReadable()
	m.tnSelf = m
	m.trailers = TnNewMap[string, string]()
	return m
}

// Read buffers of the body pumps (chunks are copied out of them)
var tnBodyBufs = sync.Pool{New: func() any { b := make([]byte, 32768); return &b }}

// Streams a body into the message on a goroutine; atEOF (optional) runs on the
// loop just before the end of the stream, done (off the loop) at the end
func tnPumpBody(body io.ReadCloser, m *TnIncomingMessage, atEOF func(), done func()) {
	go func() {
		defer done()
		defer body.Close()
		bp := tnBodyBufs.Get().(*[]byte)
		defer tnBodyBufs.Put(bp)
		for {
			n, err := body.Read(*bp)
			var chunk []byte
			if n > 0 {
				chunk = append([]byte{}, (*bp)[:n]...)
				if err == nil {
					tnLoopRunOrPost(func() {
						if !m.destroyed {
							m.push(chunk)
						}
					})
				}
			}
			if err != nil {
				// The last chunk usually comes with the EOF: one task for both
				tnLoopRunOrPost(func() {
					if m.destroyed {
						return
					}
					if chunk != nil {
						m.push(chunk)
					}
					if err == io.EOF {
						if atEOF != nil {
							atEOF()
						}
						m.complete = true
						m.push(nil)
						return
					}
					m.aborted = true
					m.destroy(TnNodeError("Error", "ECONNRESET", "aborted"))
				})
				return
			}
		}
	}()
}

// A socket that only reports addresses (requests and responses)
func tnInfoSocket(local net.Addr, remote string) *TnSocket {
	s := TnNewSocket()
	if host, port, err := net.SplitHostPort(remote); err == nil {
		s.remoteAddress, s.remoteFamily = host, tnFamily(host)
		if p, err := strconv.ParseFloat(port, 64); err == nil {
			s.remotePort = p
		}
	}
	if a := tnAddrInfo(local); a != nil && a.port >= 0 {
		s.localAddress, s.localPort = a.address, a.port
	}
	return s
}

// One operation of a response, applied by the handler goroutine
type tnResOp struct {
	status  int
	header  http.Header
	trailer http.Header
	data   []byte
	end    bool
	// Header ops: send the headers now (flushHeaders) instead of with the body
	flush  bool
	done   func(err error)
}

// http.ServerResponse
type TnServerResponse struct {
	TnStream
	statusCode    float64
	statusMessage string
	sendDate      bool
	headersSent   bool
	wroteData     bool
	store         *tnHeaderStore
	req           *TnIncomingMessage
	mu            sync.Mutex
	ops           []tnResOp
	signal        chan struct{}
	trailer       http.Header
	// end(chunk) is writing its chunk; endPosted: that write also ended the response
	lastWrite     bool
	endPosted     bool
}

func (res *TnServerResponse) Get_headersSent() bool       { return res.headersSent }
func (res *TnServerResponse) Get_req() *TnIncomingMessage { return res.req }
func (res *TnServerResponse) Get_socket() *TnSocket       { return res.req.socket }

// Queues an op without waking the handler goroutine (it goes out with the next post)
func (res *TnServerResponse) queue(op tnResOp) {
	res.mu.Lock()
	res.ops = append(res.ops, op)
	res.mu.Unlock()
}

func (res *TnServerResponse) post(op tnResOp) {
	res.queue(op)
	select {
	case res.signal <- struct{}{}:
	default:
	}
}

func (res *TnServerResponse) take() []tnResOp {
	res.mu.Lock()
	defer res.mu.Unlock()
	ops := res.ops
	res.ops = nil
	return ops
}

func (res *TnServerResponse) headerOp() tnResOp {
	h := http.Header{}
	res.store.toGo(h)
	if !res.sendDate {
		h["Date"] = nil
	}
	res.headersSent = true
	return tnResOp{status: int(res.statusCode), header: h}
}

func (res *TnServerResponse) setHeader(name string, value interface{}) *TnServerResponse {
	if res.headersSent {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot set headers after they are sent to the client"))
	}
	res.store.set(name, value)
	return res
}

func (res *TnServerResponse) setHeaders(headers interface{}) *TnServerResponse {
	for _, e := range tnEntries(headers) {
		res.setHeader(fmt.Sprint(e[0]), e[1])
	}
	return res
}

func (res *TnServerResponse) appendHeader(name string, value interface{}) *TnServerResponse {
	current := tnHeaderStrings(res.store.get(name))
	res.store.set(name, append(current, tnHeaderStrings(value)...))
	return res
}

// addTrailers(headers): sent after a chunked body (Node, too, sends them only
// without a Content-Length)
func (res *TnServerResponse) addTrailers(headers interface{}) {
	if res.trailer == nil {
		res.trailer = http.Header{}
	}
	for _, e := range tnEntries(headers) {
		for _, v := range tnHeaderStrings(e[1]) {
			res.trailer.Add(fmt.Sprint(e[0]), v)
		}
	}
}

func (res *TnServerResponse) getHeader(name string) interface{} { return res.store.get(name) }
func (res *TnServerResponse) getHeaders() *TnMap[string, interface{}] { return res.store.record() }
func (res *TnServerResponse) getHeaderNames() []string { return res.store.keys() }
func (res *TnServerResponse) hasHeader(name string) bool { return res.store.has(name) }
func (res *TnServerResponse) removeHeader(name string) { res.store.remove(name) }

// writeHead(status, [statusMessage], [headers])
func (res *TnServerResponse) writeHead(status float64, args ...interface{}) *TnServerResponse {
	if res.headersSent {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot write headers after they are sent to the client"))
	}
	res.statusCode = status
	for _, a := range args {
		if s, ok := a.(string); ok {
			res.statusMessage = s
		} else if a != nil {
			for _, e := range tnEntries(a) {
				res.store.set(fmt.Sprint(e[0]), e[1])
			}
		}
	}
	// As in Node, the headers go out with the first write or end()
	res.queue(res.headerOp())
	return res
}

func (res *TnServerResponse) flushHeaders() {
	if !res.headersSent {
		op := res.headerOp()
		op.flush = true
		res.post(op)
	}
}

func (res *TnServerResponse) writeContinue() {}

// end(data?): a body written in one piece gets a Content-Length, as in Node
func (res *TnServerResponse) end(args ...interface{}) *TnServerResponse {
	if !res.headersSent && !res.wroteData && !res.store.has("content-length") && !res.store.has("transfer-encoding") {
		size := 0
		if len(args) > 0 {
			switch d := args[0].(type) {
			case string:
				enc := ""
				if len(args) > 1 {
					enc, _ = args[1].(string)
				}
				if tnEncoding(enc) == "utf8" {
					size = len(d)
				} else {
					size = len(TnBufferFromString(d, enc))
				}
			case []byte:
				size = len(d)
			}
		}
		if res.req == nil || res.req.method != "HEAD" {
			res.store.set("Content-Length", strconv.Itoa(size))
		}
	}
	res.lastWrite = true
	res.TnStream.end(args...)
	return res
}

func (res *TnServerResponse) setTimeout(ms float64, cb ...interface{}) *TnServerResponse {
	res.req.setTimeout(ms, cb...)
	return res
}

func tnNewServerResponse(req *TnIncomingMessage) *TnServerResponse {
	res := &TnServerResponse{statusCode: 200, sendDate: true, store: newTnHeaderStore(), req: req, signal: make(chan struct{}, 1)}
	res.TnStream = *TnNewWritable()
	res.tnSelf = res
	res.sink = func(chunk interface{}, done func(err interface{})) {
		if !res.headersSent {
			res.queue(res.headerOp())
		}
		var data []byte
		switch c := chunk.(type) {
		case []byte:
			data = c
		case string:
			data = []byte(c)
		}
		res.wroteData = true
		// end(chunk)'s last chunk also ends the response: the handler goroutine
		// finishes without another round trip through the loop
		last := res.lastWrite && len(res.writeQueue) == 0
		if last {
			res.endPosted = true
		}
		res.post(tnResOp{data: data, end: last, trailer: res.trailer, done: func(err error) {
			TnLoopPost(func() {
				if err != nil {
					done(TnNetError(err, "write", "", -1))
				} else {
					done(nil)
				}
			})
		}})
	}
	res.sinkFinal = func(done func(err interface{})) {
		if res.endPosted {
			done(nil)
			return
		}
		if !res.headersSent {
			res.queue(res.headerOp())
		}
		res.post(tnResOp{end: true, trailer: res.trailer, done: func(err error) {
			TnLoopPost(func() { done(nil) })
		}})
	}
	return res
}

// http.Server: a net.Server whose connections are served by net/http
type TnHttpServer struct {
	TnNetServer
	httpServer     *http.Server
	tlsConfig      *tls.Config
	inFlight       sync.WaitGroup
	timeout        float64
	keepAliveTimeout float64
	headersTimeout float64
	requestTimeout float64
	maxHeadersCount interface{}
	// node:http2 servers (pseudo-headers, the 'stream' API)
	h2 bool
}

// Set by node:http2: serves an HTTP/2 request through the 'stream' API (false when not handled)
var tnHttp2StreamHook func(hs *TnHttpServer, w http.ResponseWriter, r *http.Request) bool

func (hs *TnHttpServer) Get_timeout() float64          { return hs.timeout }
func (hs *TnHttpServer) Set_timeout(v float64)         { hs.timeout = v }
func (hs *TnHttpServer) Get_keepAliveTimeout() float64 { return hs.keepAliveTimeout }
func (hs *TnHttpServer) Set_keepAliveTimeout(v float64) { hs.keepAliveTimeout = v }
func (hs *TnHttpServer) Get_headersTimeout() float64   { return hs.headersTimeout }
func (hs *TnHttpServer) Set_headersTimeout(v float64)  { hs.headersTimeout = v }
func (hs *TnHttpServer) Get_requestTimeout() float64   { return hs.requestTimeout }
func (hs *TnHttpServer) Set_requestTimeout(v float64)  { hs.requestTimeout = v }

func (hs *TnHttpServer) setTimeout(ms float64, cb ...interface{}) *TnHttpServer {
	hs.timeout = ms
	return hs
}

func (hs *TnHttpServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if hs.h2 && tnHttp2StreamHook != nil && tnHttp2StreamHook(hs, w, r) {
		return
	}
	TnLoopRef()
	defer TnLoopUnref()
	var local net.Addr
	if a, ok := r.Context().Value(http.LocalAddrContextKey).(net.Addr); ok {
		local = a
	}
	if r.ProtoMajor == 1 && hs.serveUpgrade(w, r, local) {
		return
	}
	http.NewResponseController(w).EnableFullDuplex()
	// The messages are created on the loop (streams capture its async context);
	// when it is idle, right here
	created := make(chan *TnServerResponse, 1)
	bodyDone := make(chan struct{})
	// A small body that comes with the headers (a Content-Length, no Expect:
	// 100-continue) is read here first, so the request needs no reader goroutine
	var small []byte
	var smallErr error
	if r.ProtoMajor == 1 && r.ContentLength > 0 && r.ContentLength <= 65536 && r.Header.Get("Expect") == "" {
		small = make([]byte, r.ContentLength)
		_, smallErr = io.ReadFull(r.Body, small)
		r.Body.Close()
	}
	tnLoopRunOrPost(func() {
		TnAsyncRun(hs.asyncCtx, func() {
			req := hs.incoming(r, local)
			req.socket = tnInfoSocket(local, r.RemoteAddr)
			if r.TLS != nil {
				req.socket.encrypted = true
			}
			res := tnNewServerResponse(req)
			created <- res
			hs.emit("request", req, res)
			if small != nil {
				if smallErr != nil {
					req.aborted = true
					req.destroy(TnNodeError("Error", "ECONNRESET", "aborted"))
				} else {
					req.push(small)
					req.complete = true
					req.push(nil)
				}
				close(bodyDone)
			} else if r.Body == nil || r.Body == http.NoBody {
				// No body: the request ends at once, without a reader goroutine
				req.complete = true
				req.push(nil)
				close(bodyDone)
			} else {
				tnPumpBody(r.Body, req, nil, func() { close(bodyDone) })
			}
		})
	})
	res := <-created
	req := res.req
	tnServeOps(w, r, res, func() {
		if !res.finished {
			req.aborted = true
			res.destroy()
		}
	}, bodyDone)
}

// The IncomingMessage of a request (on the loop)
func (hs *TnHttpServer) incoming(r *http.Request, local net.Addr) *TnIncomingMessage {
	req := tnNewIncoming()
	req.method = r.Method
	req.url = r.RequestURI
	req.httpVersion = strconv.Itoa(r.ProtoMajor) + "." + strconv.Itoa(r.ProtoMinor)
	req.httpVersionMajor, req.httpVersionMinor = float64(r.ProtoMajor), float64(r.ProtoMinor)
	tnIncomingHeaders(req, r.Header, r.Host, len(r.TransferEncoding) > 0 && r.TransferEncoding[0] == "chunked")
	if hs.h2 && r.ProtoMajor == 2 {
		tnPseudoHeaders(req, r)
	}
	return req
}

func tnHeaderHasToken(h http.Header, name string, token string) bool {
	for _, v := range h.Values(name) {
		for _, part := range strings.Split(v, ",") {
			if strings.EqualFold(strings.TrimSpace(part), token) {
				return true
			}
		}
	}
	return false
}

// 'connect' (CONNECT requests) and 'upgrade' (Connection: Upgrade) take over the
// connection: (req, socket, head). An upgrade nobody listens for is a normal request;
// a CONNECT nobody listens for closes the connection.
func (hs *TnHttpServer) serveUpgrade(w http.ResponseWriter, r *http.Request, local net.Addr) bool {
	event := ""
	if r.Method == http.MethodConnect {
		event = "connect"
	} else if r.Header.Get("Upgrade") != "" && tnHeaderHasToken(r.Header, "Connection", "upgrade") {
		event = "upgrade"
	}
	if event == "" {
		return false
	}
	listening := false
	TnLoopCall(func() { listening = hs.listenerCount(event) > 0 })
	if !listening {
		if event == "upgrade" {
			return false
		}
		if conn, _, err := http.NewResponseController(w).Hijack(); err == nil {
			conn.Close()
		}
		return true
	}
	conn, rw, err := http.NewResponseController(w).Hijack()
	if err != nil {
		return false
	}
	head := []byte{}
	if n := rw.Reader.Buffered(); n > 0 {
		peeked, _ := rw.Reader.Peek(n)
		head = append(head, peeked...)
	}
	TnLoopCall(func() {
		TnAsyncRun(hs.asyncCtx, func() {
			req := hs.incoming(r, local)
			req.complete = true
			req.push(nil)
			socket := TnNewSocket()
			socket.attach(conn)
			if r.TLS != nil {
				socket.encrypted = true
			}
			req.socket = socket
			hs.emit(event, req, socket, head)
		})
	})
	return true
}

// HTTP/2 requests carry :method / :scheme / :authority / :path first, as in Node
func tnPseudoHeaders(req *TnIncomingMessage, r *http.Request) {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	headers := TnNewMap[string, string]()
	headers.Set(":method", r.Method)
	headers.Set(":scheme", scheme)
	headers.Set(":authority", r.Host)
	headers.Set(":path", r.RequestURI)
	for k, v := range req.headers.All() {
		if k != "host" {
			headers.Set(k, v)
		}
	}
	req.headers = headers
}

// Applies a response's queued operations on the handler goroutine until it ends
// (or the client goes away: abort runs on the loop)
func tnServeOps(w http.ResponseWriter, r *http.Request, res *TnServerResponse, abort func(), bodyDone chan struct{}) {
	rc := http.NewResponseController(w)
	for {
		ended := false
		for _, op := range res.take() {
			switch {
			case op.header != nil:
				for k, v := range op.header {
					if v == nil {
						w.Header()[k] = nil
					} else {
						w.Header()[k] = v
					}
				}
				w.WriteHeader(op.status)
				if op.flush {
					rc.Flush()
				}
			case op.end:
				// end(chunk): its data goes out with the headers; net/http flushes
				// once the handler returns
				var err error
				if len(op.data) > 0 {
					_, err = w.Write(op.data)
				}
				for k, v := range op.trailer {
					w.Header()[http.TrailerPrefix+k] = v
				}
				ended = true
				op.done(err)
			default:
				_, err := w.Write(op.data)
				if err == nil {
					err = rc.Flush()
				}
				op.done(err)
			}
		}
		if ended {
			break
		}
		select {
		case <-res.signal:
		case <-r.Context().Done():
			TnLoopPost(abort)
			<-bodyDone
			return
		}
	}
	<-bodyDone
}

func TnNewHttpServer(secure bool, args ...interface{}) *TnHttpServer {
	hs := &TnHttpServer{keepAliveTimeout: 5000, headersTimeout: 60000, requestTimeout: 300000}
	hs.TnNetServer = *TnNewNetServer()
	hs.connectionEvent = "connection"
	for _, a := range args {
		if tnIsFunc(a) {
			hs.on("request", a)
		} else if a != nil && secure {
			cfg, err := tnTLSServerConfig(a)
			if err != nil {
				panic(err)
			}
			hs.tlsConfig = cfg
		}
	}
	hs.httpServer = &http.Server{Handler: hs, ErrorLog: log.New(io.Discard, "", 0)}
	hs.serve = func(ln net.Listener) {
		if hs.tlsConfig != nil {
			ln = tls.NewListener(ln, hs.tlsConfig)
		}
		hs.httpServer.IdleTimeout = time.Duration(hs.keepAliveTimeout * float64(time.Millisecond))
		hs.httpServer.Serve(ln)
	}
	return hs
}

// close(cb?): stops listening, closes idle connections, 'close' once requests finish
func (hs *TnHttpServer) close(cb ...interface{}) *TnHttpServer {
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		fn := cb[0]
		if hs.ln == nil {
			err := TnNodeError("Error", "ERR_SERVER_NOT_RUNNING", "Server is not running.")
			TnLoopPost(func() { TnInvoke(fn, err) })
		} else {
			hs.TnEventEmitter.once("close", func() { TnInvoke(fn, nil) })
		}
	}
	if hs.ln == nil {
		return hs
	}
	// Closing the listener first also covers a Serve that has not started yet
	hs.ln.Close()
	hs.ln = nil
	hs.listening = false
	TnLoopRef()
	go func() {
		hs.httpServer.Shutdown(context.Background())
		TnLoopPost(func() {
			defer TnLoopUnref()
			if hs.refd {
				hs.refd = false
				TnLoopUnref()
			}
			hs.emit("close")
		})
	}()
	return hs
}

func (hs *TnHttpServer) closeAllConnections() {
	if hs.httpServer != nil {
		hs.httpServer.Close()
	}
}

func (hs *TnHttpServer) closeIdleConnections() {
	if hs.httpServer != nil {
		hs.httpServer.SetKeepAlivesEnabled(false)
		hs.httpServer.SetKeepAlivesEnabled(true)
	}
}

func (hs *TnHttpServer) listen(args ...interface{}) *TnHttpServer {
	hs.TnNetServer.listen(args...)
	return hs
}

// --- client ---

// http.Agent: accepted for compatibility (Go's transport pools connections)
type TnHttpAgent struct {
	keepAlive  bool
	maxSockets float64
	options    interface{}
}

func TnNewHttpAgent(options ...interface{}) *TnHttpAgent {
	a := &TnHttpAgent{maxSockets: math.Inf(1)}
	if len(options) > 0 && options[0] != nil {
		a.options = options[0]
		a.keepAlive, _ = TnGet(options[0], "keepAlive").(bool)
		if n, ok := tnNetNumber(TnGet(options[0], "maxSockets")); ok {
			a.maxSockets = n
		}
	}
	return a
}

func (a *TnHttpAgent) destroy() {}

var tnHttpTransports sync.Map

func tnHttpTransport(cfg *tls.Config, key string) *http.Transport {
	if t, ok := tnHttpTransports.Load(key); ok {
		return t.(*http.Transport)
	}
	t := &http.Transport{
		Proxy:              nil,
		DisableCompression: true,
		TLSClientConfig:    cfg,
		ForceAttemptHTTP2:  false,
		IdleConnTimeout:    5 * time.Second,
	}
	tnHttpTransports.Store(key, t)
	return t
}

type TnClientRequest struct {
	TnStream
	method      string
	path        string
	host        string
	protocol    string
	port        string
	store       *tnHeaderStore
	started     bool
	aborted     bool
	gotResponse bool
	reusedSocket bool
	maxHeadersCount interface{}
	bodyWriter  *io.PipeWriter
	cancel      context.CancelFunc
	tlsConfig   *tls.Config
	tlsKey      string
	timeoutMs   float64
	timer       *time.Timer
	auth        string
	setHost     bool
	socketPath  string
	signal      *TnAbortSignal
	res         *TnIncomingMessage
}

func (cr *TnClientRequest) Get_headersSent() bool { return cr.started }
func (cr *TnClientRequest) Get_socket() *TnSocket  { return TnNewSocket() }

func (cr *TnClientRequest) setHeader(name string, value interface{}) *TnClientRequest {
	if cr.started {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot set headers after they are sent to the client"))
	}
	cr.store.set(name, value)
	return cr
}
func (cr *TnClientRequest) getHeader(name string) interface{} { return cr.store.get(name) }
func (cr *TnClientRequest) getHeaders() *TnMap[string, interface{}] { return cr.store.record() }
func (cr *TnClientRequest) getHeaderNames() []string { return cr.store.keys() }
func (cr *TnClientRequest) getRawHeaderNames() []string { return cr.store.rawNames() }
func (cr *TnClientRequest) hasHeader(name string) bool { return cr.store.has(name) }
func (cr *TnClientRequest) removeHeader(name string) { cr.store.remove(name) }
func (cr *TnClientRequest) flushHeaders() {}
func (cr *TnClientRequest) setNoDelay(args ...interface{}) {}
func (cr *TnClientRequest) setSocketKeepAlive(args ...interface{}) {}

func (cr *TnClientRequest) setTimeout(ms float64, cb ...interface{}) *TnClientRequest {
	cr.timeoutMs = ms
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		cr.TnEventEmitter.once("timeout", cb[0])
	}
	if cr.started {
		cr.armTimer()
	}
	return cr
}

func (cr *TnClientRequest) armTimer() {
	if cr.timer != nil {
		cr.timer.Stop()
	}
	if cr.timeoutMs <= 0 {
		return
	}
	cr.timer = time.AfterFunc(time.Duration(cr.timeoutMs*float64(time.Millisecond)), func() {
		TnLoopPost(func() {
			if !cr.destroyed && !cr.gotResponse {
				cr.emit("timeout")
			}
		})
	})
}

// destroy(err?): a request without a response fails with 'socket hang up', as in Node
func (cr *TnClientRequest) destroy(err ...interface{}) *TnClientRequest {
	if cr.destroyed {
		return cr
	}
	var e interface{}
	if len(err) > 0 && err[0] != nil && !TnIsNil(err[0]) {
		e = err[0]
	} else if !cr.gotResponse && !cr.aborted {
		e = TnNodeError("Error", "ECONNRESET", "socket hang up")
	}
	if e != nil {
		cr.TnStream.destroy(e)
	} else {
		cr.TnStream.destroy()
	}
	return cr
}

func (cr *TnClientRequest) abort() {
	cr.aborted = true
	cr.destroy()
}

// end(data?): a body sent in one piece gets a Content-Length, as in Node
func (cr *TnClientRequest) end(args ...interface{}) *TnClientRequest {
	if !cr.started && !cr.writeEnded {
		var body []byte
		var cb interface{}
		for i, a := range args {
			switch d := a.(type) {
			case string:
				if i == 0 {
					enc := ""
					if len(args) > 1 {
						enc, _ = args[1].(string)
					}
					body = TnBufferFromString(d, enc)
				}
			case []byte:
				if i == 0 {
					body = d
				}
			default:
				if tnIsFunc(a) {
					cb = a
				}
			}
		}
		if cb != nil {
			cr.TnEventEmitter.once("finish", cb)
		}
		cr.writeEnded = true
		cr.start(body, true)
		TnLoopPost(func() {
			cr.finished = true
			cr.emit("finish")
		})
		return cr
	}
	cr.TnStream.end(args...)
	return cr
}

// Sends the request: a complete body (end before any write) or a streamed one
// The body of a 101 response as a net.Conn (it reads and writes the connection)
type tnRWConn struct {
	io.ReadWriteCloser
	remote net.Addr
}

func (c *tnRWConn) LocalAddr() net.Addr                { return &net.TCPAddr{} }
func (c *tnRWConn) RemoteAddr() net.Addr               { return c.remote }
func (c *tnRWConn) SetDeadline(t time.Time) error      { return nil }
func (c *tnRWConn) SetReadDeadline(t time.Time) error  { return nil }
func (c *tnRWConn) SetWriteDeadline(t time.Time) error { return nil }

func tnUpgradedConn(rwc io.ReadWriteCloser, remote string) net.Conn {
	if conn, ok := rwc.(net.Conn); ok {
		return conn
	}
	addr, err := net.ResolveTCPAddr("tcp", remote)
	if err != nil {
		addr = &net.TCPAddr{}
	}
	return &tnRWConn{ReadWriteCloser: rwc, remote: addr}
}

// CONNECT requests: dialed and written by hand; any response is 'connect' (res, socket, head)
func (cr *TnClientRequest) startConnect() {
	address := net.JoinHostPort(cr.host, cr.port)
	header := http.Header{}
	cr.store.toGo(header)
	host := header.Get("Host")
	if host == "" {
		host = address
	}
	header.Del("Host")
	cfg := cr.tlsConfig
	TnLoopRef()
	cr.armTimer()
	go func() {
		var conn net.Conn
		var err error
		if cfg != nil {
			conn, err = tls.Dial("tcp", address, cfg)
		} else {
			conn, err = net.Dial("tcp", address)
		}
		var resp *http.Response
		var br *bufio.Reader
		if err == nil {
			var buf bytes.Buffer
			buf.WriteString("CONNECT " + cr.path + " HTTP/1.1\\r\\nHost: " + host + "\\r\\n")
			header.Write(&buf)
			buf.WriteString("\\r\\n")
			if _, err = conn.Write(buf.Bytes()); err == nil {
				br = bufio.NewReader(conn)
				resp, err = http.ReadResponse(br, &http.Request{Method: http.MethodConnect})
			}
		}
		TnLoopPost(func() {
			defer TnLoopUnref()
			if cr.timer != nil {
				cr.timer.Stop()
			}
			if err != nil {
				if conn != nil {
					conn.Close()
				}
				if !cr.destroyed {
					p, _ := strconv.ParseFloat(cr.port, 64)
					if _, ok := err.(*net.OpError); ok {
						cr.destroy(TnNetError(err, "connect", cr.host, p))
					} else {
						cr.destroy(TnNodeError("Error", "ECONNRESET", "socket hang up"))
					}
				}
				return
			}
			cr.gotResponse = true
			res := tnNewIncoming()
			cr.res = res
			res.statusCode = float64(resp.StatusCode)
			res.statusMessage = strings.TrimSpace(strings.TrimPrefix(resp.Status, strconv.Itoa(resp.StatusCode)))
			res.httpVersion = strconv.Itoa(resp.ProtoMajor) + "." + strconv.Itoa(resp.ProtoMinor)
			res.httpVersionMajor, res.httpVersionMinor = float64(resp.ProtoMajor), float64(resp.ProtoMinor)
			tnIncomingHeaders(res, resp.Header, "", false)
			res.complete = true
			res.push(nil)
			head := []byte{}
			if n := br.Buffered(); n > 0 {
				peeked, _ := br.Peek(n)
				head = append(head, peeked...)
			}
			if cr.listenerCount("connect") == 0 {
				conn.Close()
			} else {
				socket := TnNewSocket()
				socket.attach(conn)
				res.socket = socket
				cr.emit("connect", res, socket, head)
			}
			cr.closeHeld = false
			cr.emitClose()
		})
	}()
}

func (cr *TnClientRequest) start(body []byte, complete bool) {
	if cr.started {
		return
	}
	cr.started = true
	if cr.method == http.MethodConnect {
		cr.startConnect()
		return
	}
	scheme := strings.TrimSuffix(cr.protocol, ":")
	target := scheme + "://" + net.JoinHostPort(cr.host, cr.port) + cr.path
	ctx, cancel := context.WithCancel(context.Background())
	cr.cancel = cancel
	var reader io.Reader
	if complete {
		if len(body) > 0 || (cr.method != "GET" && cr.method != "HEAD" && cr.method != "DELETE" && cr.method != "OPTIONS") {
			reader = bytes.NewReader(body)
		}
	} else {
		pr, pw := io.Pipe()
		cr.bodyWriter = pw
		reader = pr
	}
	req, err := http.NewRequestWithContext(ctx, cr.method, target, reader)
	if err != nil {
		e := TnNodeError("TypeError", "ERR_INVALID_URL", "Invalid URL")
		TnLoopPost(func() { cr.destroy(e) })
		return
	}
	if reader == nil {
		req.Body = nil
		req.ContentLength = 0
	}
	cr.store.toGo(req.Header)
	if h := req.Header.Get("Host"); h != "" {
		req.Host = h
		req.Header.Del("Host")
	}
	if cl := req.Header.Get("Content-Length"); cl != "" {
		if n, err := strconv.ParseInt(cl, 10, 64); err == nil {
			req.ContentLength = n
		}
	} else if !complete {
		req.ContentLength = -1
	}
	if cr.auth != "" {
		parts := strings.SplitN(cr.auth, ":", 2)
		if len(parts) == 2 {
			req.SetBasicAuth(parts[0], parts[1])
		} else {
			req.SetBasicAuth(parts[0], "")
		}
	}
	if _, ok := req.Header["User-Agent"]; !ok {
		req.Header["User-Agent"] = nil
	}
	transport := tnHttpTransport(cr.tlsConfig, cr.tlsKey)
	if cr.socketPath != "" {
		path := cr.socketPath
		transport = &http.Transport{DisableCompression: true, DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			var d net.Dialer
			return d.DialContext(ctx, "unix", path)
		}}
	}
	client := &http.Client{Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	TnLoopRef()
	cr.armTimer()
	host, port := cr.host, cr.port
	go func() {
		resp, err := client.Do(req)
		TnLoopPost(func() {
			if cr.timer != nil {
				cr.timer.Stop()
			}
			if err != nil {
				defer TnLoopUnref()
				if cr.bodyWriter != nil {
					cr.bodyWriter.CloseWithError(err)
				}
				var e *TnError
				if te := tnUnwrapTnError(err); te != nil {
					e = te
				} else if cr.destroyed || errors.Is(err, context.Canceled) {
					if cr.signal != nil && cr.signal.aborted {
						e = tnAbortError("The operation was aborted", "AbortError")
					} else {
						e = TnNodeError("Error", "ECONNRESET", "socket hang up")
					}
				} else {
					var opErr *net.OpError
					if errors.As(err, &opErr) && opErr.Op == "dial" {
						target := host
						if ip := tnDialedIP(err); ip != "" {
							target = ip
						}
						p, _ := strconv.ParseFloat(port, 64)
						e = TnNetError(err, "connect", target, p)
					} else if code := tnNetCode(err); code == "ENOTFOUND" || code == "EAI_AGAIN" {
						e = tnDnsLookupError(err, host)
					} else {
						e = TnNodeError("Error", code, err.Error())
					}
				}
				if cr.destroyed {
					return
				}
				cr.destroy(e)
				return
			}
			cr.gotResponse = true
			res := tnNewIncoming()
			cr.res = res
			res.statusCode = float64(resp.StatusCode)
			res.statusMessage = strings.TrimSpace(strings.TrimPrefix(resp.Status, strconv.Itoa(resp.StatusCode)))
			res.httpVersion = strconv.Itoa(resp.ProtoMajor) + "." + strconv.Itoa(resp.ProtoMinor)
			res.httpVersionMajor, res.httpVersionMinor = float64(resp.ProtoMajor), float64(resp.ProtoMinor)
			chunked := len(resp.TransferEncoding) > 0 && resp.TransferEncoding[0] == "chunked"
			tnIncomingHeaders(res, resp.Header, "", chunked)
			if resp.ContentLength >= 0 && !res.headers.Has("content-length") && cr.method != "HEAD" {
				res.headers.Set("content-length", strconv.FormatInt(resp.ContentLength, 10))
			}
			res.socket = tnInfoSocket(nil, net.JoinHostPort(host, port))
			if resp.TLS != nil {
				res.socket.encrypted = true
				res.socket.authorized = true
			}
			if rwc, ok := resp.Body.(io.ReadWriteCloser); ok && resp.StatusCode == http.StatusSwitchingProtocols {
				// 'upgrade' (res, socket, head): the connection belongs to the listener
				defer TnLoopUnref()
				res.complete = true
				res.push(nil)
				if cr.listenerCount("upgrade") == 0 {
					rwc.Close()
				} else {
					socket := TnNewSocket()
					socket.attach(tnUpgradedConn(rwc, net.JoinHostPort(host, port)))
					cr.emit("upgrade", res, socket, []byte{})
				}
				cr.closeHeld = false
				cr.emitClose()
				return
			}
			if cr.listenerCount("response") > 0 {
				cr.emit("response", res)
			} else {
				res.resume()
			}
			// The trailers are read with the end of the body, before 'end'
			tnPumpBody(resp.Body, res, func() {
				for k, v := range resp.Trailer {
					res.trailers.Set(strings.ToLower(k), strings.Join(v, ", "))
				}
			}, func() {
				TnLoopPost(func() {
					defer TnLoopUnref()
					cr.closeHeld = false
					cr.emitClose()
				})
			})
		})
	}()
}

func tnDnsLookupError(err error, hostname string) *TnError {
	code := tnNetCode(err)
	e := TnNodeError("Error", code, "getaddrinfo "+code+" "+hostname)
	e.props["errno"] = tnNetErrnos[code]
	e.props["syscall"] = "getaddrinfo"
	e.props["hostname"] = hostname
	return e
}

func tnClientURL(cr *TnClientRequest, raw string) {
	u, err := tnurl.Parse(raw)
	if err != nil || u.Host == "" {
		panic(TnNodeError("TypeError", "ERR_INVALID_URL", "Invalid URL"))
	}
	cr.protocol = u.Scheme + ":"
	cr.host = u.Hostname()
	cr.port = u.Port()
	cr.path = u.RequestURI()
	if u.User != nil {
		cr.auth = u.User.String()
		if decoded, err := tnurl.PathUnescape(cr.auth); err == nil {
			cr.auth = decoded
		}
	}
}

// http.request(url | options, [options], [callback]) / https.request
func TnHttpRequest(secure bool, args ...interface{}) *TnClientRequest {
	cr := &TnClientRequest{method: "GET", path: "/", host: "localhost", protocol: "http:", store: newTnHeaderStore(), setHost: true}
	if secure {
		cr.protocol = "https:"
	}
	cr.TnStream = *TnNewWritable()
	cr.tnSelf = cr
	cr.closeHeld = true
	var options interface{}
	for _, a := range args {
		switch x := a.(type) {
		case string:
			tnClientURL(cr, x)
		case interface{ Get_href() string }:
			tnClientURL(cr, x.Get_href())
		default:
			if tnIsFunc(a) {
				cr.TnEventEmitter.once("response", a)
			} else if a != nil {
				options = a
			}
		}
	}
	insecure := false
	var ca []string
	if options != nil {
		if p := tnNetString(TnGet(options, "protocol")); p != "" {
			cr.protocol = p
		}
		if h := tnNetString(TnGet(options, "hostname")); h != "" {
			cr.host = h
		} else if h := tnNetString(TnGet(options, "host")); h != "" {
			cr.host = h
		}
		if n, ok := tnNetNumber(TnGet(options, "port")); ok {
			cr.port = strconv.FormatFloat(n, 'f', -1, 64)
		} else if s := tnNetString(TnGet(options, "port")); s != "" {
			cr.port = s
		}
		if p := tnNetString(TnGet(options, "path")); p != "" {
			cr.path = p
		}
		if m := tnNetString(TnGet(options, "method")); m != "" {
			cr.method = strings.ToUpper(m)
		}
		if a := tnNetString(TnGet(options, "auth")); a != "" {
			cr.auth = a
		}
		if sp := tnNetString(TnGet(options, "socketPath")); sp != "" {
			cr.socketPath = sp
		}
		if n, ok := tnNetNumber(TnGet(options, "timeout")); ok {
			cr.timeoutMs = n
		}
		cr.store.setAll(TnGet(options, "headers"))
		if b, ok := TnGet(options, "rejectUnauthorized").(bool); ok && !b {
			insecure = true
		}
		ca = tnPemStrings(TnGet(options, "ca"))
		if sig, ok := TnGet(options, "signal").(*TnAbortSignal); ok && sig != nil {
			cr.signal = sig
		}
	}
	if cr.port == "" {
		if cr.protocol == "https:" {
			cr.port = "443"
		} else {
			cr.port = "80"
		}
	}
	if cr.protocol == "https:" {
		cfg, err := tnTLSClientConfig(options, cr.host, nil)
		if err != nil {
			panic(err)
		}
		cr.tlsConfig = cfg
		servername := ""
		clientCert := ""
		if options != nil {
			servername = tnNetString(TnGet(options, "servername"))
			clientCert = tnPemString(TnGet(options, "cert"))
		}
		cr.tlsKey = fmt.Sprint("tls:", insecure, ":", cr.host, ":", servername, ":", strings.Join(ca, ""), ":", clientCert)
	}
	cr.sink = func(chunk interface{}, done func(err interface{})) {
		cr.start(nil, false)
		var data []byte
		switch c := chunk.(type) {
		case []byte:
			data = c
		case string:
			data = []byte(c)
		}
		w := cr.bodyWriter
		go func() {
			_, err := w.Write(data)
			TnLoopPost(func() {
				if err != nil {
					done(nil)
					return
				}
				done(nil)
			})
		}()
	}
	cr.sinkFinal = func(done func(err interface{})) {
		cr.start(nil, true)
		if cr.bodyWriter != nil {
			cr.bodyWriter.Close()
		}
		done(nil)
	}
	cr.onClose = func() {
		if cr.destroyed && !cr.gotResponse && cr.cancel != nil {
			cr.cancel()
		}
		if !cr.started {
			cr.started = true
		}
	}
	if cr.signal != nil {
		if cr.signal.aborted {
			reason := cr.signal.reason
			TnLoopPost(func() { cr.destroy(reason) })
		} else {
			cr.signal.addEventListener("abort", func(ev *TnEvent) {
				cr.destroy(tnAbortError("The operation was aborted", "AbortError"))
			})
		}
	}
	return cr
}

func TnHttpGet(secure bool, args ...interface{}) *TnClientRequest {
	cr := TnHttpRequest(secure, args...)
	cr.end()
	return cr
}`;
const CLIENT_REQUEST_METHODS = STREAM_METHODS.replace('end=*TnStream', 'end=*TnClientRequest').replace('destroy=*TnStream', 'destroy=*TnClientRequest') +
    '; setHeader=*TnClientRequest; getHeader=interface{}; getHeaders=*TnMap[string, interface{}]; getHeaderNames=[]string; getRawHeaderNames=[]string; hasHeader=bool; removeHeader=; flushHeaders=; setTimeout=*TnClientRequest; setNoDelay=; setSocketKeepAlive=; abort=';
const SERVER_RESPONSE_METHODS = STREAM_METHODS.replace('end=*TnStream', 'end=*TnServerResponse') +
    '; setHeader=*TnServerResponse; setHeaders=*TnServerResponse; appendHeader=*TnServerResponse; getHeader=interface{}; getHeaders=*TnMap[string, interface{}]; getHeaderNames=[]string; hasHeader=bool; removeHeader=; addTrailers=; writeHead=*TnServerResponse; flushHeaders=; writeContinue=; setTimeout=*TnServerResponse';
function eventName(nodes) {
    const event = nodes[0];
    return event && event.kind === 'StringLiteral' ? String(event.text) : '';
}
export function registerHttp(r) {
    defineModule(r, 'http');
    defineModule(r, 'https');
    defineHelper(r, 'nodeHttp', ['bufio', 'bytes', 'context', 'crypto/tls', 'errors', 'fmt', 'io', 'log', 'math', 'net', 'net/http', 'net/url', 'reflect', 'sort', 'strconv', 'strings', 'sync', 'time', 'unsafe'], ['nodeNet', 'netErrors', 'nodeStream', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'orderedMap', 'buffer', 'tlsConfig'], httpHelper);
    const use = () => r.helper('nodeHttp');
    defineClass(r, 'http.IncomingMessage', '*TnIncomingMessage', 'class', STREAM_METHODS + '; setTimeout=*TnIncomingMessage', 'method=string; url=string; httpVersion=string; httpVersionMajor=float64; httpVersionMinor=float64; headers=*TnMap[string, string]; headersDistinct=*TnMap[string, []string]; rawHeaders=[]string; trailers=*TnMap[string, string]; statusCode=float64; statusMessage=string; complete=bool; aborted=bool', STREAM_GETTERS + '; socket=*TnSocket; connection=*TnSocket', '');
    defineClass(r, 'http.ServerResponse', '*TnServerResponse', 'class', SERVER_RESPONSE_METHODS, 'statusCode=float64; statusMessage=string; sendDate=bool', STREAM_GETTERS + '; headersSent=bool; req=*TnIncomingMessage; socket=*TnSocket', '');
    defineClass(r, 'http.ClientRequest', '*TnClientRequest', 'class', CLIENT_REQUEST_METHODS, 'method=string; path=string; host=string; protocol=string; aborted=bool; reusedSocket=bool; maxHeadersCount=interface{}', STREAM_GETTERS + '; headersSent=bool; socket=*TnSocket', '');
    defineClass(r, 'http.Server', '*TnHttpServer', 'class', SERVER_METHODS.replace('listen=*TnNetServer', 'listen=*TnHttpServer').replace('close=*TnNetServer', 'close=*TnHttpServer') +
        '; setTimeout=*TnHttpServer; closeAllConnections=; closeIdleConnections=', 'maxHeadersCount=interface{}', 'listening=bool; maxConnections=float64; timeout=float64; keepAliveTimeout=float64; headersTimeout=float64; requestTimeout=float64', 'maxConnections; timeout; keepAliveTimeout; headersTimeout; requestTimeout');
    defineClass(r, 'http.Agent', '*TnHttpAgent', 'class', 'destroy=', 'keepAlive=bool; maxSockets=float64; options=interface{}', '', '');
    for (const name of ['IncomingMessage', 'ServerResponse', 'ClientRequest', 'Server', 'Agent']) {
        r.classes[`https.${name}`] = r.classes[`http.${name}`];
    }
    for (const cls of ['IncomingMessage', 'ServerResponse', 'ClientRequest']) {
        r.methods[`http.${cls}#pipe`] = (c) => {
            r.helper('nodeStream');
            return `TnPipe(${c.recv}, ${c.args.join(', ')})`;
        };
        r.typers[`http.${cls}#pipe`] = (c) => c.types[0] || '*TnStream';
    }
    r.paramTypers['http.IncomingMessage#on'] = streamListenerTypes;
    r.paramTypers['http.IncomingMessage#once'] = streamListenerTypes;
    r.paramTypers['http.ServerResponse#on'] = streamListenerTypes;
    r.paramTypers['http.ServerResponse#once'] = streamListenerTypes;
    const requestListeners = (nodes) => {
        const name = eventName(nodes);
        if (name === 'response')
            return ['*TnIncomingMessage'];
        if (name === 'socket')
            return ['*TnSocket'];
        if (name === 'upgrade' || name === 'connect')
            return ['*TnIncomingMessage', '*TnSocket', '[]byte'];
        return streamListenerTypes(nodes);
    };
    r.paramTypers['http.ClientRequest#on'] = requestListeners;
    r.paramTypers['http.ClientRequest#once'] = requestListeners;
    const serverListeners = (nodes) => {
        const name = eventName(nodes);
        if (name === 'request')
            return ['*TnIncomingMessage', '*TnServerResponse'];
        if (name === 'stream')
            return ['*TnHttp2Stream', '*TnMap[string, interface{}]', 'float64'];
        if (name === 'connection')
            return ['*TnSocket'];
        if (name === 'upgrade' || name === 'connect')
            return ['*TnIncomingMessage', '*TnSocket', '[]byte'];
        if (name === 'error' || name === 'clientError')
            return ['interface{}'];
        return [];
    };
    r.paramTypers['http.Server#on'] = serverListeners;
    r.paramTypers['http.Server#once'] = serverListeners;
    r.paramTypers['http.Server#close'] = (_n) => ['*TnError'];
    for (const mod of ['http', 'https']) {
        const secure = mod === 'https';
        r.functions[`${mod}.createServer`] = (c) => {
            use();
            return `TnNewHttpServer(${secure}${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
        };
        r.constructors[`${mod}.Server`] = r.functions[`${mod}.createServer`];
        r.paramTypers[`${mod}.createServer`] = (_n) => ['*TnIncomingMessage', '*TnServerResponse'];
        r.functions[`${mod}.request`] = (c) => {
            use();
            return `TnHttpRequest(${secure}, ${c.args.join(', ')})`;
        };
        r.functions[`${mod}.get`] = (c) => {
            use();
            return `TnHttpGet(${secure}, ${c.args.join(', ')})`;
        };
        r.paramTypers[`${mod}.request`] = (_n) => ['*TnIncomingMessage'];
        r.paramTypers[`${mod}.get`] = (_n) => ['*TnIncomingMessage'];
        r.constructors[`${mod}.Agent`] = (c) => {
            use();
            return `TnNewHttpAgent(${c.args.join(', ')})`;
        };
        r.values[`${mod}.globalAgent`] = (_c) => {
            use();
            return 'TnNewHttpAgent()';
        };
        r.valueTypes[`${mod}.globalAgent`] = '*TnHttpAgent';
        setResults(r, mod, 'createServer=*TnHttpServer; request=*TnClientRequest; get=*TnClientRequest');
    }
    r.values['http.METHODS'] = (_c) => {
        use();
        return 'TnHttpMethods';
    };
    r.valueTypes['http.METHODS'] = '[]string';
    r.values['http.STATUS_CODES'] = (_c) => {
        use();
        return 'TnHttpStatusCodes()';
    };
    r.valueTypes['http.STATUS_CODES'] = '*TnMap[float64, string]';
    r.values['http.maxHeaderSize'] = (_c) => '16384.0';
    r.valueTypes['http.maxHeaderSize'] = 'float64';
}
