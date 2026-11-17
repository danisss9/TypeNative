// node:http2 on golang.org/x/net/http2 (net/http's own HTTP/2 on Go 1.27:
// over TLS, and cleartext h2c with prior knowledge). Every connection is a
// session: servers accept connections themselves ('session', then
// x/net/http2's ServeConn), connect() dials one and hands it to NewClientConn.
// Between the library and the socket sits a tnH2Tap that splits the byte
// stream into frames, so the session's PING / SETTINGS / GOAWAY / ALTSVC go
// out between two of the library's frames and the peer's reach the session.
// The 'stream' event hands out ServerHttp2Streams (respond / write / end,
// request headers with :method / :path / :scheme / :authority); without
// 'stream' listeners the compatibility 'request' API serves
// Http2ServerRequest / Response (the node:http objects). A client session's
// request() streams are Duplexes emitting 'response' with :status.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { STREAM_METHODS, STREAM_GETTERS, streamListenerTypes } from './stream.js';

const http2Helper = `// node:http2
// Settings as Node reports them (localSettings / remoteSettings): the RFC 9113
// initial values, updated by each SETTINGS frame
type tnH2Settings struct {
	headerTableSize       float64
	enablePush            bool
	initialWindowSize     float64
	maxFrameSize          float64
	maxConcurrentStreams  float64
	maxHeaderListSize     float64
	enableConnectProtocol bool
}

func tnH2InitialSettings() tnH2Settings {
	return tnH2Settings{4096, true, 65535, 16384, 4294967295, 4294967295, false}
}

func (st *tnH2Settings) apply(id http2.SettingID, v uint32) {
	switch id {
	case http2.SettingHeaderTableSize:
		st.headerTableSize = float64(v)
	case http2.SettingEnablePush:
		st.enablePush = v != 0
	case http2.SettingInitialWindowSize:
		st.initialWindowSize = float64(v)
	case http2.SettingMaxFrameSize:
		st.maxFrameSize = float64(v)
	case http2.SettingMaxConcurrentStreams:
		st.maxConcurrentStreams = float64(v)
	case http2.SettingMaxHeaderListSize:
		st.maxHeaderListSize = float64(v)
	case http2.SettingEnableConnectProtocol:
		st.enableConnectProtocol = v != 0
	}
}

func (st tnH2Settings) object() map[string]interface{} {
	return map[string]interface{}{
		"headerTableSize":       st.headerTableSize,
		"enablePush":            st.enablePush,
		"initialWindowSize":     st.initialWindowSize,
		"maxFrameSize":          st.maxFrameSize,
		"maxConcurrentStreams":  st.maxConcurrentStreams,
		"maxHeaderListSize":     st.maxHeaderListSize,
		"maxHeaderSize":         st.maxHeaderListSize,
		"enableConnectProtocol": st.enableConnectProtocol,
	}
}

func tnH2ParseSettings(payload []byte) []http2.Setting {
	out := []http2.Setting{}
	for i := 0; i+6 <= len(payload); i += 6 {
		out = append(out, http2.Setting{ID: http2.SettingID(binary.BigEndian.Uint16(payload[i:])), Val: binary.BigEndian.Uint32(payload[i+2:])})
	}
	return out
}

// An HTTP/2 session: x/net/http2 (net/http's HTTP/2 on Go 1.27) speaks the
// protocol over a tnH2Tap, which lets the session add its own frames and see
// the peer's PING / SETTINGS / GOAWAY / ALTSVC frames
type TnHttp2Session struct {
	TnEventEmitter
	// 0 on the server, 1 on the client (NGHTTP2_SESSION_SERVER / CLIENT)
	typ          float64
	origin       string
	cc           *http2.ClientConn
	conn         net.Conn
	tap          *tnH2Tap
	encrypted    bool
	alpnProtocol string
	closed       bool
	destroyed    bool
	finished     bool
	refd         bool
	connecting   bool
	active       int
	nextID       float64
	socket       *TnSocket
	local        tnH2Settings
	remote       tnH2Settings
	pending      []*TnHttp2Stream
	// frame calls made while the client is still connecting
	deferred []func()
	// server side: handlers running on the connection
	handlers int32

	connectEmitted bool
	closeEmitted   bool
}

func tnNewHttp2Session(typ float64) *TnHttp2Session {
	return &TnHttp2Session{typ: typ, local: tnH2InitialSettings(), remote: tnH2InitialSettings()}
}

func (s *TnHttp2Session) Get_closed() bool                           { return s.closed }
func (s *TnHttp2Session) Get_destroyed() bool                        { return s.destroyed }
func (s *TnHttp2Session) Get_encrypted() bool                        { return s.encrypted }
func (s *TnHttp2Session) Get_alpnProtocol() string                   { return s.alpnProtocol }
func (s *TnHttp2Session) Get_socket() *TnSocket                      { return s.socket }
func (s *TnHttp2Session) Get_connecting() bool                       { return s.connecting }
func (s *TnHttp2Session) Get_type_() float64                         { return s.typ }
func (s *TnHttp2Session) Get_localSettings() map[string]interface{}  { return s.local.object() }
func (s *TnHttp2Session) Get_remoteSettings() map[string]interface{} { return s.remote.object() }

// true while a SETTINGS frame this side sent (its first one included) waits for its ACK
func (s *TnHttp2Session) Get_pendingSettingsAck() bool {
	if s.tap == nil {
		return s.connecting
	}
	return s.tap.unacked() > 0
}

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

const tnH2Preface = "PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n"

const (
	tnH2FrameHeaders  = 0x1
	tnH2FrameSettings = 0x4
	tnH2FramePing     = 0x6
	tnH2FrameGoAway   = 0x7
	tnH2FrameAltSvc   = 0xa
)

// A SETTINGS frame waiting for its ACK; ours were sent by session.settings()
type tnH2Ack struct {
	ours     bool
	settings []http2.Setting
	cb       interface{}
	start    time.Time
}

type tnH2Ping struct {
	cb    interface{}
	start time.Time
}

type tnH2Out struct {
	frame []byte
	ack   *tnH2Ack
}

// The connection under x/net/http2. Writes are parsed into frames so the
// session's own frames go out only between two of the library's frames (its
// buffered writer can split one frame across Write calls); reads are parsed
// into frames so the peer's control frames reach the session. The ACKs of the
// session's own SETTINGS and PINGs are taken out of the stream: the library
// never sent those frames.
type tnH2Tap struct {
	net.Conn
	s *TnHttp2Session
	// read side: only the connection's read loop calls Read
	rbuf   []byte
	out    []byte
	off    int
	tmp    []byte
	rskip  int
	rleft  int
	rplain bool
	// write side
	mu       sync.Mutex
	wskip    int
	whdr     [9]byte
	whdrN    int
	wleft    int
	wcollect bool
	wpayload []byte
	wstarted bool
	queued   []tnH2Out
	acks     []*tnH2Ack
	pings    map[[8]byte]tnH2Ping
	// the library's own advertised limits: settings() never goes above them,
	// or the peer would send what the library refuses
	libWindow      uint32
	libFrame       uint32
	libTable       uint32
	lastPeerStream uint32
	closeOnce      sync.Once
}

// A TLS connection keeps its ConnectionState, so the library sees TLS (r.TLS, ALPN)
type tnH2TapTLS struct {
	*tnH2Tap
	tc *tls.Conn
}

func (t *tnH2TapTLS) ConnectionState() tls.ConnectionState { return t.tc.ConnectionState() }

func tnNewH2Tap(conn net.Conn, s *TnHttp2Session, server bool) (*tnH2Tap, net.Conn) {
	t := &tnH2Tap{Conn: conn, s: s, pings: map[[8]byte]tnH2Ping{}, libWindow: 65535, libFrame: 16384, libTable: 4096}
	if server {
		t.rskip = len(tnH2Preface)
	} else {
		t.wskip = len(tnH2Preface)
	}
	if tc, ok := conn.(*tls.Conn); ok {
		return t, &tnH2TapTLS{tnH2Tap: t, tc: tc}
	}
	return t, t
}

// The library closes the connection itself too (after a GOAWAY, its reader
// may stop without a read error): either way the session hears of it once
func (t *tnH2Tap) Close() error {
	t.closeOnce.Do(func() { TnLoopPost(t.s.connClosed) })
	return t.Conn.Close()
}

func (t *tnH2Tap) Read(p []byte) (int, error) {
	for t.off == len(t.out) {
		if t.tmp == nil {
			t.tmp = make([]byte, 32768)
		}
		n, err := t.Conn.Read(t.tmp)
		if n > 0 {
			t.feed(t.tmp[:n])
		}
		if err != nil {
			t.closeOnce.Do(func() { TnLoopPost(t.s.connClosed) })
			if t.off < len(t.out) {
				break
			}
			return 0, err
		}
	}
	n := copy(p, t.out[t.off:])
	t.off += n
	if t.off == len(t.out) {
		t.out = t.out[:0]
		t.off = 0
	}
	return n, nil
}

func (t *tnH2Tap) feed(b []byte) {
	if t.rplain {
		t.out = append(t.out, b...)
		return
	}
	if t.rskip > 0 {
		// The client preface; anything else is not HTTP/2, left to the library
		k := min(t.rskip, len(b))
		at := len(tnH2Preface) - t.rskip
		if string(b[:k]) != tnH2Preface[at:at+k] {
			t.rplain = true
			t.out = append(t.out, b...)
			return
		}
		t.out = append(t.out, b[:k]...)
		t.rskip -= k
		b = b[k:]
	}
	t.rbuf = append(t.rbuf, b...)
	i := 0
	for {
		if t.rleft > 0 {
			k := min(t.rleft, len(t.rbuf)-i)
			t.out = append(t.out, t.rbuf[i:i+k]...)
			i += k
			t.rleft -= k
			if t.rleft > 0 {
				break
			}
			continue
		}
		if len(t.rbuf)-i < 9 {
			break
		}
		h := t.rbuf[i:]
		length := int(h[0])<<16 | int(h[1])<<8 | int(h[2])
		switch h[3] {
		case tnH2FrameSettings, tnH2FramePing, tnH2FrameGoAway, tnH2FrameAltSvc:
			if len(h) < 9+length {
				t.rbuf = append(t.rbuf[:0], t.rbuf[i:]...)
				return
			}
			frame := h[:9+length]
			if t.observe(frame) {
				t.out = append(t.out, frame...)
			}
			i += 9 + length
			continue
		case tnH2FrameHeaders:
			if id := binary.BigEndian.Uint32(h[5:9]) & 0x7fffffff; id > atomic.LoadUint32(&t.lastPeerStream) {
				atomic.StoreUint32(&t.lastPeerStream, id)
			}
		}
		t.out = append(t.out, h[:9]...)
		i += 9
		t.rleft = length
	}
	t.rbuf = append(t.rbuf[:0], t.rbuf[i:]...)
}

// A peer frame the session cares about; false drops it (the library did not send its request)
func (t *tnH2Tap) observe(frame []byte) bool {
	s := t.s
	flags := frame[4]
	streamID := binary.BigEndian.Uint32(frame[5:9]) & 0x7fffffff
	payload := append([]byte{}, frame[9:]...)
	switch frame[3] {
	case tnH2FrameSettings:
		if flags&0x1 != 0 {
			t.mu.Lock()
			var ack *tnH2Ack
			if len(t.acks) > 0 {
				ack = t.acks[0]
				t.acks = t.acks[1:]
			}
			t.mu.Unlock()
			if ack == nil {
				return true
			}
			TnLoopPost(func() { s.settingsAcked(ack) })
			return !ack.ours
		}
		list := tnH2ParseSettings(payload)
		TnLoopPost(func() {
			if s.destroyed {
				return
			}
			for _, e := range list {
				s.remote.apply(e.ID, e.Val)
			}
			s.emit("remoteSettings", s.remote.object())
		})
	case tnH2FramePing:
		if len(payload) != 8 {
			return true
		}
		var data [8]byte
		copy(data[:], payload)
		if flags&0x1 != 0 {
			t.mu.Lock()
			p, ok := t.pings[data]
			delete(t.pings, data)
			t.mu.Unlock()
			if !ok {
				return true
			}
			duration := float64(time.Since(p.start)) / float64(time.Millisecond)
			TnLoopPost(func() { TnInvoke(p.cb, nil, duration, payload) })
			return false
		}
		TnLoopPost(func() {
			if !s.destroyed {
				s.emit("ping", payload)
			}
		})
	case tnH2FrameGoAway:
		if len(payload) < 8 {
			return true
		}
		last := float64(binary.BigEndian.Uint32(payload[0:4]) & 0x7fffffff)
		code := float64(binary.BigEndian.Uint32(payload[4:8]))
		opaque := payload[8:]
		TnLoopPost(func() { s.goawayReceived(code, last, opaque) })
	case tnH2FrameAltSvc:
		if len(payload) < 2 {
			return false
		}
		n := int(binary.BigEndian.Uint16(payload))
		if 2+n > len(payload) {
			return false
		}
		origin := string(payload[2 : 2+n])
		alt := string(payload[2+n:])
		TnLoopPost(func() {
			if !s.destroyed {
				s.emit("altsvc", alt, origin, float64(streamID))
			}
		})
		// net/http has no use for ALTSVC
		return false
	}
	return true
}

func (t *tnH2Tap) atBoundary() bool {
	return t.wstarted && t.wskip == 0 && t.whdrN == 0 && t.wleft == 0
}

func (t *tnH2Tap) flushQueued() error {
	for len(t.queued) > 0 {
		q := t.queued[0]
		t.queued = t.queued[1:]
		if q.ack != nil {
			t.acks = append(t.acks, q.ack)
		}
		if _, err := t.Conn.Write(q.frame); err != nil {
			return err
		}
	}
	return nil
}

func (t *tnH2Tap) Write(p []byte) (int, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	start, i := 0, 0
	for i < len(p) {
		if t.wskip > 0 {
			k := min(t.wskip, len(p)-i)
			t.wskip -= k
			i += k
			continue
		}
		if t.wleft > 0 {
			k := min(t.wleft, len(p)-i)
			if t.wcollect {
				t.wpayload = append(t.wpayload, p[i:i+k]...)
			}
			t.wleft -= k
			i += k
			if t.wleft == 0 {
				t.frameWritten()
			}
			continue
		}
		if t.whdrN == 0 && t.wstarted && len(t.queued) > 0 {
			if i > start {
				if _, err := t.Conn.Write(p[start:i]); err != nil {
					return start, err
				}
			}
			start = i
			if err := t.flushQueued(); err != nil {
				return start, err
			}
		}
		t.whdr[t.whdrN] = p[i]
		t.whdrN++
		i++
		if t.whdrN == 9 {
			t.whdrN = 0
			t.wleft = int(t.whdr[0])<<16 | int(t.whdr[1])<<8 | int(t.whdr[2])
			t.wcollect = t.whdr[3] == tnH2FrameSettings && t.whdr[4]&0x1 == 0
			t.wpayload = t.wpayload[:0]
			if t.wleft == 0 {
				t.frameWritten()
			}
		}
	}
	if i > start {
		if _, err := t.Conn.Write(p[start:i]); err != nil {
			return start, err
		}
	}
	if t.atBoundary() && len(t.queued) > 0 {
		if err := t.flushQueued(); err != nil {
			return len(p), err
		}
	}
	return len(p), nil
}

// One of the library's frames is out: its SETTINGS wait for an ACK too
func (t *tnH2Tap) frameWritten() {
	t.wstarted = true
	if !t.wcollect {
		return
	}
	list := tnH2ParseSettings(t.wpayload)
	for _, e := range list {
		switch e.ID {
		case http2.SettingInitialWindowSize:
			t.libWindow = e.Val
		case http2.SettingMaxFrameSize:
			t.libFrame = e.Val
		case http2.SettingHeaderTableSize:
			t.libTable = e.Val
		}
	}
	t.acks = append(t.acks, &tnH2Ack{settings: list})
}

// Sends one of the session's frames as soon as no library frame is half written
func (t *tnH2Tap) send(frame []byte, ack *tnH2Ack) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.queued = append(t.queued, tnH2Out{frame: frame, ack: ack})
	if t.atBoundary() {
		return t.flushQueued()
	}
	return nil
}

func (t *tnH2Tap) unacked() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	n := len(t.acks)
	for _, q := range t.queued {
		if q.ack != nil {
			n++
		}
	}
	return n
}

func tnH2Frame(write func(f *http2.Framer) error) []byte {
	var buf bytes.Buffer
	write(http2.NewFramer(&buf, nil))
	return buf.Bytes()
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

// Runs a frame call now, or once the client's connection is up (as Node queues them on 'connect')
func (s *TnHttp2Session) whenConnected(fn func()) {
	if s.tap == nil && s.connecting {
		s.deferred = append(s.deferred, fn)
		return
	}
	fn()
}

func (s *TnHttp2Session) checkLive() {
	if s.destroyed {
		panic(TnNodeError("Error", "ERR_HTTP2_INVALID_SESSION", "The session has been destroyed"))
	}
}

// session.settings(settings, callback?): a SETTINGS frame; the callback and
// 'localSettings' follow the peer's ACK, as in Node
func (s *TnHttp2Session) settings(settings interface{}, cb ...interface{}) {
	s.checkLive()
	list, _, err := tnHttp2Settings(settings)
	if err != nil {
		panic(err)
	}
	var callback interface{}
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		callback = cb[0]
	}
	s.whenConnected(func() {
		if s.tap == nil || s.destroyed {
			return
		}
		// Never advertise more than the library itself can take: the peer
		// would send frames it refuses
		s.tap.mu.Lock()
		for i := range list {
			switch list[i].ID {
			case http2.SettingInitialWindowSize:
				list[i].Val = min(list[i].Val, s.tap.libWindow)
			case http2.SettingMaxFrameSize:
				list[i].Val = min(list[i].Val, s.tap.libFrame)
			case http2.SettingHeaderTableSize:
				list[i].Val = min(list[i].Val, s.tap.libTable)
			}
		}
		s.tap.mu.Unlock()
		frame := tnH2Frame(func(f *http2.Framer) error { return f.WriteSettings(list...) })
		ack := &tnH2Ack{ours: true, settings: list, cb: callback, start: time.Now()}
		if err := s.tap.send(frame, ack); err != nil {
			e := TnNetError(err, "write", "", -1)
			TnLoopPost(func() { s.destroy(e) })
		}
	})
}

// The peer acknowledged a SETTINGS frame of ours (or of the library's)
func (s *TnHttp2Session) settingsAcked(ack *tnH2Ack) {
	if s.destroyed {
		return
	}
	for _, e := range ack.settings {
		s.local.apply(e.ID, e.Val)
	}
	current := s.local.object()
	if ack.cb != nil {
		TnInvoke(ack.cb, nil, current, float64(time.Since(ack.start))/float64(time.Millisecond))
	}
	s.emit("localSettings", current)
}

// session.ping([payload], callback): the callback runs on the peer's ACK with
// (err, duration in ms, payload); true when the PING was sent
func (s *TnHttp2Session) ping(args ...interface{}) bool {
	s.checkLive()
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
	if payload != nil && len(payload) != 8 {
		panic(TnNodeError("RangeError", "ERR_HTTP2_PING_LENGTH", "HTTP2 ping payload must be 8 bytes"))
	}
	var data [8]byte
	if payload != nil {
		copy(data[:], payload)
	} else {
		cryptorand.Read(data[:])
	}
	s.whenConnected(func() {
		if s.tap == nil || s.destroyed {
			return
		}
		s.tap.mu.Lock()
		s.tap.pings[data] = tnH2Ping{cb: callback, start: time.Now()}
		s.tap.mu.Unlock()
		frame := tnH2Frame(func(f *http2.Framer) error { return f.WritePing(false, data) })
		if err := s.tap.send(frame, nil); err != nil {
			e := TnNetError(err, "write", "", -1)
			TnLoopPost(func() { TnInvoke(callback, e, float64(0), data[:]) })
		}
	})
	return true
}

// session.goaway([code[, lastStreamID[, opaqueData]]]): a notification only,
// as in Node (the session stays usable)
func (s *TnHttp2Session) goaway(args ...interface{}) {
	s.checkLive()
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
	s.whenConnected(func() {
		if s.tap == nil || s.destroyed {
			return
		}
		frame := tnH2Frame(func(f *http2.Framer) error { return f.WriteGoAway(lastStream, http2.ErrCode(code), opaque) })
		s.tap.send(frame, nil)
	})
}

// A GOAWAY from the peer: 'goaway', then a graceful close (NO_ERROR) or an
// error, as Node does
func (s *TnHttp2Session) goawayReceived(code float64, last float64, opaque []byte) {
	if s.destroyed {
		return
	}
	s.emit("goaway", code, last, opaque)
	if code == 0 {
		s.close()
	} else {
		s.destroy(TnNodeError("Error", "ERR_HTTP2_SESSION_ERROR", "Session closed with error code "+TnNumStr(code)))
	}
}

// ServerHttp2Session.altsvc(alt, originOrStream): an ALTSVC frame for an
// origin (stream 0) or for one stream
func (s *TnHttp2Session) altsvc(alt string, originOrStream interface{}) {
	s.checkLive()
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
	if origin != "" {
		u, err := tnurl.Parse(origin)
		if err != nil || u.Scheme == "" || u.Host == "" {
			panic(TnNodeError("TypeError", "ERR_INVALID_URL", "Invalid URL"))
		}
		origin = u.Scheme + "://" + u.Host
	}
	payload := make([]byte, 2, 2+len(origin)+len(alt))
	binary.BigEndian.PutUint16(payload, uint16(len(origin)))
	payload = append(payload, origin...)
	payload = append(payload, alt...)
	s.whenConnected(func() {
		if s.tap == nil || s.destroyed {
			return
		}
		frame := tnH2Frame(func(f *http2.Framer) error { return f.WriteRawFrame(http2.FrameType(tnH2FrameAltSvc), 0, streamID, payload) })
		s.tap.send(frame, nil)
	})
}

// Ends a closed session once its streams are done: the client shuts its
// connection down; the server sends GOAWAY and lets its handlers finish
func (s *TnHttp2Session) maybeFinish() {
	if !s.closed || s.finished {
		return
	}
	if s.typ == 1 && s.active > 0 {
		return
	}
	if s.typ == 0 && atomic.LoadInt32(&s.handlers) > 0 && !s.destroyed {
		return
	}
	if s.connecting && !s.destroyed {
		// closed before the connection is up: finish once it is
		return
	}
	s.finished = true
	if s.cc != nil {
		cc := s.cc
		if s.destroyed {
			cc.Close()
		} else {
			go func() {
				cc.Shutdown(context.Background())
				cc.Close()
			}()
		}
	} else if s.conn != nil {
		conn := s.conn
		if s.destroyed {
			conn.Close()
		} else {
			// The last handler has returned; give the library a moment to
			// write the stream's final frames
			if s.tap != nil {
				last := atomic.LoadUint32(&s.tap.lastPeerStream)
				s.tap.send(tnH2Frame(func(f *http2.Framer) error { return f.WriteGoAway(last, http2.ErrCodeNo, nil) }), nil)
			}
			time.AfterFunc(50*time.Millisecond, func() { conn.Close() })
		}
	}
	if s.conn == nil && s.cc == nil {
		// never connected: nothing else will report the close
		s.unref()
		TnLoopPost(func() { s.emit("close") })
	}
}

// The connection is gone (its reader stopped): 'close', once
func (s *TnHttp2Session) connClosed() {
	if s.closeEmitted {
		return
	}
	s.closeEmitted = true
	s.closed = true
	s.finished = true
	s.unref()
	for _, st := range s.pending {
		st.destroy(TnNodeError("Error", "ERR_HTTP2_STREAM_CANCEL", "The pending stream has been canceled"))
	}
	s.pending = nil
	s.emit("close")
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
	if s.finished {
		// a graceful close is under way: cut it short
		if s.cc != nil {
			s.cc.Close()
		} else if s.conn != nil {
			s.conn.Close()
		}
	}
	s.maybeFinish()
}

func (s *TnHttp2Session) streamDone() {
	s.active--
	s.maybeFinish()
}

// connect(authority, options?, listener?): one connection per session, as in
// Node; x/net/http2's ClientConn runs the protocol over the session's tap
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
	s := tnNewHttp2Session(1)
	s.origin = u.Scheme + "://" + u.Host
	s.alpnProtocol = "h2c"
	s.connecting = true
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
		var tap *tnH2Tap
		if dialErr == nil {
			var tapped net.Conn
			tap, tapped = tnNewH2Tap(conn, s, false)
			transport := &http2.Transport{AllowHTTP: cfg == nil, TLSClientConfig: cfg, DisableCompression: true}
			cc, dialErr = transport.NewClientConn(tapped)
			if dialErr != nil {
				conn.Close()
				conn = nil
			}
		}
		TnLoopPost(func() {
			defer TnLoopUnref()
			s.connecting = false
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
				s.deferred = nil
				s.destroy(e)
				return
			}
			s.cc = cc
			s.conn = conn
			s.tap = tap
			if s.destroyed {
				cc.Close()
				return
			}
			s.connectEmitted = true
			s.socket = tnInfoSocket(conn.LocalAddr(), conn.RemoteAddr().String())
			s.socket.encrypted = s.encrypted
			s.emit("connect", s, s.socket)
			deferred := s.deferred
			s.deferred = nil
			for _, fn := range deferred {
				fn()
			}
			pending := s.pending
			s.pending = nil
			for _, st := range pending {
				st.start()
			}
			s.maybeFinish()
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
	if r.ProtoMajor != 2 {
		return false
	}
	sess, _ := r.Context().Value(tnH2SessionKey{}).(*TnHttp2Session)
	listening := false
	TnLoopCall(func() {
		listening = hs.listenerCount("stream") > 0 || (sess != nil && sess.listenerCount("stream") > 0)
	})
	if !listening {
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
			st.session = sess
			if sess == nil {
				st.session = tnNewHttp2Session(0)
				st.session.socket = req.socket
				st.session.encrypted = r.TLS != nil
			}
			// client stream ids: 1, 3, 5... in the order the handlers start
			st.session.nextID += 2
			if st.session.nextID == 2 {
				st.session.nextID = 1
			}
			st.id = st.session.nextID
			if r.TLS != nil {
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
			// Node's server listens on each session first, then re-emits
			hs.emit("stream", st, headers, float64(4))
			if sess != nil {
				sess.emit("stream", st, headers, float64(4))
			}
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

type tnH2SessionKey struct{}

// The x/net/http2 server of an http2 Server (configured onto its http.Server,
// so http.Server.Shutdown sends GOAWAY on every connection), its live sessions
type tnH2ServerState struct {
	srv        *http2.Server
	allowHTTP1 bool
	mu         sync.Mutex
	sessions   map[*TnHttp2Session]struct{}
}

var tnH2Servers sync.Map

func tnH2State(hs *TnHttpServer) *tnH2ServerState {
	v, _ := tnH2Servers.Load(hs)
	st, _ := v.(*tnH2ServerState)
	return st
}

// Accepts the connections of an http2 server: each one is a session ('session'
// before its first stream), served by x/net/http2 through a tap. With
// allowHTTP1, a TLS connection that negotiated http/1.1 goes to node:http's server.
func tnHttp2Serve(hs *TnHttpServer, ln net.Listener) {
	state := tnH2State(hs)
	local := ln.Addr()
	for {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		hs.connMu.Lock()
		if atomic.LoadInt32(&hs.closing) != 0 {
			hs.connMu.Unlock()
			conn.Close()
			return
		}
		hs.inFlight.Add(1)
		hs.connMu.Unlock()
		go func() {
			if tc, ok := conn.(*tls.Conn); ok {
				if err := tc.Handshake(); err != nil {
					conn.Close()
					hs.inFlight.Done()
					return
				}
				if tc.ConnectionState().NegotiatedProtocol != "h2" {
					if state != nil && state.allowHTTP1 {
						hc := &tnHttpConn{conn: conn, closed: make(chan struct{})}
						hs.connMu.Lock()
						hs.httpConns[hc] = struct{}{}
						hs.connMu.Unlock()
						// (serveConn marks inFlight done)
						hs.serveConn(hc, local)
						return
					}
					conn.Close()
					hs.inFlight.Done()
					return
				}
			}
			tnHttp2ServeSession(hs, state, conn)
			hs.inFlight.Done()
		}()
	}
}

func tnHttp2ServeSession(hs *TnHttpServer, state *tnH2ServerState, conn net.Conn) {
	s := tnNewHttp2Session(0)
	s.conn = conn
	tap, tapped := tnNewH2Tap(conn, s, true)
	s.tap = tap
	if tc, ok := conn.(*tls.Conn); ok {
		s.encrypted = true
		s.alpnProtocol = tc.ConnectionState().NegotiatedProtocol
	} else {
		s.alpnProtocol = "h2c"
	}
	s.socket = tnInfoSocket(conn.LocalAddr(), conn.RemoteAddr().String())
	s.socket.encrypted = s.encrypted
	if state != nil {
		state.mu.Lock()
		state.sessions[s] = struct{}{}
		state.mu.Unlock()
		defer func() {
			state.mu.Lock()
			delete(state.sessions, s)
			state.mu.Unlock()
		}()
	}
	TnLoopCall(func() {
		TnAsyncRun(hs.asyncCtx, func() { hs.emit("session", s) })
	})
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&s.handlers, 1)
		defer func() {
			if atomic.AddInt32(&s.handlers, -1) == 0 {
				TnLoopPost(s.maybeFinish)
			}
		}()
		hs.ServeHTTP(w, r)
	})
	ctx := context.WithValue(context.Background(), tnH2SessionKey{}, s)
	srv := &http2.Server{}
	if state != nil {
		srv = state.srv
	}
	srv.ServeConn(tapped, &http2.ServeConnOpts{Context: ctx, Handler: handler})
	conn.Close()
	TnLoopPost(s.connClosed)
}

func init() {
	tnHttp2StreamHook = tnHttp2ServeStream
	tnHttp2ServeHook = tnHttp2Serve
	tnHttp2CloseAllHook = func(hs *TnHttpServer) {
		if state := tnH2State(hs); state != nil {
			state.mu.Lock()
			for s := range state.sessions {
				s.conn.Close()
			}
			state.mu.Unlock()
		}
	}
}

// createServer(options?, onRequest?) / createSecureServer({ key, cert, allowHTTP1 }, onRequest?)
func TnHttp2CreateServer(secure bool, args ...interface{}) *TnHttpServer {
	hs := TnNewHttpServer(secure, args...)
	hs.h2 = true
	state := &tnH2ServerState{srv: &http2.Server{}, sessions: map[*TnHttp2Session]struct{}{}}
	if secure {
		for _, a := range args {
			if a != nil && !tnIsFunc(a) {
				state.allowHTTP1, _ = TnGetValue(a, "allowHTTP1").(bool)
			}
		}
		if hs.tlsConfig == nil {
			hs.tlsConfig = &tls.Config{}
		}
		hs.tlsConfig.NextProtos = []string{"h2"}
		if state.allowHTTP1 {
			hs.tlsConfig.NextProtos = append(hs.tlsConfig.NextProtos, "http/1.1")
		}
	}
	// ServeConn then serves through hs.httpServer, whose Shutdown reaches every connection
	http2.ConfigureServer(hs.httpServer, state.srv)
	tnH2Servers.Store(hs, state)
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

const HTTP2_CONSTANTS: Record<string, string> = {
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

const HTTP2_NUMBERS: Record<string, number> = {
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

export function registerHttp2(r: NodeRegistry): void {
  defineModule(r, 'http2');
  defineHelper(
    r,
    'nodeHttp2',
    ['bytes', 'context', 'crypto/rand', 'crypto/tls', 'encoding/binary', 'fmt', 'golang.org/x/net/http2', 'io', 'math', 'net', 'net/http', 'net/url', 'os', 'sort', 'strconv', 'strings', 'sync', 'sync/atomic', 'time'],
    ['nodeHttp', 'nodeNet', 'netErrors', 'nodeStream', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'orderedMap', 'tlsConfig', 'fsErrors', 'buffer'],
    http2Helper
  );
  const use = () => r.helper('nodeHttp2');
  defineClass(
    r,
    'http2.Http2Stream',
    '*TnHttp2Stream',
    'class',
    STREAM_METHODS + '; respond=; respondWithFile=; close=; pushStream=; additionalHeaders=',
    '',
    STREAM_GETTERS + '; id=float64; session=*TnHttp2Session; sentHeaders=*TnMap[string, interface{}]; headersSent=bool; pushAllowed=bool; endAfterHeaders=bool; rstCode=float64; aborted=bool',
    ''
  );
  for (const name of ['ServerHttp2Stream', 'ClientHttp2Stream']) r.classes[`http2.${name}`] = r.classes['http2.Http2Stream'];
  defineClass(
    r,
    'http2.Http2Session',
    '*TnHttp2Session',
    'class',
    'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; emit=bool; request=*TnHttp2Stream; close=; destroy=; ref=*TnHttp2Session; unref=*TnHttp2Session; setTimeout=*TnHttp2Session; ping=bool; settings=; goaway=; altsvc=',
    '',
    'closed=bool; destroyed=bool; encrypted=bool; alpnProtocol=string; socket=*TnSocket; type=float64; connecting=bool; localSettings=interface{}; remoteSettings=interface{}; pendingSettingsAck=bool',
    ''
  );
  for (const name of ['ServerHttp2Session', 'ClientHttp2Session']) r.classes[`http2.${name}`] = r.classes['http2.Http2Session'];
  for (const name of ['Http2Server', 'Http2SecureServer']) r.classes[`http2.${name}`] = r.classes['http.Server'];
  r.classes['http2.Http2ServerRequest'] = r.classes['http.IncomingMessage'];
  r.classes['http2.Http2ServerResponse'] = r.classes['http.ServerResponse'];
  r.methods['http2.Http2Stream#pipe'] = (c: NodeCall) => {
    r.helper('nodeStream');
    return `TnPipe(${c.recv}, ${c.args.join(', ')})`;
  };
  r.typers['http2.Http2Stream#pipe'] = (c: NodeCall) => c.types[0] || '*TnStream';
  const streamListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'response' || name === 'trailers') return ['*TnMap[string, interface{}]', 'float64'];
    return streamListenerTypes(nodes);
  };
  r.paramTypers['http2.Http2Stream#on'] = streamListeners;
  r.paramTypers['http2.Http2Stream#once'] = streamListeners;
  const sessionListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'connect') return ['*TnHttp2Session', '*TnSocket'];
    if (name === 'stream') return ['*TnHttp2Stream', '*TnMap[string, interface{}]', 'float64'];
    if (name === 'ping') return ['[]byte'];
    if (name === 'goaway') return ['float64', 'float64', '[]byte'];
    if (name === 'altsvc') return ['string', 'string', 'float64'];
    if (name === 'localSettings' || name === 'remoteSettings') return ['interface{}'];
    if (name === 'error') return ['interface{}'];
    return [];
  };
  r.paramTypers['http2.Http2Session#on'] = sessionListeners;
  r.paramTypers['http2.Http2Session#once'] = sessionListeners;
  r.paramTypers['http2.Http2Session#ping'] = (_n: any[]) => ['interface{}', 'float64', '[]byte'];
  r.paramTypers['http2.Http2Session#settings'] = (_n: any[]) => ['interface{}', 'interface{}'];

  r.functions['http2.createServer'] = (c: NodeCall) => {
    use();
    return `TnHttp2CreateServer(false${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
  };
  r.functions['http2.createSecureServer'] = (c: NodeCall) => {
    use();
    return `TnHttp2CreateServer(true${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
  };
  r.paramTypers['http2.createServer'] = (_n: any[]) => ['*TnIncomingMessage', '*TnServerResponse'];
  r.paramTypers['http2.createSecureServer'] = r.paramTypers['http2.createServer'];
  r.functions['http2.connect'] = (c: NodeCall) => {
    use();
    return `TnHttp2Connect(${c.args.join(', ')})`;
  };
  r.paramTypers['http2.connect'] = (_n: any[]) => ['*TnHttp2Session', '*TnSocket'];
  r.functions['http2.getDefaultSettings'] = (_c: NodeCall) => {
    use();
    return 'TnHttp2DefaultSettings()';
  };
  r.functions['http2.getPackedSettings'] = (c: NodeCall) => {
    use();
    return `TnHttp2GetPackedSettings(${c.args.join(', ')})`;
  };
  r.functions['http2.getUnpackedSettings'] = (c: NodeCall) => {
    use();
    return `TnHttp2GetUnpackedSettings(${c.args.join(', ')})`;
  };
  setResults(
    r,
    'http2',
    'createServer=*TnHttpServer; createSecureServer=*TnHttpServer; connect=*TnHttp2Session; getDefaultSettings=interface{}; getPackedSettings=[]byte; getUnpackedSettings=interface{}'
  );
  r.objects['http2.constants'] = true;
  for (const name of Object.keys(HTTP2_CONSTANTS)) {
    const text = HTTP2_CONSTANTS[name];
    r.values[`http2.constants.${name}`] = (_c: NodeCall) => JSON.stringify(text);
    r.valueTypes[`http2.constants.${name}`] = 'string';
  }
  for (const name of Object.keys(HTTP2_NUMBERS)) {
    const value = HTTP2_NUMBERS[name];
    r.values[`http2.constants.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`http2.constants.${name}`] = 'float64';
  }
}
