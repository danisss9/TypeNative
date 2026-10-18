// node:net — TCP (and Unix socket) servers and clients on Go's net package.
// A Socket is a TnStream duplex over a net.Conn: a goroutine reads into the
// stream, writes go straight to the connection; open sockets and listening
// servers keep the event loop alive. Also the base of node:tls and node:http.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { STREAM_METHODS, STREAM_GETTERS, streamListenerTypes } from './stream.js';

const netErrorsHelper = `// Node-style network errors: connect ECONNREFUSED 127.0.0.1:80
var tnNetErrnos = map[string]float64{
	"ECONNREFUSED": -111, "EADDRINUSE": -98, "EADDRNOTAVAIL": -99, "ECONNRESET": -104, "EPIPE": -32,
	"ETIMEDOUT": -110, "EACCES": -13, "ENOTFOUND": -3008, "EAI_AGAIN": -3001, "ENETUNREACH": -101,
	"EHOSTUNREACH": -113, "ECONNABORTED": -103, "EINVAL": -22, "ENOENT": -2,
}

func tnNetCode(err error) string {
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		if dnsErr.IsTemporary || dnsErr.IsTimeout {
			return "EAI_AGAIN"
		}
		return "ENOTFOUND"
	}
	switch {
	case errors.Is(err, syscall.ECONNREFUSED):
		return "ECONNREFUSED"
	case errors.Is(err, syscall.EADDRINUSE):
		return "EADDRINUSE"
	case errors.Is(err, syscall.EADDRNOTAVAIL):
		return "EADDRNOTAVAIL"
	case errors.Is(err, syscall.ECONNRESET):
		return "ECONNRESET"
	case errors.Is(err, syscall.EPIPE):
		return "EPIPE"
	case errors.Is(err, syscall.EACCES):
		return "EACCES"
	case errors.Is(err, syscall.ENETUNREACH):
		return "ENETUNREACH"
	case errors.Is(err, syscall.EHOSTUNREACH):
		return "EHOSTUNREACH"
	case errors.Is(err, syscall.ECONNABORTED):
		return "ECONNABORTED"
	case errors.Is(err, os.ErrNotExist):
		return "ENOENT"
	case errors.Is(err, os.ErrDeadlineExceeded):
		return "ETIMEDOUT"
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "refused"):
		return "ECONNREFUSED"
	case strings.Contains(msg, "address already in use") || strings.Contains(msg, "Only one usage"):
		return "EADDRINUSE"
	case strings.Contains(msg, "reset by peer") || strings.Contains(msg, "forcibly closed"):
		return "ECONNRESET"
	case strings.Contains(msg, "broken pipe"):
		return "EPIPE"
	case strings.Contains(msg, "timeout") || strings.Contains(msg, "timed out"):
		return "ETIMEDOUT"
	case strings.Contains(msg, "no such host"):
		return "ENOTFOUND"
	}
	return "EINVAL"
}

// An error from a socket call: syscall + code + address[:port]
func TnNetError(err error, syscallName string, address string, port float64) *TnError {
	code := tnNetCode(err)
	msg := syscallName + " " + code
	if address != "" {
		msg += " " + address
		if port >= 0 {
			msg += ":" + strconv.FormatFloat(port, 'f', -1, 64)
		}
	}
	e := TnNodeError("Error", code, msg)
	e.props["errno"] = tnNetErrnos[code]
	e.props["syscall"] = syscallName
	if address != "" {
		e.props["address"] = address
		if port >= 0 {
			e.props["port"] = port
		}
	}
	return e
}

// A JS number from a dynamic value (literal ints, floats, numeric strings)
func tnNetNumber(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case float32:
		return float64(n), true
	case *float64:
		if n != nil {
			return *n, true
		}
	case string:
		if f, err := strconv.ParseFloat(n, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}

func tnNetString(v interface{}) string {
	switch s := v.(type) {
	case string:
		return s
	case *string:
		if s != nil {
			return *s
		}
	}
	return ""
}

func tnIsFunc(v interface{}) bool {
	return v != nil && reflect.ValueOf(v).Kind() == reflect.Func && !reflect.ValueOf(v).IsNil()
}

func tnIsOptions(v interface{}) bool {
	if v == nil || tnIsFunc(v) {
		return false
	}
	if _, ok := tnNetNumber(v); ok {
		return false
	}
	_, isString := v.(string)
	return !isString
}`;

const netHelper = `// node:net
// net.isIP: 4, 6 or 0
func TnIsIP(input string) float64 {
	ip := net.ParseIP(input)
	if i := strings.IndexByte(input, '%'); ip == nil && i > 0 && strings.Contains(input, ":") {
		ip = net.ParseIP(input[:i])
	}
	if ip == nil {
		return 0
	}
	if strings.Contains(input, ":") {
		return 6
	}
	return 4
}

func TnIsIPv4(input string) bool { return TnIsIP(input) == 4 }
func TnIsIPv6(input string) bool { return TnIsIP(input) == 6 }

func tnFamily(ip string) string {
	if strings.Contains(ip, ":") {
		return "IPv6"
	}
	return "IPv4"
}

// server.address() / socket.address()
type TnAddressInfo struct {
	address string
	family  string
	port    float64
}

func tnAddrInfo(addr net.Addr) *TnAddressInfo {
	if addr == nil {
		return nil
	}
	switch a := addr.(type) {
	case *net.TCPAddr:
		ip := "::"
		if a.IP != nil && !a.IP.IsUnspecified() {
			ip = a.IP.String()
		} else if a.IP != nil && a.IP.To4() != nil && len(a.IP) == net.IPv4len {
			ip = "0.0.0.0"
		}
		return &TnAddressInfo{address: ip, family: tnFamily(ip), port: float64(a.Port)}
	case *net.UDPAddr:
		ip := "::"
		if a.IP != nil && !a.IP.IsUnspecified() {
			ip = a.IP.String()
		} else if a.IP != nil && a.IP.To4() != nil && len(a.IP) == net.IPv4len {
			ip = "0.0.0.0"
		}
		return &TnAddressInfo{address: ip, family: tnFamily(ip), port: float64(a.Port)}
	}
	return &TnAddressInfo{address: addr.String(), family: "", port: -1}
}

// net.Socket: a duplex stream over a net.Conn
type TnSocket struct {
	TnStream
	conn          net.Conn
	connecting    bool
	pendingWrites []func()
	allowHalfOpen bool
	timeoutMs     float64
	timer         *time.Timer
	timerGen      int
	server        *TnNetServer
	refd          bool
	remoteAddress interface{}
	remotePort    interface{}
	remoteFamily  interface{}
	localAddress  interface{}
	localPort     interface{}
	encrypted     bool
	authorized    bool
	authorizationError interface{}
	// Runs on the dial goroutine after connecting (TLS handshakes)
	dialWrap func(conn net.Conn) (net.Conn, error)
	// Runs on the loop once attached, before 'connect' (TLS state)
	afterConnect func(s *TnSocket)
	tlsState     interface{}
	servername   interface{}
	alpnProtocol interface{}
}

func (s *TnSocket) Get_remoteAddress() interface{} { return s.remoteAddress }
func (s *TnSocket) Get_remotePort() interface{}    { return s.remotePort }
func (s *TnSocket) Get_remoteFamily() interface{}  { return s.remoteFamily }
func (s *TnSocket) Get_localAddress() interface{}  { return s.localAddress }
func (s *TnSocket) Get_localPort() interface{}     { return s.localPort }
func (s *TnSocket) Get_localFamily() interface{} {
	if a, ok := s.localAddress.(string); ok {
		return tnFamily(a)
	}
	return nil
}
func (s *TnSocket) Get_connecting() bool { return s.connecting }
func (s *TnSocket) Get_pending() bool    { return s.conn == nil }
func (s *TnSocket) Get_readyState() string {
	switch {
	case s.connecting:
		return "opening"
	case s.conn == nil || s.destroyed:
		return "closed"
	case s.Get_readable() && s.Get_writable():
		return "open"
	case s.Get_readable():
		return "readOnly"
	case s.Get_writable():
		return "writeOnly"
	}
	return "closed"
}
func (s *TnSocket) Get_timeout() interface{} {
	if s.timeoutMs <= 0 {
		return nil
	}
	return s.timeoutMs
}
func (s *TnSocket) Get_encrypted() bool              { return s.encrypted }
func (s *TnSocket) Get_authorized() bool             { return s.authorized }
func (s *TnSocket) Get_authorizationError() interface{} { return s.authorizationError }

func TnNewSocket(options ...interface{}) *TnSocket {
	s := &TnSocket{}
	s.TnStream = *TnNewDuplex()
	s.tnSelf = s
	if len(options) > 0 && options[0] != nil {
		if b, ok := TnGet(options[0], "allowHalfOpen").(bool); ok {
			s.allowHalfOpen = b
		}
	}
	s.sink = func(chunk interface{}, done func(err interface{})) {
		write := func() {
			if s.conn == nil {
				done(TnNodeError("Error", "EPIPE", "This socket has been ended by the other party"))
				return
			}
			var data []byte
			switch c := chunk.(type) {
			case []byte:
				data = c
			case string:
				data = []byte(c)
			default:
				data = []byte(TnJSString(c))
			}
			_, err := s.conn.Write(data)
			s.touch()
			if err != nil {
				done(TnNetError(err, "write", "", -1))
				return
			}
			done(nil)
		}
		if s.connecting {
			s.pendingWrites = append(s.pendingWrites, write)
			return
		}
		write()
	}
	s.sinkFinal = func(done func(err interface{})) {
		finish := func() {
			if cw, ok := s.conn.(interface{ CloseWrite() error }); ok {
				cw.CloseWrite()
			}
			done(nil)
		}
		if s.connecting {
			s.pendingWrites = append(s.pendingWrites, finish)
			return
		}
		if s.conn == nil {
			done(nil)
			return
		}
		finish()
	}
	s.TnEventEmitter.on("end", func() {
		if !s.allowHalfOpen && !s.writeEnded {
			s.end()
		}
	})
	return s
}

// Takes over a connected net.Conn: addresses, the read goroutine, a loop ref
func (s *TnSocket) attach(conn net.Conn) {
	s.conn = conn
	s.connecting = false
	if a := tnAddrInfo(conn.RemoteAddr()); a != nil && a.port >= 0 {
		s.remoteAddress, s.remotePort, s.remoteFamily = a.address, a.port, a.family
	}
	if a := tnAddrInfo(conn.LocalAddr()); a != nil && a.port >= 0 {
		s.localAddress, s.localPort = a.address, a.port
	}
	s.refd = true
	TnLoopRef()
	s.onClose = func() {
		s.clearTimer()
		conn.Close()
		if s.refd {
			s.refd = false
			TnLoopUnref()
		}
		if s.server != nil {
			s.server.forget(s)
		}
	}
	go func() {
		buf := make([]byte, 65536)
		for {
			n, err := conn.Read(buf)
			if n > 0 {
				chunk := append([]byte{}, buf[:n]...)
				s.post(func() {
					if !s.destroyed {
						s.touch()
						s.push(chunk)
					}
				})
			}
			if err != nil {
				s.post(func() {
					if s.destroyed || s.readEnded {
						return
					}
					if err == io.EOF || errors.Is(err, net.ErrClosed) {
						s.push(nil)
						return
					}
					s.destroy(TnNetError(err, "read", "", -1))
				})
				return
			}
		}
	}()
}

func (s *TnSocket) flushPending() {
	pending := s.pendingWrites
	s.pendingWrites = nil
	for _, fn := range pending {
		fn()
	}
}

// socket.connect(port, host?, cb?) / connect({ port, host, path }, cb?) / connect(path, cb?)
func (s *TnSocket) connect(args ...interface{}) *TnSocket {
	network, host, port, path := "tcp", "localhost", float64(-1), ""
	var cb interface{}
	timeoutMs := float64(0)
	for i, a := range args {
		if tnIsFunc(a) {
			cb = a
			continue
		}
		if n, ok := tnNetNumber(a); ok && i == 0 {
			port = n
			continue
		}
		if str, ok := a.(string); ok {
			if i == 0 {
				path = str
				network = "unix"
			} else {
				host = str
			}
			continue
		}
		if i == 0 && a != nil {
			if n, ok := tnNetNumber(TnGet(a, "port")); ok {
				port = n
			}
			if h := tnNetString(TnGet(a, "host")); h != "" {
				host = h
			}
			if p := tnNetString(TnGet(a, "path")); p != "" {
				path, network = p, "unix"
			}
			if b, ok := TnGet(a, "allowHalfOpen").(bool); ok {
				s.allowHalfOpen = b
			}
			if n, ok := tnNetNumber(TnGet(a, "timeout")); ok {
				timeoutMs = n
			}
			if fam, ok := tnNetNumber(TnGet(a, "family")); ok && fam == 4 {
				network = "tcp4"
			} else if ok && fam == 6 {
				network = "tcp6"
			}
		}
	}
	if cb != nil {
		s.TnEventEmitter.once("connect", cb)
	}
	if timeoutMs > 0 {
		s.setTimeout(timeoutMs)
	}
	s.connecting = true
	TnLoopRef()
	address := path
	if network != "unix" {
		address = net.JoinHostPort(host, strconv.FormatFloat(port, 'f', -1, 64))
	}
	go func() {
		conn, err := net.Dial(network, address)
		if err == nil && s.dialWrap != nil {
			wrapped, werr := s.dialWrap(conn)
			if werr != nil {
				conn.Close()
				s.post(func() {
					defer TnLoopUnref()
					s.connecting = false
					if te, ok := werr.(*TnError); ok {
						s.destroy(te)
					} else {
						s.destroy(TnNetError(werr, "connect", host, port))
					}
				})
				return
			}
			conn = wrapped
		}
		s.post(func() {
			defer TnLoopUnref()
			if err != nil {
				s.connecting = false
				target, targetPort := host, port
				if network == "unix" {
					target, targetPort = path, -1
				} else if ip := tnDialedIP(err); ip != "" {
					target = ip
				}
				s.destroy(TnNetError(err, "connect", target, targetPort))
				return
			}
			if s.destroyed {
				conn.Close()
				return
			}
			s.attach(conn)
			s.emit("connect")
			if s.afterConnect != nil {
				s.afterConnect(s)
			}
			s.emit("ready")
			s.flushPending()
		})
	}()
	return s
}

// The address a failed dial tried (localhost → 127.0.0.1 in the error message)
func tnDialedIP(err error) string {
	var opErr *net.OpError
	if errors.As(err, &opErr) && opErr.Addr != nil {
		if a, ok := opErr.Addr.(*net.TCPAddr); ok {
			return a.IP.String()
		}
	}
	return ""
}

// Idle timeout: 'timeout' after ms without activity (the socket stays open)
func (s *TnSocket) setTimeout(ms float64, cb ...interface{}) *TnSocket {
	s.timeoutMs = ms
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		s.TnEventEmitter.once("timeout", cb[0])
	}
	s.touch()
	return s
}

func (s *TnSocket) clearTimer() {
	s.timerGen++
	if s.timer != nil {
		s.timer.Stop()
		s.timer = nil
	}
}

func (s *TnSocket) touch() {
	s.clearTimer()
	if s.timeoutMs <= 0 || s.destroyed {
		return
	}
	gen := s.timerGen
	s.timer = time.AfterFunc(time.Duration(s.timeoutMs*float64(time.Millisecond)), func() {
		s.post(func() {
			if gen == s.timerGen && !s.destroyed {
				s.emit("timeout")
			}
		})
	})
}

func (s *TnSocket) setNoDelay(noDelay ...bool) *TnSocket {
	if tc, ok := s.conn.(*net.TCPConn); ok {
		tc.SetNoDelay(len(noDelay) == 0 || noDelay[0])
	}
	return s
}

func (s *TnSocket) setKeepAlive(args ...interface{}) *TnSocket {
	if tc, ok := s.conn.(*net.TCPConn); ok {
		enable := false
		if len(args) > 0 {
			enable, _ = args[0].(bool)
		}
		tc.SetKeepAlive(enable)
		if len(args) > 1 {
			if ms, ok := tnNetNumber(args[1]); ok && ms > 0 {
				tc.SetKeepAlivePeriod(time.Duration(ms * float64(time.Millisecond)))
			}
		}
	}
	return s
}

func (s *TnSocket) address() *TnAddressInfo {
	if s.conn == nil {
		return &TnAddressInfo{}
	}
	return tnAddrInfo(s.conn.LocalAddr())
}

// ref / unref: whether this socket keeps the process alive
func (s *TnSocket) ref() *TnSocket {
	if !s.refd && s.conn != nil && !s.closed {
		s.refd = true
		TnLoopRef()
	}
	return s
}

func (s *TnSocket) unref() *TnSocket {
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	return s
}

func (s *TnSocket) resetAndDestroy() *TnSocket {
	if tc, ok := s.conn.(*net.TCPConn); ok {
		tc.SetLinger(0)
	}
	s.destroy()
	return s
}

func (s *TnSocket) destroySoon() {
	s.end()
}

// Cluster workers listen through the primary (set by node:cluster)
var tnListenHook func(srv *TnNetServer, network string, address string) (net.Listener, error)

// net.Server
type TnNetServer struct {
	TnEventEmitter
	ln            net.Listener
	listening     bool
	conns         map[*TnSocket]bool
	refd          bool
	closing       bool
	allowHalfOpen bool
	pauseOnConnect bool
	maxConnections float64
	// Wraps accepted connections on their own goroutine (TLS handshakes)
	wrapConn func(c net.Conn) (net.Conn, error)
	// Prepares sockets after they are attached (TLS state)
	onSocket func(s *TnSocket)
	connectionEvent string
	// Serves the listener instead of accepting sockets (http servers)
	serve func(ln net.Listener)
	// The async context of listen(): connections are handled in it
	asyncCtx TnAsyncContext
}

func TnNewNetServer(args ...interface{}) *TnNetServer {
	srv := &TnNetServer{conns: map[*TnSocket]bool{}, connectionEvent: "connection"}
	for _, a := range args {
		if tnIsFunc(a) {
			srv.on(srv.connectionEvent, a)
		} else if a != nil {
			if b, ok := TnGet(a, "allowHalfOpen").(bool); ok {
				srv.allowHalfOpen = b
			}
			if b, ok := TnGet(a, "pauseOnConnect").(bool); ok {
				srv.pauseOnConnect = b
			}
		}
	}
	return srv
}

func (srv *TnNetServer) Get_listening() bool { return srv.listening }
func (srv *TnNetServer) Get_maxConnections() float64 { return srv.maxConnections }
func (srv *TnNetServer) Set_maxConnections(n float64) { srv.maxConnections = n }

// listen(port?, host?, backlog?, cb?) / listen({ port, host, path }, cb?) / listen(path, cb?)
func (srv *TnNetServer) listen(args ...interface{}) *TnNetServer {
	network, host, port, path := "tcp", "", float64(0), ""
	for i, a := range args {
		if tnIsFunc(a) {
			srv.TnEventEmitter.once("listening", a)
			continue
		}
		if n, ok := tnNetNumber(a); ok {
			if i == 0 {
				port = n
			}
			continue
		}
		if str, ok := a.(string); ok {
			if i == 0 {
				path, network = str, "unix"
			} else {
				host = str
			}
			continue
		}
		if i == 0 && a != nil {
			if n, ok := tnNetNumber(TnGet(a, "port")); ok {
				port = n
			}
			host = tnNetString(TnGet(a, "host"))
			if p := tnNetString(TnGet(a, "path")); p != "" {
				path, network = p, "unix"
			}
		}
	}
	srv.asyncCtx = TnAsyncSnapshot()
	address := path
	if network != "unix" {
		address = net.JoinHostPort(host, strconv.FormatFloat(port, 'f', -1, 64))
	}
	var ln net.Listener
	var err error
	if tnListenHook != nil && network != "unix" {
		ln, err = tnListenHook(srv, network, address)
	} else {
		ln, err = net.Listen(network, address)
	}
	if err != nil {
		target := host
		if network == "unix" {
			target, port = path, -1
		} else if target == "" {
			target = "::"
		}
		e := TnNetError(err, "listen", target, port)
		TnLoopPost(func() { srv.emit("error", e) })
		return srv
	}
	srv.ln = ln
	srv.listening = true
	srv.refd = true
	TnLoopRef()
	TnLoopPost(func() { srv.emit("listening") })
	if srv.serve != nil {
		go srv.serve(ln)
	} else {
		go srv.acceptLoop(ln)
	}
	return srv
}

func (srv *TnNetServer) acceptLoop(ln net.Listener) {
	for {
		conn, err := ln.Accept()
		if err != nil {
			if errors.Is(err, net.ErrClosed) {
				return
			}
			var ne net.Error
			if errors.As(err, &ne) && ne.Timeout() {
				continue
			}
			TnLoopPost(func() { srv.emit("error", TnNetError(err, "accept", "", -1)) })
			return
		}
		if srv.wrapConn != nil {
			go func() {
				wrapped, err := srv.wrapConn(conn)
				if err != nil {
					conn.Close()
					TnLoopPost(func() { srv.emit("tlsClientError", err, nil) })
					return
				}
				TnLoopPost(func() { TnAsyncRun(srv.asyncCtx, func() { srv.accept(wrapped) }) })
			}()
			continue
		}
		TnLoopPost(func() { TnAsyncRun(srv.asyncCtx, func() { srv.accept(conn) }) })
	}
}

func (srv *TnNetServer) accept(conn net.Conn) {
	if srv.closing || (srv.maxConnections > 0 && float64(len(srv.conns)) >= srv.maxConnections) {
		conn.Close()
		return
	}
	s := TnNewSocket(map[string]interface{}{"allowHalfOpen": srv.allowHalfOpen})
	s.server = srv
	srv.conns[s] = true
	s.attach(conn)
	if srv.onSocket != nil {
		srv.onSocket(s)
	}
	if srv.pauseOnConnect {
		s.pause()
	}
	srv.emit(srv.connectionEvent, s)
}

func (srv *TnNetServer) forget(s *TnSocket) {
	delete(srv.conns, s)
	srv.maybeClosed()
}

func (srv *TnNetServer) maybeClosed() {
	if srv.closing && len(srv.conns) == 0 && srv.ln == nil {
		srv.closing = false
		TnLoopPost(func() { srv.emit("close") })
	}
}

// close(cb?): stops accepting; 'close' once every connection has ended
func (srv *TnNetServer) close(cb ...interface{}) *TnNetServer {
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		fn := cb[0]
		if srv.ln == nil {
			err := TnNodeError("Error", "ERR_SERVER_NOT_RUNNING", "Server is not running.")
			TnLoopPost(func() { TnInvoke(fn, err) })
		} else {
			srv.TnEventEmitter.once("close", func() { TnInvoke(fn, nil) })
		}
	}
	if srv.ln == nil {
		return srv
	}
	srv.ln.Close()
	srv.ln = nil
	srv.listening = false
	srv.closing = true
	if srv.refd {
		srv.refd = false
		TnLoopUnref()
	}
	srv.maybeClosed()
	return srv
}

func (srv *TnNetServer) address() *TnAddressInfo {
	if srv.ln == nil {
		return nil
	}
	return tnAddrInfo(srv.ln.Addr())
}

func (srv *TnNetServer) getConnections(cb interface{}) *TnNetServer {
	n := float64(len(srv.conns))
	TnLoopPost(func() { TnInvoke(cb, nil, n) })
	return srv
}

func (srv *TnNetServer) ref() *TnNetServer {
	if !srv.refd && srv.ln != nil {
		srv.refd = true
		TnLoopRef()
	}
	return srv
}

func (srv *TnNetServer) unref() *TnNetServer {
	if srv.refd {
		srv.refd = false
		TnLoopUnref()
	}
	return srv
}

// net.connect / createConnection
func TnNetConnect(args ...interface{}) *TnSocket {
	var opts interface{}
	if len(args) > 0 && tnIsOptions(args[0]) {
		opts = args[0]
	}
	return TnNewSocket(opts).connect(args...)
}`;

// Methods of the socket / server classes (beyond the stream and emitter ones)
export const SOCKET_METHODS =
  STREAM_METHODS +
  '; connect=*TnSocket; setTimeout=*TnSocket; setNoDelay=*TnSocket; setKeepAlive=*TnSocket; address=*TnAddressInfo; ref=*TnSocket; unref=*TnSocket; resetAndDestroy=*TnSocket; destroySoon=';
export const SOCKET_GETTERS =
  STREAM_GETTERS +
  '; remoteAddress=interface{}; remotePort=interface{}; remoteFamily=interface{}; localAddress=interface{}; localPort=interface{}; localFamily=interface{}; connecting=bool; pending=bool; readyState=string; timeout=interface{}; encrypted=bool; authorized=bool; authorizationError=interface{}';
export const SERVER_METHODS =
  'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64; listen=*TnNetServer; close=*TnNetServer; address=*TnAddressInfo; getConnections=*TnNetServer; ref=*TnNetServer; unref=*TnNetServer';

// Listener parameter types of socket events
export function socketListenerTypes(nodes: any[]): string[] {
  const event = nodes[0];
  const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
  if (name === 'close') return ['bool'];
  if (name === 'lookup') return ['*TnError', 'string', 'interface{}', 'string'];
  return streamListenerTypes(nodes);
}

// net.SocketAddress / net.BlockList on net/netip
const blockListHelper = `// node:net SocketAddress, BlockList
type TnSocketAddress struct {
	address   string
	port      float64
	family    string
	flowlabel float64
}

func tnInvalidAddress() *TnError {
	return TnNodeError("Error", "ERR_INVALID_ADDRESS", "Invalid socket address")
}

func TnNewSocketAddress(options ...interface{}) *TnSocketAddress {
	sa := &TnSocketAddress{family: "ipv4"}
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	if f, ok := TnGet(opts, "family").(string); ok {
		sa.family = strings.ToLower(f)
	}
	if sa.family != "ipv4" && sa.family != "ipv6" {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.family' must be one of: 'ipv4', 'ipv6'. Received '"+sa.family+"'"))
	}
	sa.address = "127.0.0.1"
	if sa.family == "ipv6" {
		sa.address = "::"
	}
	if a, ok := TnGet(opts, "address").(string); ok {
		sa.address = a
	}
	if p, ok := TnGet(opts, "port").(float64); ok {
		sa.port = p
	}
	if fl, ok := TnGet(opts, "flowlabel").(float64); ok {
		sa.flowlabel = fl
	}
	addr, err := netip.ParseAddr(sa.address)
	if err != nil || (sa.family == "ipv4") != addr.Is4() {
		panic(tnInvalidAddress())
	}
	sa.address = addr.String()
	return sa
}

// SocketAddress.parse('1.2.3.4:80' | '[::1]:80'): undefined when invalid
func TnParseSocketAddress(input string) *TnSocketAddress {
	host, port := input, "0"
	if ap, err := netip.ParseAddrPort(input); err == nil {
		host, port = ap.Addr().String(), strconv.Itoa(int(ap.Port()))
	} else if _, err := netip.ParseAddr(strings.Trim(input, "[]")); err == nil {
		host = strings.Trim(input, "[]")
	} else {
		return nil
	}
	addr, _ := netip.ParseAddr(host)
	family := "ipv4"
	if !addr.Is4() {
		family = "ipv6"
	}
	p, _ := strconv.Atoi(port)
	return &TnSocketAddress{address: addr.String(), port: float64(p), family: family}
}

func (sa *TnSocketAddress) Get_address() string     { return sa.address }
func (sa *TnSocketAddress) Get_port() float64       { return sa.port }
func (sa *TnSocketAddress) Get_family() string      { return sa.family }
func (sa *TnSocketAddress) Get_flowlabel() float64  { return sa.flowlabel }
func (sa *TnSocketAddress) toJSON() map[string]interface{} {
	return map[string]interface{}{"address": sa.address, "port": sa.port, "family": sa.family, "flowlabel": sa.flowlabel}
}

type tnBlockRule struct {
	kind   string
	from   netip.Addr
	to     netip.Addr
	prefix netip.Prefix
	text   string
}

type TnBlockList struct {
	rules []tnBlockRule
}

func TnNewBlockList() *TnBlockList { return &TnBlockList{} }

func TnIsBlockList(v interface{}) bool {
	_, ok := v.(*TnBlockList)
	return ok
}

// An address argument (string + family, or a SocketAddress) as a netip.Addr
func tnBlockAddr(v interface{}, family []interface{}) (netip.Addr, bool) {
	fam := "ipv4"
	if sa, ok := v.(*TnSocketAddress); ok {
		v, fam = sa.address, sa.family
	} else if len(family) > 0 {
		if f, ok := family[0].(string); ok {
			fam = strings.ToLower(f)
		}
	}
	str, ok := v.(string)
	if !ok {
		return netip.Addr{}, false
	}
	addr, err := netip.ParseAddr(str)
	if err != nil || (fam == "ipv4") != addr.Is4() {
		return netip.Addr{}, false
	}
	return addr, true
}

func tnBlockFamily(a netip.Addr) string {
	if a.Is4() {
		return "IPv4"
	}
	return "IPv6"
}

func (b *TnBlockList) add(rule tnBlockRule) {
	b.rules = append([]tnBlockRule{rule}, b.rules...)
}

func (b *TnBlockList) addAddress(address interface{}, family ...interface{}) {
	addr, ok := tnBlockAddr(address, family)
	if !ok {
		panic(tnInvalidAddress())
	}
	b.add(tnBlockRule{kind: "address", from: addr, text: "Address: " + tnBlockFamily(addr) + " " + addr.String()})
}

func (b *TnBlockList) addRange(start interface{}, end interface{}, family ...interface{}) {
	from, ok1 := tnBlockAddr(start, family)
	to, ok2 := tnBlockAddr(end, family)
	if !ok1 || !ok2 {
		panic(tnInvalidAddress())
	}
	if to.Less(from) {
		panic(TnNodeError("RangeError", "ERR_INVALID_ARG_VALUE", "The argument 'start' must be less than or equal to 'end'"))
	}
	b.add(tnBlockRule{kind: "range", from: from, to: to, text: "Range: " + tnBlockFamily(from) + " " + from.String() + "-" + to.String()})
}

func (b *TnBlockList) addSubnet(network interface{}, prefix float64, family ...interface{}) {
	addr, ok := tnBlockAddr(network, family)
	if !ok {
		panic(tnInvalidAddress())
	}
	pfx, err := addr.Prefix(int(prefix))
	if err != nil {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"prefix\\" is out of range. Received "+TnNumStr(prefix)))
	}
	b.add(tnBlockRule{kind: "subnet", prefix: pfx, text: "Subnet: " + tnBlockFamily(addr) + " " + addr.String() + "/" + strconv.Itoa(int(prefix))})
}

// The address in the rule's family (IPv4-mapped IPv6 addresses match IPv4 rules)
func tnBlockAs(addr netip.Addr, like netip.Addr) (netip.Addr, bool) {
	if addr.Is4() == like.Is4() {
		return addr, true
	}
	if like.Is4() && addr.Is4In6() {
		return addr.Unmap(), true
	}
	if !like.Is4() && addr.Is4() {
		return netip.AddrFrom16(addr.As16()), true
	}
	return addr, false
}

func (b *TnBlockList) check(address interface{}, family ...interface{}) bool {
	addr, ok := tnBlockAddr(address, family)
	if !ok {
		return false
	}
	for _, rule := range b.rules {
		switch rule.kind {
		case "address":
			if a, ok := tnBlockAs(addr, rule.from); ok && a == rule.from {
				return true
			}
		case "range":
			if a, ok := tnBlockAs(addr, rule.from); ok && !a.Less(rule.from) && !rule.to.Less(a) {
				return true
			}
		case "subnet":
			if a, ok := tnBlockAs(addr, rule.prefix.Addr()); ok && rule.prefix.Contains(a) {
				return true
			}
		}
	}
	return false
}

func (b *TnBlockList) Get_rules() []string {
	out := []string{}
	for _, rule := range b.rules {
		out = append(out, rule.text)
	}
	return out
}`;

export function registerNet(r: NodeRegistry): void {
  defineModule(r, 'net');
  defineHelper(r, 'netErrors', ['errors', 'net', 'os', 'reflect', 'strconv', 'strings', 'syscall'], ['error', 'dynamic'], netErrorsHelper);
  defineHelper(
    r,
    'nodeNet',
    ['errors', 'io', 'net', 'strconv', 'strings', 'time'],
    ['netErrors', 'nodeStream', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic'],
    netHelper
  );
  const use = () => r.helper('nodeNet');
  defineClass(r, 'net.AddressInfo', '*TnAddressInfo', 'class', '', 'address=string; family=string; port=float64', '', '');
  defineClass(r, 'net.Socket', '*TnSocket', 'class', SOCKET_METHODS, '', SOCKET_GETTERS, '');
  defineClass(r, 'net.Server', '*TnNetServer', 'class', SERVER_METHODS, '', 'listening=bool; maxConnections=float64', 'maxConnections');
  r.methods['net.Socket#pipe'] = (c: NodeCall) => {
    r.helper('nodeStream');
    return `TnPipe(${c.recv}, ${c.args.join(', ')})`;
  };
  r.typers['net.Socket#pipe'] = (c: NodeCall) => c.types[0] || '*TnStream';
  r.paramTypers['net.Socket#on'] = socketListenerTypes;
  r.paramTypers['net.Socket#once'] = socketListenerTypes;
  const serverListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'connection') return ['*TnSocket'];
    if (name === 'error') return ['interface{}'];
    return [];
  };
  r.paramTypers['net.Server#on'] = serverListeners;
  r.paramTypers['net.Server#once'] = serverListeners;
  r.paramTypers['net.Server#close'] = (_n: any[]) => ['*TnError'];
  r.paramTypers['net.Server#getConnections'] = (_n: any[]) => ['*TnError', 'float64'];

  r.constructors['net.Socket'] = (c: NodeCall) => {
    use();
    return `TnNewSocket(${c.args.join(', ')})`;
  };
  r.constructors['net.Server'] = (c: NodeCall) => {
    use();
    return `TnNewNetServer(${c.args.join(', ')})`;
  };
  r.functions['net.createServer'] = (c: NodeCall) => {
    use();
    return `TnNewNetServer(${c.args.join(', ')})`;
  };
  r.paramTypers['net.createServer'] = (_n: any[]) => ['*TnSocket'];
  const connect = (c: NodeCall) => {
    use();
    return `TnNetConnect(${c.args.join(', ')})`;
  };
  r.functions['net.connect'] = connect;
  r.functions['net.createConnection'] = connect;
  r.paramTypers['net.connect'] = (_n: any[]) => [];
  r.paramTypers['net.createConnection'] = (_n: any[]) => [];
  setResults(r, 'net', 'createServer=*TnNetServer; connect=*TnSocket; createConnection=*TnSocket; isIP=float64; isIPv4=bool; isIPv6=bool');
  r.functions['net.isIP'] = (c: NodeCall) => {
    use();
    return `TnIsIP(${c.args[0]})`;
  };
  r.functions['net.isIPv4'] = (c: NodeCall) => {
    use();
    return `TnIsIPv4(${c.args[0]})`;
  };
  r.functions['net.isIPv6'] = (c: NodeCall) => {
    use();
    return `TnIsIPv6(${c.args[0]})`;
  };

  defineHelper(r, 'nodeBlockList', ['net/netip', 'strconv', 'strings'], ['error', 'dynamic'], blockListHelper);
  const block = () => r.helper('nodeBlockList');
  defineClass(r, 'net.SocketAddress', '*TnSocketAddress', 'class', 'toJSON=map[string]interface{}', '', 'address=string; port=float64; family=string; flowlabel=float64', '');
  defineClass(r, 'net.BlockList', '*TnBlockList', 'class', 'addAddress=; addRange=; addSubnet=; check=bool', '', 'rules=[]string', '');
  r.constructors['net.SocketAddress'] = (c: NodeCall) => {
    block();
    return `TnNewSocketAddress(${c.args.join(', ')})`;
  };
  r.constructors['net.BlockList'] = (_c: NodeCall) => {
    block();
    return 'TnNewBlockList()';
  };
  r.functions['net.SocketAddress.parse'] = (c: NodeCall) => {
    block();
    return `TnParseSocketAddress(${c.args[0]})`;
  };
  r.results['net.SocketAddress.parse'] = '*TnSocketAddress';
  r.functions['net.BlockList.isBlockList'] = (c: NodeCall) => {
    block();
    return `TnIsBlockList(${c.args[0]})`;
  };
  r.results['net.BlockList.isBlockList'] = 'bool';
}
