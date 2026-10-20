// node:http2 on Go's net/http (HTTP/2 over TLS, and cleartext h2c with prior
// knowledge). Servers are http.Servers speaking HTTP/2: the 'stream' event
// hands out ServerHttp2Streams (respond / write / end, request headers with
// :method / :path / :scheme / :authority); without 'stream' listeners the
// compatibility 'request' API serves Http2ServerRequest / Response (the
// node:http objects). connect() returns a ClientHttp2Session whose request()
// streams are Duplexes emitting 'response' with :status. Frame-level features
// (push, ping, settings, goaway) are not exposed by Go's standard library.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { STREAM_METHODS, STREAM_GETTERS, streamListenerTypes } from './stream.js';
const http2Helper = `// node:http2
var tnHttp2NextID float64 = -1

type TnHttp2Session struct {
	TnEventEmitter
	origin       string
	transport    *http.Transport
	client       *http.Client
	encrypted    bool
	alpnProtocol string
	closed       bool
	destroyed    bool
	finished     bool
	refd         bool
	active       int
	nextID       float64
	socket       *TnSocket

	connectEmitted bool
}

func (s *TnHttp2Session) Get_closed() bool        { return s.closed }
func (s *TnHttp2Session) Get_destroyed() bool     { return s.destroyed }
func (s *TnHttp2Session) Get_encrypted() bool     { return s.encrypted }
func (s *TnHttp2Session) Get_alpnProtocol() string { return s.alpnProtocol }
func (s *TnHttp2Session) Get_socket() *TnSocket   { return s.socket }

func (s *TnHttp2Session) ref() *TnHttp2Session {
	if !s.refd && !s.finished {
		s.refd = true
		TnLoopRef()
	}
	return s
}

func (s *TnHttp2Session) unref() *TnHttp2Session {
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	return s
}

func (s *TnHttp2Session) setTimeout(ms float64, cb ...interface{}) *TnHttp2Session { return s }

// 'connect' fires once, when the session's first connection is up; guarded on
// the loop so the eager probe dial and the transport's own dials can both call
// it without racing
func (s *TnHttp2Session) emitConnect(conn net.Conn) {
	TnLoopPost(func() {
		if s.connectEmitted || s.destroyed {
			return
		}
		s.connectEmitted = true
		s.socket = tnInfoSocket(conn.LocalAddr(), conn.RemoteAddr().String())
		s.socket.encrypted = s.encrypted
		s.emit("connect", s, s.socket)
	})
}

func (s *TnHttp2Session) maybeFinish() {
	if !s.closed || s.active > 0 || s.finished {
		return
	}
	s.finished = true
	if s.transport != nil {
		s.transport.CloseIdleConnections()
	}
	s.unref()
	TnLoopPost(func() { s.emit("close") })
}

// close(cb?): no new streams; 'close' once the open ones finish
func (s *TnHttp2Session) close(cb ...interface{}) {
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		s.TnEventEmitter.once("close", cb[0])
	}
	s.closed = true
	s.maybeFinish()
}

func (s *TnHttp2Session) destroy(err ...interface{}) {
	if s.destroyed {
		return
	}
	s.destroyed = true
	s.closed = true
	if len(err) > 0 && err[0] != nil && !TnIsNil(err[0]) {
		e := err[0]
		TnLoopPost(func() { s.emit("error", e) })
	}
	s.active = 0
	s.maybeFinish()
}

func (s *TnHttp2Session) streamDone() {
	s.active--
	s.maybeFinish()
}

// connect(authority, options?, listener?)
func TnHttp2Connect(authority interface{}, args ...interface{}) *TnHttp2Session {
	var opts, listener interface{}
	for _, a := range args {
		if tnIsFunc(a) {
			listener = a
		} else if a != nil {
			opts = a
		}
	}
	raw := ""
	switch x := authority.(type) {
	case string:
		raw = x
	case interface{ Get_href() string }:
		raw = x.Get_href()
	default:
		raw = TnJSString(authority)
	}
	u, err := tnurl.Parse(raw)
	if err != nil || u.Host == "" {
		panic(TnNodeError("TypeError", "ERR_INVALID_URL", "Invalid URL"))
	}
	s := &TnHttp2Session{origin: u.Scheme + "://" + u.Host}
	protocols := new(http.Protocols)
	t := &http.Transport{Proxy: nil, DisableCompression: true, IdleConnTimeout: 30 * time.Second}
	port := u.Port()
	if u.Scheme == "https" {
		cfg, err := tnTLSClientConfig(opts, u.Hostname(), nil)
		if err != nil {
			panic(err)
		}
		t.TLSClientConfig = cfg
		protocols.SetHTTP2(true)
		s.encrypted = true
		s.alpnProtocol = "h2"
		if port == "" {
			port = "443"
		}
	} else {
		protocols.SetUnencryptedHTTP2(true)
		s.alpnProtocol = "h2c"
		if port == "" {
			port = "80"
		}
	}
	t.Protocols = protocols
	s.transport = t
	s.client = &http.Client{Transport: t, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	// The transport dials through here (https too, there is no custom DialTLS),
	// so 'connect' is posted before that request's response can be
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	t.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
		conn, err := dialer.DialContext(ctx, network, addr)
		if err != nil {
			return nil, err
		}
		s.emitConnect(conn)
		return conn, nil
	}
	if listener != nil {
		s.TnEventEmitter.once("connect", listener)
	}
	s.ref()
	host := u.Hostname()
	go func() {
		conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), 10*time.Second)
		TnLoopPost(func() {
			if err != nil {
				if s.connectEmitted || s.destroyed {
					return
				}
				p, _ := strconv.ParseFloat(port, 64)
				target := host
				if ip := tnDialedIP(err); ip != "" {
					target = ip
				}
				s.destroy(TnNetError(err, "connect", target, p))
				return
			}
			s.emitConnect(conn)
			conn.Close()
		})
	}()
	return s
}

// An Http2Stream: a Duplex (server: request body in, response out; client: the reverse)
type TnHttp2Stream struct {
	TnStream
	id          float64
	res         *TnServerResponse
	session     *TnHttp2Session
	sentHeaders *TnMap[string, interface{}]
	headersSent bool
	rstCode     float64
	method      string
	path        string
	reqHeaders  http.Header
	body        []byte
	started     bool
}

func (st *TnHttp2Stream) Get_id() float64                          { return st.id }
func (st *TnHttp2Stream) Get_session() *TnHttp2Session             { return st.session }
func (st *TnHttp2Stream) Get_sentHeaders() *TnMap[string, interface{}] { return st.sentHeaders }
func (st *TnHttp2Stream) Get_headersSent() bool                    { return st.headersSent }
func (st *TnHttp2Stream) Get_pushAllowed() bool                    { return false }
func (st *TnHttp2Stream) Get_endAfterHeaders() bool                { return false }
func (st *TnHttp2Stream) Get_rstCode() float64                     { return st.rstCode }
func (st *TnHttp2Stream) Get_aborted() bool                        { return st.destroyed && !st.finished }

func tnNewHttp2Stream() *TnHttp2Stream {
	st := &TnHttp2Stream{}
	st.TnStream = *TnNewDuplex()
	st.tnSelf = st
	return st
}

// Body bytes into a stream's readable side, on a goroutine
func tnPumpHttp2(body io.ReadCloser, s *TnStream, done func()) {
	go func() {
		defer done()
		defer body.Close()
		buf := make([]byte, 32768)
		for {
			n, err := body.Read(buf)
			if n > 0 {
				chunk := append([]byte{}, buf[:n]...)
				TnLoopPost(func() {
					if !s.destroyed {
						s.push(chunk)
					}
				})
			}
			if err != nil {
				TnLoopPost(func() {
					if s.destroyed {
						return
					}
					if err == io.EOF {
						s.push(nil)
						return
					}
					s.destroy(TnNodeError("Error", "ERR_HTTP2_STREAM_ERROR", "Stream closed with error code NGHTTP2_INTERNAL_ERROR"))
				})
				return
			}
		}
	}()
}

func tnHttp2Bytes(chunk interface{}) []byte {
	switch c := chunk.(type) {
	case []byte:
		return c
	case string:
		return []byte(c)
	}
	return []byte(TnJSString(chunk))
}

// Request / response headers as Node shows them (lower-case, joined values)
func tnHttp2Headers(h http.Header, m *TnMap[string, interface{}]) {
	names := make([]string, 0, len(h))
	for name := range h {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		key := strings.ToLower(name)
		if key == "set-cookie" {
			values := []interface{}{}
			for _, v := range h[name] {
				values = append(values, v)
			}
			m.Set(key, values)
			continue
		}
		sep := ", "
		if key == "cookie" {
			sep = "; "
		}
		m.Set(key, strings.Join(h[name], sep))
	}
}

// respond(headers?, { endStream })
func (st *TnHttp2Stream) respond(args ...interface{}) {
	if st.res == nil {
		panic(TnNodeError("Error", "ERR_HTTP2_INVALID_STREAM", "The stream has been destroyed"))
	}
	if st.headersSent {
		panic(TnNodeError("Error", "ERR_HTTP2_HEADERS_SENT", "Response has already been initiated."))
	}
	status := 200
	sent := TnNewMap[string, interface{}]()
	sent.Set(":status", float64(200))
	if len(args) > 0 && args[0] != nil {
		for _, e := range tnEntries(args[0]) {
			name := strings.ToLower(fmt.Sprint(e[0]))
			if name == ":status" {
				if n, ok := tnNetNumber(e[1]); ok {
					status = int(n)
					sent.Set(":status", n)
				}
				continue
			}
			if strings.HasPrefix(name, ":") {
				continue
			}
			st.res.store.set(name, e[1])
			sent.Set(name, e[1])
		}
	}
	st.res.statusCode = float64(status)
	st.res.post(st.res.headerOp())
	st.headersSent = true
	st.sentHeaders = sent
	if len(args) > 1 && args[1] != nil {
		if end, _ := TnGet(args[1], "endStream").(bool); end {
			st.end()
		}
	}
}

// respondWithFile(path, headers?, options?)
func (st *TnHttp2Stream) respondWithFile(path string, args ...interface{}) {
	data, err := os.ReadFile(path)
	if err != nil {
		e := TnSysError(err, "open", path)
		TnLoopPost(func() { st.destroy(e) })
		return
	}
	headers := TnNewMap[string, interface{}]()
	if len(args) > 0 && args[0] != nil {
		for _, e := range tnEntries(args[0]) {
			headers.Set(fmt.Sprint(e[0]), e[1])
		}
	}
	if !headers.Has("content-length") {
		headers.Set("content-length", strconv.Itoa(len(data)))
	}
	st.respond(headers)
	st.end(data)
}

func (st *TnHttp2Stream) close(code ...interface{}) {
	if len(code) > 0 {
		st.rstCode, _ = tnNetNumber(code[0])
	}
	st.destroy()
}

func (st *TnHttp2Stream) pushStream(args ...interface{}) {
	err := TnNodeError("Error", "ERR_HTTP2_PUSH_DISABLED", "HTTP/2 client has disabled push streams")
	for _, a := range args {
		if tnIsFunc(a) {
			TnLoopPost(func() { TnInvoke(a, err) })
			return
		}
	}
}

func (st *TnHttp2Stream) additionalHeaders(headers interface{}) {}

// The server side: one stream per request
func tnHttp2ServeStream(hs *TnHttpServer, w http.ResponseWriter, r *http.Request) bool {
	if r.ProtoMajor != 2 || hs.listenerCount("stream") == 0 {
		return false
	}
	TnLoopRef()
	defer TnLoopUnref()
	http.NewResponseController(w).EnableFullDuplex()
	var local net.Addr
	if a, ok := r.Context().Value(http.LocalAddrContextKey).(net.Addr); ok {
		local = a
	}
	created := make(chan *TnHttp2Stream, 1)
	bodyDone := make(chan struct{})
	TnLoopPost(func() {
		TnAsyncRun(hs.asyncCtx, func() {
			req := tnNewIncoming()
			req.method = r.Method
			req.socket = tnInfoSocket(local, r.RemoteAddr)
			st := tnNewHttp2Stream()
			st.res = tnNewServerResponse(req)
			tnHttp2NextID += 2
			st.id = tnHttp2NextID
			st.session = &TnHttp2Session{socket: req.socket, encrypted: r.TLS != nil, alpnProtocol: "h2c"}
			if r.TLS != nil {
				st.session.alpnProtocol = "h2"
				req.socket.encrypted = true
			}
			st.sink = func(chunk interface{}, done func(err interface{})) {
				if !st.headersSent {
					st.respond()
				}
				st.res.post(tnResOp{data: tnHttp2Bytes(chunk), done: func(err error) {
					TnLoopPost(func() {
						if err != nil {
							done(TnNetError(err, "write", "", -1))
						} else {
							done(nil)
						}
					})
				}})
			}
			st.sinkFinal = func(done func(err interface{})) {
				if !st.headersSent {
					st.respond()
				}
				st.res.post(tnResOp{end: true, done: func(err error) {
					TnLoopPost(func() { done(nil) })
				}})
			}
			scheme := "http"
			if r.TLS != nil {
				scheme = "https"
			}
			headers := TnNewMap[string, interface{}]()
			headers.Set(":method", r.Method)
			headers.Set(":scheme", scheme)
			headers.Set(":authority", r.Host)
			headers.Set(":path", r.RequestURI)
			tnHttp2Headers(r.Header, headers)
			created <- st
			hs.emit("stream", st, headers, float64(4))
			tnPumpHttp2(r.Body, &st.TnStream, func() { close(bodyDone) })
		})
	})
	st := <-created
	tnServeOps(w, r, st.res, func() {
		if !st.finished {
			st.destroy()
		}
	}, bodyDone)
	return true
}

func init() { tnHttp2StreamHook = tnHttp2ServeStream }

// createServer(options?, onRequest?) / createSecureServer({ key, cert, allowHTTP1 }, onRequest?)
func TnHttp2CreateServer(secure bool, args ...interface{}) *TnHttpServer {
	hs := TnNewHttpServer(secure, args...)
	hs.h2 = true
	protocols := new(http.Protocols)
	if secure {
		protocols.SetHTTP2(true)
		allowHTTP1 := false
		for _, a := range args {
			if a != nil && !tnIsFunc(a) {
				allowHTTP1, _ = TnGet(a, "allowHTTP1").(bool)
			}
		}
		if hs.tlsConfig == nil {
			hs.tlsConfig = &tls.Config{}
		}
		hs.tlsConfig.NextProtos = []string{"h2"}
		if allowHTTP1 {
			protocols.SetHTTP1(true)
			hs.tlsConfig.NextProtos = append(hs.tlsConfig.NextProtos, "http/1.1")
		}
	} else {
		protocols.SetUnencryptedHTTP2(true)
	}
	hs.httpServer.Protocols = protocols
	return hs
}

// session.request(headers, { endStream })
func (s *TnHttp2Session) request(headers interface{}, options ...interface{}) *TnHttp2Stream {
	if s.closed || s.destroyed {
		panic(TnNodeError("Error", "ERR_HTTP2_INVALID_SESSION", "The session has been destroyed"))
	}
	st := tnNewHttp2Stream()
	st.session = s
	st.method = "GET"
	st.path = "/"
	st.reqHeaders = http.Header{}
	s.nextID += 2
	if s.nextID == 2 {
		s.nextID = 1
	}
	st.id = s.nextID
	for _, e := range tnEntries(headers) {
		name := strings.ToLower(fmt.Sprint(e[0]))
		switch name {
		case ":method":
			st.method = strings.ToUpper(TnJSString(e[1]))
		case ":path":
			st.path = TnJSString(e[1])
		case ":authority", ":scheme":
		default:
			for _, v := range tnHeaderStrings(e[1]) {
				st.reqHeaders.Add(name, v)
			}
		}
	}
	s.active++
	st.sink = func(chunk interface{}, done func(err interface{})) {
		st.body = append(st.body, tnHttp2Bytes(chunk)...)
		done(nil)
	}
	st.sinkFinal = func(done func(err interface{})) {
		st.start()
		done(nil)
	}
	endStream := false
	if len(options) > 0 && options[0] != nil {
		endStream, _ = TnGet(options[0], "endStream").(bool)
	}
	// Requests without a body go out right away, as Node sends their headers at once
	if endStream || st.method == "GET" || st.method == "HEAD" {
		TnLoopPost(st.start)
		if endStream {
			st.end()
		}
	}
	return st
}

func (st *TnHttp2Stream) start() {
	if st.started {
		return
	}
	st.started = true
	s := st.session
	var body io.Reader
	if len(st.body) > 0 {
		body = bytes.NewReader(st.body)
	}
	req, err := http.NewRequest(st.method, s.origin+st.path, body)
	if err != nil {
		st.destroy(TnNodeError("TypeError", "ERR_INVALID_URL", "Invalid URL"))
		s.streamDone()
		return
	}
	for k, v := range st.reqHeaders {
		req.Header[http.CanonicalHeaderKey(k)] = v
	}
	if _, ok := req.Header["User-Agent"]; !ok {
		req.Header["User-Agent"] = nil
	}
	TnLoopRef()
	go func() {
		resp, err := s.client.Do(req)
		TnLoopPost(func() {
			defer TnLoopUnref()
			if err != nil {
				// A connection failure errors the session; its pending streams are canceled
				var e *TnError
				if te := tnUnwrapTnError(err); te != nil {
					e = te
				} else {
					e = TnNodeError("Error", tnNetCode(err), err.Error())
				}
				cancel := TnNodeError("Error", "ERR_HTTP2_STREAM_CANCEL", "The pending stream has been canceled (caused by: "+e.message+")")
				cancel.props["cause"] = e
				st.destroy(cancel)
				s.destroy(e)
				return
			}
			headers := TnNewMap[string, interface{}]()
			headers.Set(":status", float64(resp.StatusCode))
			tnHttp2Headers(resp.Header, headers)
			st.emit("response", headers, float64(4))
			TnLoopRef()
			tnPumpHttp2(resp.Body, &st.TnStream, func() {
				TnLoopPost(func() {
					defer TnLoopUnref()
					if len(resp.Trailer) > 0 {
						trailers := TnNewMap[string, interface{}]()
						tnHttp2Headers(resp.Trailer, trailers)
						st.emit("trailers", trailers, float64(4))
					}
					s.streamDone()
				})
			})
		})
	}()
}

func TnHttp2DefaultSettings() map[string]interface{} {
	return map[string]interface{}{
		"headerTableSize":       float64(4096),
		"enablePush":            true,
		"initialWindowSize":     float64(65535),
		"maxFrameSize":          float64(16384),
		"maxConcurrentStreams":  float64(4294967295),
		"maxHeaderListSize":     float64(65535),
		"enableConnectProtocol": false,
	}
}`;
const HTTP2_CONSTANTS = {
    HTTP2_HEADER_STATUS: ':status',
    HTTP2_HEADER_METHOD: ':method',
    HTTP2_HEADER_AUTHORITY: ':authority',
    HTTP2_HEADER_SCHEME: ':scheme',
    HTTP2_HEADER_PATH: ':path',
    HTTP2_HEADER_CONTENT_TYPE: 'content-type',
    HTTP2_HEADER_CONTENT_LENGTH: 'content-length',
    HTTP2_HEADER_ACCEPT: 'accept',
    HTTP2_HEADER_USER_AGENT: 'user-agent',
    HTTP2_HEADER_COOKIE: 'cookie',
    HTTP2_HEADER_SET_COOKIE: 'set-cookie',
    HTTP2_HEADER_LOCATION: 'location',
    HTTP2_METHOD_GET: 'GET',
    HTTP2_METHOD_POST: 'POST',
    HTTP2_METHOD_PUT: 'PUT',
    HTTP2_METHOD_DELETE: 'DELETE',
    HTTP2_METHOD_HEAD: 'HEAD',
    HTTP2_METHOD_PATCH: 'PATCH',
    HTTP2_METHOD_OPTIONS: 'OPTIONS'
};
const HTTP2_NUMBERS = {
    NGHTTP2_NO_ERROR: 0,
    NGHTTP2_PROTOCOL_ERROR: 1,
    NGHTTP2_INTERNAL_ERROR: 2,
    NGHTTP2_CANCEL: 8,
    HTTP_STATUS_OK: 200,
    HTTP_STATUS_CREATED: 201,
    HTTP_STATUS_NO_CONTENT: 204,
    HTTP_STATUS_MOVED_PERMANENTLY: 301,
    HTTP_STATUS_FOUND: 302,
    HTTP_STATUS_NOT_MODIFIED: 304,
    HTTP_STATUS_BAD_REQUEST: 400,
    HTTP_STATUS_UNAUTHORIZED: 401,
    HTTP_STATUS_FORBIDDEN: 403,
    HTTP_STATUS_NOT_FOUND: 404,
    HTTP_STATUS_METHOD_NOT_ALLOWED: 405,
    HTTP_STATUS_INTERNAL_SERVER_ERROR: 500,
    HTTP_STATUS_SERVICE_UNAVAILABLE: 503
};
export function registerHttp2(r) {
    defineModule(r, 'http2');
    defineHelper(r, 'nodeHttp2', ['bytes', 'context', 'crypto/tls', 'fmt', 'io', 'net', 'net/http', 'net/url', 'os', 'sort', 'strconv', 'strings', 'time'], ['nodeHttp', 'nodeNet', 'netErrors', 'nodeStream', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'orderedMap', 'tlsConfig', 'fsErrors'], http2Helper);
    const use = () => r.helper('nodeHttp2');
    defineClass(r, 'http2.Http2Stream', '*TnHttp2Stream', 'class', STREAM_METHODS + '; respond=; respondWithFile=; close=; pushStream=; additionalHeaders=', '', STREAM_GETTERS + '; id=float64; session=*TnHttp2Session; sentHeaders=*TnMap[string, interface{}]; headersSent=bool; pushAllowed=bool; endAfterHeaders=bool; rstCode=float64; aborted=bool', '');
    for (const name of ['ServerHttp2Stream', 'ClientHttp2Stream'])
        r.classes[`http2.${name}`] = r.classes['http2.Http2Stream'];
    defineClass(r, 'http2.Http2Session', '*TnHttp2Session', 'class', 'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; emit=bool; request=*TnHttp2Stream; close=; destroy=; ref=*TnHttp2Session; unref=*TnHttp2Session; setTimeout=*TnHttp2Session', '', 'closed=bool; destroyed=bool; encrypted=bool; alpnProtocol=string; socket=*TnSocket', '');
    for (const name of ['ServerHttp2Session', 'ClientHttp2Session'])
        r.classes[`http2.${name}`] = r.classes['http2.Http2Session'];
    for (const name of ['Http2Server', 'Http2SecureServer'])
        r.classes[`http2.${name}`] = r.classes['http.Server'];
    r.classes['http2.Http2ServerRequest'] = r.classes['http.IncomingMessage'];
    r.classes['http2.Http2ServerResponse'] = r.classes['http.ServerResponse'];
    r.methods['http2.Http2Stream#pipe'] = (c) => {
        r.helper('nodeStream');
        return `TnPipe(${c.recv}, ${c.args.join(', ')})`;
    };
    r.typers['http2.Http2Stream#pipe'] = (c) => c.types[0] || '*TnStream';
    const streamListeners = (nodes) => {
        const event = nodes[0];
        const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
        if (name === 'response' || name === 'trailers')
            return ['*TnMap[string, interface{}]', 'float64'];
        return streamListenerTypes(nodes);
    };
    r.paramTypers['http2.Http2Stream#on'] = streamListeners;
    r.paramTypers['http2.Http2Stream#once'] = streamListeners;
    const sessionListeners = (nodes) => {
        const event = nodes[0];
        const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
        if (name === 'connect')
            return ['*TnHttp2Session', '*TnSocket'];
        if (name === 'error')
            return ['interface{}'];
        return [];
    };
    r.paramTypers['http2.Http2Session#on'] = sessionListeners;
    r.paramTypers['http2.Http2Session#once'] = sessionListeners;
    r.functions['http2.createServer'] = (c) => {
        use();
        return `TnHttp2CreateServer(false${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
    };
    r.functions['http2.createSecureServer'] = (c) => {
        use();
        return `TnHttp2CreateServer(true${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
    };
    r.paramTypers['http2.createServer'] = (_n) => ['*TnIncomingMessage', '*TnServerResponse'];
    r.paramTypers['http2.createSecureServer'] = r.paramTypers['http2.createServer'];
    r.functions['http2.connect'] = (c) => {
        use();
        return `TnHttp2Connect(${c.args.join(', ')})`;
    };
    r.paramTypers['http2.connect'] = (_n) => ['*TnHttp2Session', '*TnSocket'];
    r.functions['http2.getDefaultSettings'] = (_c) => {
        use();
        return 'TnHttp2DefaultSettings()';
    };
    setResults(r, 'http2', 'createServer=*TnHttpServer; createSecureServer=*TnHttpServer; connect=*TnHttp2Session; getDefaultSettings=map[string]interface{}');
    r.objects['http2.constants'] = true;
    for (const name of Object.keys(HTTP2_CONSTANTS)) {
        const text = HTTP2_CONSTANTS[name];
        r.values[`http2.constants.${name}`] = (_c) => JSON.stringify(text);
        r.valueTypes[`http2.constants.${name}`] = 'string';
    }
    for (const name of Object.keys(HTTP2_NUMBERS)) {
        const value = HTTP2_NUMBERS[name];
        r.values[`http2.constants.${name}`] = (_c) => `float64(${value})`;
        r.valueTypes[`http2.constants.${name}`] = 'float64';
    }
}
