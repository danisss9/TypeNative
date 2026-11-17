// node:http2 on Go's net/http (HTTP/2 over TLS, and cleartext h2c with prior
// knowledge) plus golang.org/x/net/http2 for the frames net/http keeps private.
// Servers are http.Servers speaking HTTP/2: the 'stream' event hands out
// ServerHttp2Streams (respond / write / end, request headers with :method /
// :path / :scheme / :authority); a 'session' event fires per connection.
// Without 'stream' listeners the compatibility 'request' API serves
// Http2ServerRequest / Response (the node:http objects). connect() returns a
// ClientHttp2Session whose request() streams are Duplexes emitting 'response'
// with :status. ping / settings / goaway / altsvc write real frames through a
// Framer on the session's connection; getPackedSettings serializes settings.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { STREAM_METHODS, STREAM_GETTERS, streamListenerTypes } from './stream.js';
const http2Helper = `// node:http2
var tnHttp2NextID float64 = -1

type TnHttp2Session struct {
	TnEventEmitter
	origin       string
	transport    *http2.Transport
	cc           *http2.ClientConn
	conn         net.Conn
	framer       *http2.Framer
	writeMu      sync.Mutex
	serverSide   bool
	encrypted    bool
	alpnProtocol string
	closed       bool
	destroyed    bool
	finished     bool
	refd         bool
	active       int
	nextID       float64
	socket       *TnSocket

	localSettings  map[string]interface{}
	remoteSettings map[string]interface{}
	pending        []*TnHttp2Stream
	connectEmitted bool
	emitOnce       sync.Once
}

func (s *TnHttp2Session) Get_closed() bool        { return s.closed }
func (s *TnHttp2Session) Get_destroyed() bool     { return s.destroyed }
func (s *TnHttp2Session) Get_encrypted() bool     { return s.encrypted }
func (s *TnHttp2Session) Get_alpnProtocol() string { return s.alpnProtocol }
func (s *TnHttp2Session) Get_socket() *TnSocket   { return s.socket }
func (s *TnHttp2Session) Get_type_() string {
	if s.serverSide {
		return "server"
	}
	return "client"
}
func (s *TnHttp2Session) Get_localSettings() interface{} {
	if s.localSettings == nil {
		s.localSettings = TnHttp2DefaultSettings()
	}
	return s.localSettings
}
func (s *TnHttp2Session) Get_remoteSettings() interface{} {
	if s.remoteSettings == nil {
		s.remoteSettings = TnHttp2DefaultSettings()
	}
	return s.remoteSettings
}
func (s *TnHttp2Session) Get_pendingSettingsAck() bool { return false }

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

// Writes one frame through the session's Framer. net.Conn serializes each
// Write, and Framer writes a whole frame in one call, so these interleave with
// net/http's own frames without corrupting them.
func (s *TnHttp2Session) frame(fn func(*http2.Framer) error) error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	if s.framer == nil {
		return TnNodeError("Error", "ERR_HTTP2_INVALID_SESSION", "The session has been destroyed")
	}
	return fn(s.framer)
}

func tnHttp2SettingID(name string) (http2.SettingID, bool) {
	switch name {
	case "headerTableSize":
		return http2.SettingHeaderTableSize, true
	case "enablePush":
		return http2.SettingEnablePush, true
	case "maxConcurrentStreams":
		return http2.SettingMaxConcurrentStreams, true
	case "initialWindowSize":
		return http2.SettingInitialWindowSize, true
	case "maxFrameSize":
		return http2.SettingMaxFrameSize, true
	case "maxHeaderListSize", "maxHeaderSize":
		return http2.SettingMaxHeaderListSize, true
	case "enableConnectProtocol":
		return http2.SettingEnableConnectProtocol, true
	}
	return 0, false
}

// The settings object as SETTINGS frame entries, with Node's range checks
func tnHttp2Settings(settings interface{}) ([]http2.Setting, map[string]interface{}, error) {
	out := []http2.Setting{}
	local := map[string]interface{}{}
	for _, e := range tnEntries(settings) {
		name := fmt.Sprint(e[0])
		id, ok := tnHttp2SettingID(name)
		if !ok {
			continue
		}
		var value float64
		switch v := e[1].(type) {
		case bool:
			if v {
				value = 1
			}
		default:
			n, ok := tnNetNumber(v)
			if !ok || n != math.Trunc(n) {
				return nil, nil, tnHttp2SettingError(name, e[1])
			}
			value = n
		}
		valid := value >= 0 && value <= 4294967295
		switch id {
		case http2.SettingEnablePush, http2.SettingEnableConnectProtocol:
			valid = value == 0 || value == 1
		case http2.SettingInitialWindowSize:
			valid = value >= 0 && value <= 2147483647
		case http2.SettingMaxFrameSize:
			valid = value >= 16384 && value <= 16777215
		}
		if !valid {
			return nil, nil, tnHttp2SettingError(name, e[1])
		}
		out = append(out, http2.Setting{ID: id, Val: uint32(value)})
		if id == http2.SettingEnablePush || id == http2.SettingEnableConnectProtocol {
			local[name] = value == 1
		} else {
			local[name] = value
		}
	}
	return out, local, nil
}

func tnHttp2SettingError(name string, value interface{}) *TnError {
	return TnNodeError("RangeError", "ERR_HTTP2_INVALID_SETTING_VALUE", "Invalid value for setting \\""+name+"\\": "+TnJSString(value))
}

// session.settings(settings, callback?): validated and recorded; net/http owns
// the connection's SETTINGS exchange, so no second SETTINGS frame is sent (the
// peer would ack it, and the transport that owns the connection treats an
// unsolicited ack as a protocol error)
func (s *TnHttp2Session) settings(settings interface{}, cb ...interface{}) {
	_, local, err := tnHttp2Settings(settings)
	var callback interface{}
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		callback = cb[0]
	}
	if err == nil && s.framer == nil {
		err = TnNodeError("Error", "ERR_HTTP2_INVALID_SESSION", "The session has been destroyed")
	}
	if err != nil {
		TnLoopPost(func() {
			if callback != nil {
				TnInvoke(callback, err, nil)
			} else {
				s.emit("error", err)
			}
		})
		return
	}
	if s.localSettings == nil {
		s.localSettings = TnHttp2DefaultSettings()
	}
	for k, v := range local {
		s.localSettings[k] = v
	}
	if callback != nil {
		next := s.localSettings
		TnLoopPost(func() { TnInvoke(callback, nil, next) })
	}
}

// session.ping([payload], callback): true when sent, like Node
func (s *TnHttp2Session) ping(args ...interface{}) bool {
	var payload []byte
	var callback interface{}
	for _, a := range args {
		if tnIsFunc(a) {
			callback = a
		} else if a != nil {
			payload = TnBufferFrom(a, "")
		}
	}
	if callback == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"callback\\" argument must be of type function"))
	}
	if len(payload) > 0 && len(payload) != 8 {
		panic(TnNodeError("RangeError", "ERR_HTTP2_PING_LENGTH", "HTTP2 ping payload must be 8 bytes"))
	}
	data := [8]byte{}
	if len(payload) == 8 {
		copy(data[:], payload)
	} else {
		cryptorand.Read(data[:])
	}
	start := time.Now()
	if s.cc != nil && !s.serverSide {
		go func() {
			err := s.cc.Ping(context.Background())
			duration := float64(time.Since(start)) / float64(time.Millisecond)
			TnLoopPost(func() {
				if err != nil {
					TnInvoke(callback, TnNodeError("Error", tnNetCode(err), err.Error()), duration, data[:])
				} else {
					TnInvoke(callback, nil, duration, data[:])
				}
			})
		}()
		return true
	}
	if s.framer == nil {
		return false
	}
	go func() {
		err := s.frame(func(f *http2.Framer) error { return f.WritePing(false, data) })
		duration := float64(time.Since(start)) / float64(time.Millisecond)
		TnLoopPost(func() {
			if err != nil {
				TnInvoke(callback, TnNodeError("Error", tnNetCode(err), err.Error()), duration, data[:])
			} else {
				TnInvoke(callback, nil, duration, data[:])
			}
		})
	}()
	return true
}

// session.goaway([code[, lastStreamID[, opaqueData]]])
func (s *TnHttp2Session) goaway(args ...interface{}) {
	code := uint32(0)
	lastStream := uint32(0)
	var opaque []byte
	if len(args) > 0 && args[0] != nil {
		if n, ok := tnNetNumber(args[0]); ok {
			code = uint32(n)
		}
	}
	if len(args) > 1 && args[1] != nil {
		if n, ok := tnNetNumber(args[1]); ok {
			lastStream = uint32(n)
		}
	}
	if len(args) > 2 && args[2] != nil {
		opaque = TnBufferFrom(args[2], "")
	}
	if s.framer == nil {
		return
	}
	go s.frame(func(f *http2.Framer) error {
		return f.WriteGoAway(lastStream, http2.ErrCode(code), opaque)
	})
}

// ServerHttp2Session.altsvc(alt, originOrStream)
func (s *TnHttp2Session) altsvc(alt string, originOrStream interface{}) {
	origin := ""
	streamID := uint32(0)
	switch v := originOrStream.(type) {
	case string:
		origin = v
	case interface{ Get_href() string }:
		origin = v.Get_href()
	default:
		if n, ok := tnNetNumber(v); ok {
			streamID = uint32(n)
		}
	}
	if s.framer == nil {
		return
	}
	payload := make([]byte, 2, 2+len(origin)+len(alt))
	binary.BigEndian.PutUint16(payload, uint16(len(origin)))
	payload = append(payload, origin...)
	payload = append(payload, alt...)
	go s.frame(func(f *http2.Framer) error {
		return f.WriteRawFrame(http2.FrameType(0x0a), 0, streamID, payload)
	})
}

func (s *TnHttp2Session) maybeFinish() {
	if !s.closed || s.active > 0 || s.finished {
		return
	}
	s.finished = true
	if s.cc != nil {
		s.cc.Close()
	}
	if s.conn != nil && s.serverSide {
		s.conn.Close()
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
	if s.cc != nil {
		s.cc.Close()
	}
	if s.conn != nil {
		s.conn.Close()
	}
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
	s := &TnHttp2Session{origin: u.Scheme + "://" + u.Host, alpnProtocol: "h2c", localSettings: TnHttp2DefaultSettings(), remoteSettings: TnHttp2DefaultSettings()}
	port := u.Port()
	host := u.Hostname()
	var cfg *tls.Config
	if u.Scheme == "https" {
		cfg, err = tnTLSClientConfig(opts, host, nil)
		if err != nil {
			panic(err)
		}
		cfg = cfg.Clone()
		cfg.NextProtos = []string{"h2"}
		s.encrypted = true
		s.alpnProtocol = "h2"
		if port == "" {
			port = "443"
		}
	} else if port == "" {
		port = "80"
	}
	if listener != nil {
		s.TnEventEmitter.once("connect", listener)
	}
	s.ref()
	// Dial once, then hand the connection to x/net/http2: its ClientConn keeps
	// the frames (PING, SETTINGS, GOAWAY) available to the session methods
	TnLoopRef()
	go func() {
		dialer := &net.Dialer{Timeout: 10 * time.Second}
		addr := net.JoinHostPort(host, port)
		var conn net.Conn
		var dialErr error
		if cfg != nil {
			conn, dialErr = tls.DialWithDialer(dialer, "tcp", addr, cfg)
			if dialErr == nil {
				if tc, ok := conn.(*tls.Conn); !ok || tc.ConnectionState().NegotiatedProtocol != "h2" {
					conn.Close()
					conn = nil
					dialErr = fmt.Errorf("http2: the server did not negotiate h2")
				}
			}
		} else {
			conn, dialErr = dialer.Dial("tcp", addr)
		}
		var cc *http2.ClientConn
		var transport *http2.Transport
		if dialErr == nil {
			transport = &http2.Transport{AllowHTTP: cfg == nil, TLSClientConfig: cfg, DisableCompression: true, IdleConnTimeout: 30 * time.Second}
			cc, dialErr = transport.NewClientConn(conn)
			if dialErr != nil {
				conn.Close()
				conn = nil
			}
		}
		TnLoopPost(func() {
			defer TnLoopUnref()
			if dialErr != nil {
				if s.destroyed {
					return
				}
				// A verification failure is already a Node error (its code is
				// DEPTH_ZERO_SELF_SIGNED_CERT & co.)
				var e *TnError
				if te := tnUnwrapTnError(dialErr); te != nil {
					e = te
				} else {
					p, _ := strconv.ParseFloat(port, 64)
					target := host
					if ip := tnDialedIP(dialErr); ip != "" {
						target = ip
					}
					e = TnNetError(dialErr, "connect", target, p)
				}
				cancel := TnNodeError("Error", "ERR_HTTP2_STREAM_CANCEL", "The pending stream has been canceled (caused by: "+e.message+")")
				cancel.props["cause"] = e
				for _, st := range s.pending {
					st.destroy(cancel)
				}
				s.pending = nil
				s.destroy(e)
				return
			}
			s.cc = cc
			s.transport = transport
			s.conn = conn
			s.framer = http2.NewFramer(conn, conn)
			s.connectEmitted = true
			s.socket = tnInfoSocket(conn.LocalAddr(), conn.RemoteAddr().String())
			s.socket.encrypted = s.encrypted
			s.emit("connect", s, s.socket)
			pending := s.pending
			s.pending = nil
			for _, st := range pending {
				st.start()
			}
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
	// respond() sends the HEADERS frame right away
	op := st.res.headerOp()
	op.flush = true
	st.res.post(op)
	st.headersSent = true
	st.sentHeaders = sent
	if len(args) > 1 && args[1] != nil {
		if end, _ := TnGetValue(args[1], "endStream").(bool); end {
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
			st.session = tnHttp2SessionFor(hs, r)
			if st.session == nil {
				st.session = &TnHttp2Session{socket: req.socket, encrypted: r.TLS != nil, alpnProtocol: "h2c"}
			}
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

func init() { tnHttp2StreamHook = tnHttp2ServeStream; tnHttp2SessionHook = tnHttp2MaybeSession }

// A server session per HTTP/2 connection: the same object the 'session' event
// hands out is reused by its streams (stream.session.ping / altsvc)
type tnHttp2ConnKey struct{}

var tnHttp2Sessions sync.Map

func tnHttp2SessionFor(hs *TnHttpServer, r *http.Request) *TnHttp2Session {
	conn, _ := r.Context().Value(tnHttp2ConnKey{}).(net.Conn)
	if conn == nil {
		return nil
	}
	if v, ok := tnHttp2Sessions.Load(conn); ok {
		return v.(*TnHttp2Session)
	}
	s := &TnHttp2Session{
		serverSide:     true,
		conn:           conn,
		encrypted:      r.TLS != nil,
		alpnProtocol:   "h2c",
		localSettings:  TnHttp2DefaultSettings(),
		remoteSettings: TnHttp2DefaultSettings(),
	}
	if r.TLS != nil {
		s.alpnProtocol = "h2"
	}
	s.framer = http2.NewFramer(conn, conn)
	if conn.LocalAddr() != nil {
		s.socket = tnInfoSocket(conn.LocalAddr(), conn.RemoteAddr().String())
		s.socket.encrypted = s.encrypted
	}
	actual, loaded := tnHttp2Sessions.LoadOrStore(conn, s)
	if loaded {
		return actual.(*TnHttp2Session)
	}
	return s
}

func tnHttp2MaybeSession(hs *TnHttpServer, r *http.Request) {
	if r.ProtoMajor != 2 {
		return
	}
	s := tnHttp2SessionFor(hs, r)
	if s == nil {
		return
	}
	s.emitOnce.Do(func() {
		if hs.listenerCount("session") == 0 {
			return
		}
		TnLoopPost(func() {
			if !s.destroyed {
				hs.emit("session", s, s.socket)
			}
		})
	})
}

func tnHttp2ConnClosed(conn net.Conn) {
	if v, ok := tnHttp2Sessions.LoadAndDelete(conn); ok {
		s := v.(*TnHttp2Session)
		TnLoopPost(func() {
			s.closed = true
			s.destroyed = true
			s.emit("close")
		})
	}
}

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
				allowHTTP1, _ = TnGetValue(a, "allowHTTP1").(bool)
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
	hs.httpServer.ConnContext = func(ctx context.Context, c net.Conn) context.Context {
		return context.WithValue(ctx, tnHttp2ConnKey{}, c)
	}
	hs.httpServer.ConnState = func(c net.Conn, state http.ConnState) {
		if state == http.StateClosed || state == http.StateHijacked {
			tnHttp2ConnClosed(c)
		}
	}
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
		endStream, _ = TnGetValue(options[0], "endStream").(bool)
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
	s := st.session
	if s.cc == nil {
		// the session is still dialing: start once 'connect' fires
		s.pending = append(s.pending, st)
		return
	}
	st.started = true
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
		resp, err := s.cc.RoundTrip(req)
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
		"maxHeaderSize":         float64(65535),
		"maxHeaderListSize":     float64(65535),
		"enableConnectProtocol": false,
	}
}

// http2.getPackedSettings(settings?): the SETTINGS payload, six bytes each,
// ordered by setting id as Node does
func TnHttp2GetPackedSettings(settings interface{}) []byte {
	entries, _, err := tnHttp2Settings(settings)
	if err != nil {
		panic(err)
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].ID < entries[j].ID })
	buf := make([]byte, 0, len(entries)*6)
	for _, e := range entries {
		var b [6]byte
		binary.BigEndian.PutUint16(b[0:2], uint16(e.ID))
		binary.BigEndian.PutUint32(b[2:6], e.Val)
		buf = append(buf, b[:]...)
	}
	return buf
}

// http2.getUnpackedSettings(buf): unknown ids land in customSettings
func TnHttp2GetUnpackedSettings(b []byte) map[string]interface{} {
	if len(b)%6 != 0 {
		panic(TnNodeError("RangeError", "ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH", "Packed settings length must be a multiple of six"))
	}
	out := map[string]interface{}{}
	custom := map[string]interface{}{}
	for i := 0; i+6 <= len(b); i += 6 {
		id := http2.SettingID(binary.BigEndian.Uint16(b[i : i+2]))
		val := binary.BigEndian.Uint32(b[i+2 : i+6])
		switch id {
		case http2.SettingHeaderTableSize:
			out["headerTableSize"] = float64(val)
		case http2.SettingEnablePush:
			out["enablePush"] = val == 1
		case http2.SettingMaxConcurrentStreams:
			out["maxConcurrentStreams"] = float64(val)
		case http2.SettingInitialWindowSize:
			out["initialWindowSize"] = float64(val)
		case http2.SettingMaxFrameSize:
			out["maxFrameSize"] = float64(val)
		case http2.SettingMaxHeaderListSize:
			out["maxHeaderSize"] = float64(val)
			out["maxHeaderListSize"] = float64(val)
		case http2.SettingEnableConnectProtocol:
			out["enableConnectProtocol"] = val == 1
		default:
			custom[strconv.Itoa(int(id))] = float64(val)
		}
	}
	if len(custom) > 0 {
		out["customSettings"] = custom
	}
	return out
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
    defineHelper(r, 'nodeHttp2', ['bytes', 'context', 'crypto/rand', 'crypto/tls', 'encoding/binary', 'fmt', 'golang.org/x/net/http2', 'io', 'math', 'net', 'net/http', 'net/url', 'os', 'sort', 'strconv', 'strings', 'sync', 'time'], ['nodeHttp', 'nodeNet', 'netErrors', 'nodeStream', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'orderedMap', 'tlsConfig', 'fsErrors', 'buffer'], http2Helper);
    const use = () => r.helper('nodeHttp2');
    defineClass(r, 'http2.Http2Stream', '*TnHttp2Stream', 'class', STREAM_METHODS + '; respond=; respondWithFile=; close=; pushStream=; additionalHeaders=', '', STREAM_GETTERS + '; id=float64; session=*TnHttp2Session; sentHeaders=*TnMap[string, interface{}]; headersSent=bool; pushAllowed=bool; endAfterHeaders=bool; rstCode=float64; aborted=bool', '');
    for (const name of ['ServerHttp2Stream', 'ClientHttp2Stream'])
        r.classes[`http2.${name}`] = r.classes['http2.Http2Stream'];
    defineClass(r, 'http2.Http2Session', '*TnHttp2Session', 'class', 'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; emit=bool; request=*TnHttp2Stream; close=; destroy=; ref=*TnHttp2Session; unref=*TnHttp2Session; setTimeout=*TnHttp2Session; ping=bool; settings=; goaway=; altsvc=', '', 'closed=bool; destroyed=bool; encrypted=bool; alpnProtocol=string; socket=*TnSocket; type=string; localSettings=interface{}; remoteSettings=interface{}; pendingSettingsAck=bool', '');
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
    r.paramTypers['http2.Http2Session#ping'] = (_n) => ['interface{}', 'float64', '[]byte'];
    r.paramTypers['http2.Http2Session#settings'] = (_n) => ['interface{}', 'interface{}'];
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
    r.functions['http2.getPackedSettings'] = (c) => {
        use();
        return `TnHttp2GetPackedSettings(${c.args.join(', ')})`;
    };
    r.functions['http2.getUnpackedSettings'] = (c) => {
        use();
        return `TnHttp2GetUnpackedSettings(${c.args.join(', ')})`;
    };
    setResults(r, 'http2', 'createServer=*TnHttpServer; createSecureServer=*TnHttpServer; connect=*TnHttp2Session; getDefaultSettings=interface{}; getPackedSettings=[]byte; getUnpackedSettings=interface{}');
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
