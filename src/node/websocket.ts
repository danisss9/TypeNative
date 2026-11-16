// globals.WebSocket — the WHATWG WebSocket client (RFC 6455) over net / tls,
// like Node 26's. The handshake is an HTTP/1.1 Upgrade request written on the
// connection; after the 101 reply the raw socket speaks WebSocket frames,
// masked, as a client's must be. A read goroutine parses frames and posts
// open / message / close events to the loop; a writer goroutine drains an
// outbound queue, so a slow peer never blocks the loop and bufferedAmount
// counts the bytes not yet on the wire.

import { NodeRegistry, NodeCall, defineClass, defineHelper } from './registry.js';

const wsHelper = `// globals.WebSocket (RFC 6455)

const tnWsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

const (
	tnWsConnecting = 0
	tnWsOpen       = 1
	tnWsClosing    = 2
	tnWsClosed     = 3
)

type wsFrame struct {
	opcode  byte
	payload []byte
}

type TnWebSocket struct {
	TnEventTarget
	url        string
	origin     string
	protocol   string
	binaryType string
	state      int
	asyncCtx   TnAsyncContext
	onopen     interface{}
	onmessage  interface{}
	onerror    interface{}
	onclose    interface{}
	// The handshake request (written before the dial goroutine starts)
	secure      bool
	address     string
	hostHeader  string
	requestPath string
	protocols   []string
	headerPairs [][2]string
	// close() while connecting: the reply is discarded, as in undici (1006)
	canceled bool
	// The closing handshake, touched on the loop only
	sentClose     bool
	emitCloseDone bool
	// Whether the dial's loop ref is still ours to release (open connections)
	refHeld bool
	// The connection and the writer goroutine's queue
	queueMu    sync.Mutex
	conn       net.Conn
	outbound   []wsFrame
	buffered   float64
	kick       chan struct{}
	writerDone chan struct{}
}

func tnWsURLString(input interface{}) string {
	switch x := input.(type) {
	case string:
		return x
	case interface{ Get_href() string }:
		return x.Get_href()
	}
	return TnJSString(input)
}

// The address to dial and the Host header's value (no default port)
func tnWsHostParts(u *tnurl.URL, secure bool) (string, string) {
	host := u.Hostname()
	port := u.Port()
	defaultPort := "80"
	if secure {
		defaultPort = "443"
	}
	if port == "" {
		port = defaultPort
	}
	header := host
	if port != defaultPort {
		header = net.JoinHostPort(host, port)
	}
	return net.JoinHostPort(host, port), header
}

// An RFC 7230 token (a subprotocol's name)
func tnWsValidToken(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case strings.ContainsRune("!#$%&'*+-.^_\\x60|~", c):
		default:
			return false
		}
	}
	return true
}

func tnWsProtocols(value interface{}) []string {
	out := []string{}
	switch v := value.(type) {
	case string:
		if v != "" {
			out = append(out, v)
		}
	case []string:
		out = append(out, v...)
	}
	return out
}

// headers init: a Headers instance, a record / object literal, or pairs
func tnWsHeaderPairs(init interface{}) [][2]string {
	out := [][2]string{}
	if init == nil || TnIsNil(init) {
		return out
	}
	switch src := init.(type) {
	case interface{ entries() [][]string }:
		for _, e := range src.entries() {
			out = append(out, [2]string{e[0], e[1]})
		}
	case [][]string:
		for _, e := range src {
			if len(e) == 2 {
				out = append(out, [2]string{e[0], e[1]})
			}
		}
	case [][]interface{}:
		for _, e := range src {
			if len(e) == 2 {
				out = append(out, [2]string{TnJSString(e[0]), TnJSString(e[1])})
			}
		}
	case []interface{}:
		for _, item := range src {
			if pair, ok := item.([]interface{}); ok && len(pair) == 2 {
				out = append(out, [2]string{TnJSString(pair[0]), TnJSString(pair[1])})
			} else if pair, ok := item.([]string); ok && len(pair) == 2 {
				out = append(out, [2]string{pair[0], pair[1]})
			}
		}
	default:
		if m, ok := init.(map[string]string); ok {
			keys := make([]string, 0, len(m))
			for k := range m {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				out = append(out, [2]string{k, m[k]})
			}
		} else if m, ok := init.(map[string]interface{}); ok {
			keys := make([]string, 0, len(m))
			for k := range m {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			for _, k := range keys {
				out = append(out, [2]string{k, TnJSString(m[k])})
			}
		} else if entries, ok := init.(interface{ Entries() [][]interface{} }); ok {
			for _, e := range entries.Entries() {
				out = append(out, [2]string{fmt.Sprint(e[0]), TnJSString(e[1])})
			}
		}
	}
	return out
}

func tnWsHasToken(value string, token string) bool {
	for _, part := range strings.Split(value, ",") {
		if strings.EqualFold(strings.TrimSpace(part), token) {
			return true
		}
	}
	return false
}

// new WebSocket(url, protocols? | { protocols, headers })
func TnNewWebSocket(args ...interface{}) *TnWebSocket {
	ws := &TnWebSocket{state: tnWsConnecting, binaryType: "blob", kick: make(chan struct{}, 1), writerDone: make(chan struct{})}
	ws.tnSelf = ws
	ws.asyncCtx = TnAsyncSnapshot()
	var raw interface{}
	var headersInit interface{}
	if len(args) > 0 {
		raw = args[0]
	}
	if len(args) > 1 && args[1] != nil && !TnIsNil(args[1]) {
		switch v := args[1].(type) {
		case string, []string:
			ws.protocols = tnWsProtocols(v)
		default:
			ws.protocols = tnWsProtocols(TnGet(v, "protocols"))
			headersInit = TnGet(v, "headers")
		}
	}
	for _, p := range ws.protocols {
		if !tnWsValidToken(p) {
			panic(TnNewDOMException("Failed to construct 'WebSocket': The subprotocol '"+p+"' is invalid.", "SyntaxError"))
		}
	}
	ws.headerPairs = tnWsHeaderPairs(headersInit)
	u, err := tnurl.Parse(tnWsURLString(raw))
	if err != nil || u.Scheme == "" || u.Host == "" {
		panic(TnNewDOMException("TypeError: Invalid URL", "SyntaxError"))
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "ws" && scheme != "wss" {
		panic(TnNewDOMException("expected a ws: or wss: url", "SyntaxError"))
	}
	ws.secure = scheme == "wss"
	ws.address, ws.hostHeader = tnWsHostParts(u, ws.secure)
	// WHATWG URLs have a path: ws://host is ws://host/
	if u.Path == "" && u.Opaque == "" {
		u.Path = "/"
	}
	ws.url = u.String()
	ws.origin = scheme + "://" + ws.hostHeader
	ws.requestPath = u.RequestURI()
	if ws.requestPath == "" {
		ws.requestPath = "/"
	}
	ws.dial()
	return ws
}

// The handshake on its own goroutine: dial, request, read the 101
func (ws *TnWebSocket) dial() {
	TnLoopRef()
	go func() {
		var conn net.Conn
		var err error
		if ws.secure {
			conn, err = tls.Dial("tcp", ws.address, &tls.Config{MinVersion: tls.VersionTLS12})
		} else {
			conn, err = net.Dial("tcp", ws.address)
		}
		var br *bufio.Reader
		var resp *http.Response
		var accept string
		if err == nil {
			keyBytes := make([]byte, 16)
			if _, err = cryptorand.Read(keyBytes); err == nil {
				key := base64.StdEncoding.EncodeToString(keyBytes)
				// The headers the handshake needs are written last, so they win
				request := "GET " + ws.requestPath + " HTTP/1.1\\r\\nHost: " + ws.hostHeader + "\\r\\n"
				for _, pair := range ws.headerPairs {
					request += pair[0] + ": " + pair[1] + "\\r\\n"
				}
				request += "Upgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Key: " + key + "\\r\\nSec-WebSocket-Version: 13\\r\\n"
				if len(ws.protocols) > 0 {
					request += "Sec-WebSocket-Protocol: " + strings.Join(ws.protocols, ", ") + "\\r\\n"
				}
				request += "\\r\\n"
				if _, err = conn.Write([]byte(request)); err == nil {
					br = bufio.NewReader(conn)
					resp, err = http.ReadResponse(br, &http.Request{Method: "GET"})
				}
				h := sha1.New()
				h.Write([]byte(key + tnWsGUID))
				accept = base64.StdEncoding.EncodeToString(h.Sum(nil))
			}
		}
		ws.post(func() {
			if ws.canceled {
				TnLoopUnref()
				if conn != nil {
					conn.Close()
				}
				ws.emitClose(1006, "", false)
				return
			}
			if err != nil {
				TnLoopUnref()
				if conn != nil {
					conn.Close()
				}
				ws.emitError(nil)
				ws.emitClose(1006, "", false)
				return
			}
			// The handshake failure paths below release the dial's loop ref; an
			// open connection keeps it until emitClose
			if resp.StatusCode != 101 || !tnWsHasToken(resp.Header.Get("Upgrade"), "websocket") || !tnWsHasToken(resp.Header.Get("Connection"), "upgrade") || resp.Header.Get("Sec-WebSocket-Accept") != accept {
				TnLoopUnref()
				conn.Close()
				ws.emitError(TnNodeError("TypeError", "", "Unexpected server response: "+strconv.Itoa(resp.StatusCode)))
				ws.emitClose(1006, "", false)
				return
			}
			// The server's subprotocol: exactly one, one of the requested ones
			var offered []string
			for _, value := range resp.Header.Values("Sec-WebSocket-Protocol") {
				for _, part := range strings.Split(value, ",") {
					if part = strings.TrimSpace(part); part != "" {
						offered = append(offered, part)
					}
				}
			}
			bad := len(offered) > 1 || (len(offered) == 1 && len(ws.protocols) == 0)
			if len(offered) == 1 {
				ok := false
				for _, p := range ws.protocols {
					if p == offered[0] {
						ok = true
					}
				}
				bad = !ok
			}
			if bad {
				TnLoopUnref()
				conn.Close()
				ws.emitError(TnNodeError("TypeError", "", "Invalid Sec-WebSocket-Protocol header"))
				ws.emitClose(1006, "", false)
				return
			}
			ws.queueMu.Lock()
			ws.conn = conn
			ws.queueMu.Unlock()
			ws.refHeld = true
			ws.protocol = ""
			if len(offered) == 1 {
				ws.protocol = offered[0]
			}
			ws.state = tnWsOpen
			ws.emitEvent(TnNewEvent("open"))
			go ws.readLoop(br)
			go ws.writeLoop()
		})
	}()
}

// Queues fn on the loop, in the constructor's async context
func (ws *TnWebSocket) post(fn func()) {
	ctx := ws.asyncCtx
	if ctx == nil {
		TnLoopPost(fn)
		return
	}
	TnLoopPost(func() { TnAsyncRun(ctx, fn) })
}

func (ws *TnWebSocket) emitEvent(ev *TnEvent) {
	switch ev.eventType {
	case "open":
		if ws.onopen != nil {
			TnInvoke(ws.onopen, ev)
		}
	case "message":
		if ws.onmessage != nil {
			TnInvoke(ws.onmessage, ev)
		}
	case "error":
		if ws.onerror != nil {
			TnInvoke(ws.onerror, ev)
		}
	case "close":
		if ws.onclose != nil {
			TnInvoke(ws.onclose, ev)
		}
	}
	ws.dispatchEvent(ev)
}

func (ws *TnWebSocket) emitError(err interface{}) {
	ev := TnNewErrorEvent("error")
	ev.error_ = err
	ws.emitEvent(ev)
}

// The final 'close' event: tears down the connection and the loop ref
func (ws *TnWebSocket) emitClose(code float64, reason string, clean bool) {
	if ws.emitCloseDone {
		return
	}
	ws.emitCloseDone = true
	ws.state = tnWsClosed
	ws.queueMu.Lock()
	conn := ws.conn
	ws.conn = nil
	ws.queueMu.Unlock()
	if conn != nil {
		conn.Close()
	}
	close(ws.writerDone)
	if ws.refHeld {
		ws.refHeld = false
		TnLoopUnref()
	} else {
	}
	ws.emitEvent(TnNewCloseEvent("close", map[string]interface{}{"code": code, "reason": reason, "wasClean": clean}))
}

// Waits for the writer to drain (yielding to other loop tasks), then finishes
// a clean close
func (ws *TnWebSocket) finishWhenDrained(code float64, reason string) {
	ws.queueMu.Lock()
	drained := len(ws.outbound) == 0
	ws.queueMu.Unlock()
	if drained {
		ws.emitClose(code, reason, true)
		return
	}
	ws.post(func() { ws.finishWhenDrained(code, reason) })
}

// The server's close frame: echo it, then 'close' with its code and reason
func (ws *TnWebSocket) serverClosed(code float64, reason string) {
	if ws.emitCloseDone {
		return
	}
	if !ws.sentClose {
		ws.sendCloseFrame(code, reason)
	}
	ws.finishWhenDrained(code, reason)
}

// The connection dropped without (or before) a close frame: 1006, unclean
func (ws *TnWebSocket) abnormalClose() {
	if ws.emitCloseDone {
		return
	}
	ws.emitClose(1006, "", false)
}

func (ws *TnWebSocket) sendCloseFrame(code float64, reason string) {
	if ws.sentClose {
		return
	}
	ws.sentClose = true
	payload := []byte{}
	if code != 1005 && (code == 1000 || (code >= 3000 && code <= 4999)) {
		payload = append(payload, byte(int(code)>>8), byte(int(code)))
	}
	payload = append(payload, reason...)
	ws.enqueue(wsFrame{opcode: 8, payload: payload})
}

// close(code?, reason?): validates like undici, then the closing handshake
func (ws *TnWebSocket) close(args ...interface{}) {
	code := float64(1005)
	hasCode := false
	reason := ""
	if len(args) > 0 && args[0] != nil {
		if n, ok := tnNetNumber(args[0]); ok {
			code, hasCode = n, true
		}
	}
	if len(args) > 1 && args[1] != nil {
		if s, ok := args[1].(string); ok {
			reason = s
		}
	}
	if hasCode && code != 1000 && (code < 3000 || code > 4999) {
		panic(TnNewDOMException("invalid code", "InvalidAccessError"))
	}
	if len(reason) > 123 {
		panic(TnNewDOMException("Reason must be less than 123 bytes; received "+strconv.Itoa(len(reason)), "SyntaxError"))
	}
	switch ws.state {
	case tnWsConnecting:
		ws.canceled = true
	case tnWsOpen:
		ws.state = tnWsClosing
		ws.sendCloseFrame(code, reason)
	}
}

// send(data): a text frame for strings, a binary one for bytes
func (ws *TnWebSocket) send(data interface{}) {
	if ws.state == tnWsConnecting {
		panic(TnNewDOMException("Sent before connected.", "InvalidStateError"))
	}
	if ws.state != tnWsOpen {
		return
	}
	switch v := data.(type) {
	case string:
		ws.enqueue(wsFrame{opcode: 1, payload: []byte(v)})
	case []byte:
		ws.enqueue(wsFrame{opcode: 2, payload: append([]byte{}, v...)})
	case *TnBlob:
		ws.enqueue(wsFrame{opcode: 2, payload: append([]byte{}, v.data...)})
	default:
		panic(TnNodeError("TypeError", "", "Failed to convert value to 'WebsocketMessageValue'."))
	}
}

func (ws *TnWebSocket) enqueue(f wsFrame) {
	ws.queueMu.Lock()
	ws.outbound = append(ws.outbound, f)
	ws.buffered += float64(len(f.payload))
	ws.queueMu.Unlock()
	select {
	case ws.kick <- struct{}{}:
	default:
	}
}

// Drains the queue on its own goroutine: sends never block the loop
func (ws *TnWebSocket) writeLoop() {
	for {
		select {
		case <-ws.writerDone:
			return
		case <-ws.kick:
		}
		for {
			ws.queueMu.Lock()
			if len(ws.outbound) == 0 {
				ws.queueMu.Unlock()
				break
			}
			f := ws.outbound[0]
			ws.outbound[0] = wsFrame{}
			ws.outbound = ws.outbound[1:]
			conn := ws.conn
			ws.queueMu.Unlock()
			if conn == nil {
				return
			}
			if err := tnWsWriteFrame(conn, f.opcode, f.payload); err != nil {
				ws.post(func() { ws.abnormalClose() })
				return
			}
			ws.queueMu.Lock()
			ws.buffered -= float64(len(f.payload))
			ws.queueMu.Unlock()
		}
	}
}

// A masked client frame (RFC 6455 5.3)
func tnWsWriteFrame(conn net.Conn, opcode byte, payload []byte) error {
	header := []byte{0x80 | opcode}
	n := len(payload)
	switch {
	case n < 126:
		header = append(header, 0x80|byte(n))
	case n <= 0xFFFF:
		header = append(header, 0x80|126, byte(n>>8), byte(n))
	default:
		header = append(header, 0x80|127)
		var big [8]byte
		binary.BigEndian.PutUint64(big[:], uint64(n))
		header = append(header, big[:]...)
	}
	key := make([]byte, 4)
	if _, err := cryptorand.Read(key); err != nil {
		return err
	}
	header = append(header, key...)
	masked := make([]byte, n)
	for i, b := range payload {
		masked[i] = b ^ key[i%4]
	}
	_, err := conn.Write(append(header, masked...))
	return err
}

// Parses frames and posts events, on its own goroutine
func (ws *TnWebSocket) readLoop(br *bufio.Reader) {
	var (
		message    []byte
		messageOp  byte
		inFragment bool
	)
	readN := func(n int) ([]byte, bool) {
		if n == 0 {
			return []byte{}, true
		}
		buf := make([]byte, n)
		if _, err := io.ReadFull(br, buf); err != nil {
			return nil, false
		}
		return buf, true
	}
	fail := func(code float64) {
		ws.post(func() {
			if !ws.emitCloseDone {
				ws.emitClose(code, "", false)
			}
		})
	}
	drop := func() {
		ws.post(ws.abnormalClose)
	}
	for {
		head, ok := readN(2)
		if !ok {
			drop()
			return
		}
		fin := head[0]&0x80 != 0
		opcode := head[0] & 0x0f
		if head[0]&0x70 != 0 || head[1]&0x80 != 0 {
			fail(1002)
			return
		}
		length := int(head[1] & 0x7f)
		if head[1]&0x7f == 126 {
			ext, ok2 := readN(2)
			if !ok2 {
				drop()
				return
			}
			length = int(binary.BigEndian.Uint16(ext))
		} else if head[1]&0x7f == 127 {
			ext, ok2 := readN(8)
			if !ok2 {
				drop()
				return
			}
			big := binary.BigEndian.Uint64(ext)
			if big > 1<<31 {
				fail(1002)
				return
			}
			length = int(big)
		}
		if opcode >= 8 && length > 125 {
			fail(1002)
			return
		}
		payload, ok2 := readN(length)
		if !ok2 {
			drop()
			return
		}
		switch opcode {
		case 1, 2:
			if fin {
				ws.deliver(opcode, payload)
			} else if !inFragment {
				inFragment = true
				messageOp = opcode
				message = append(message[:0], payload...)
			} else {
				fail(1002)
				return
			}
		case 0:
			if !inFragment {
				fail(1002)
				return
			}
			message = append(message, payload...)
			if fin {
				inFragment = false
				ws.deliver(messageOp, append([]byte{}, message...))
			}
		case 9:
			// ping: pong with the same payload
			ws.enqueue(wsFrame{opcode: 10, payload: append([]byte{}, payload...)})
		case 10:
			// pong: nothing to do
		case 8:
			code, reason := float64(1005), ""
			if len(payload) == 1 {
				fail(1002)
				return
			}
			if len(payload) >= 2 {
				code = float64(binary.BigEndian.Uint16(payload))
				reason = string(payload[2:])
			}
			ws.post(func() { ws.serverClosed(code, reason) })
			return
		default:
			fail(1002)
			return
		}
	}
}

// A data frame's event (text is UTF-8; binary follows binaryType)
func (ws *TnWebSocket) deliver(opcode byte, payload []byte) {
	if opcode == 1 && !utf8.Valid(payload) {
		fail := func() {
			ws.post(func() {
				if !ws.emitCloseDone {
					ws.emitClose(1007, "", false)
				}
			})
		}
		fail()
		return
	}
	var data interface{}
	if opcode == 1 {
		data = string(payload)
	} else if ws.binaryType == "arraybuffer" {
		data = payload
	} else {
		data = &TnBlob{data: payload}
	}
	ws.post(func() {
		if ws.emitCloseDone {
			return
		}
		ws.emitEvent(TnNewMessageEvent("message", map[string]interface{}{"data": data, "origin": ws.origin}))
	})
}

func (ws *TnWebSocket) Get_readyState() float64 { return float64(ws.state) }
func (ws *TnWebSocket) Get_extensions() string  { return "" }
func (ws *TnWebSocket) Get_protocol() string    { return ws.protocol }
func (ws *TnWebSocket) Get_url() string         { return ws.url }
func (ws *TnWebSocket) Get_CONNECTING() float64 { return tnWsConnecting }
func (ws *TnWebSocket) Get_OPEN() float64       { return tnWsOpen }
func (ws *TnWebSocket) Get_CLOSING() float64    { return tnWsClosing }
func (ws *TnWebSocket) Get_CLOSED() float64     { return tnWsClosed }
func (ws *TnWebSocket) Get_binaryType() string  { return ws.binaryType }

func (ws *TnWebSocket) Set_binaryType(v interface{}) {
	if s, ok := v.(string); ok && (s == "blob" || s == "arraybuffer") {
		ws.binaryType = s
	}
}

func (ws *TnWebSocket) Get_bufferedAmount() float64 {
	ws.queueMu.Lock()
	defer ws.queueMu.Unlock()
	return ws.buffered
}

func (ws *TnWebSocket) Get_onopen() interface{}   { return ws.onopen }
func (ws *TnWebSocket) Get_onmessage() interface{} { return ws.onmessage }
func (ws *TnWebSocket) Get_onerror() interface{}  { return ws.onerror }
func (ws *TnWebSocket) Get_onclose() interface{}  { return ws.onclose }
func (ws *TnWebSocket) Set_onopen(fn interface{}) { ws.onopen = fn }
func (ws *TnWebSocket) Set_onmessage(fn interface{}) { ws.onmessage = fn }
func (ws *TnWebSocket) Set_onerror(fn interface{})   { ws.onerror = fn }
func (ws *TnWebSocket) Set_onclose(fn interface{})   { ws.onclose = fn }
`;

export function registerWebSocket(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeWebsocket',
    ['bufio', 'crypto/rand', 'crypto/sha1', 'crypto/tls', 'encoding/base64', 'encoding/binary', 'fmt', 'io', 'net', 'net/http', 'net/url', 'sort', 'strconv', 'strings', 'sync', 'unicode/utf8'],
    ['nodeStreamWeb', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'error', 'domException', 'netErrors'],
    wsHelper
  );
  const use = () => r.helper('nodeWebsocket');
  defineClass(
    r,
    'globals.WebSocket',
    '*TnWebSocket',
    'class',
    'send=; close=',
    '',
    'readyState=float64; bufferedAmount=float64; extensions=string; protocol=string; url=string; binaryType=string; CONNECTING=float64; OPEN=float64; CLOSING=float64; CLOSED=float64; onopen=interface{}; onmessage=interface{}; onerror=interface{}; onclose=interface{}',
    'binaryType; onopen; onmessage; onerror; onclose'
  );
  r.globals['WebSocket'] = 'globals.WebSocket';
  r.constructors['globals.WebSocket'] = (c: NodeCall) => {
    use();
    return `TnNewWebSocket(${c.args.join(', ')})`;
  };
  for (const [name, value] of [
    ['CONNECTING', 0],
    ['OPEN', 1],
    ['CLOSING', 2],
    ['CLOSED', 3]
  ]) {
    r.values[`globals.WebSocket.${name}`] = (_c: NodeCall) => `float64(${value})`;
    r.valueTypes[`globals.WebSocket.${name}`] = 'float64';
  }
  r.paramTypers['globals.WebSocket#addEventListener'] = (_n: any[]) => ['*TnEvent'];
  r.paramTypers['globals.WebSocket#removeEventListener'] = (_n: any[]) => ['*TnEvent'];
}
