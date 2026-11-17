// node:http / node:https — servers and clients on Go's net/http.
//
// Server: a net/http handler goroutine per request streams the body into an
// IncomingMessage (a Readable) and posts 'request' to the loop; the
// ServerResponse (a Writable) queues header / body / end operations that the
// handler goroutine applies, so the ResponseWriter is only touched there.
// Client: http.request returns a ClientRequest (a Writable); the request goes
// out on the first write or on end(), the response is an IncomingMessage.
// Like Node: no redirects are followed and bodies are not decompressed.
import { defineClass, defineHelper, defineModule, setResults, isStringNode, isObjectLiteral, goString } from './registry.js';
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

// Header bytes the strict parser accepts: a token name, and a value without
// control bytes other than tab (obs-text is allowed, as in Node's strict mode)
func tnHTTP1ValidName(k []byte) bool {
	if len(k) == 0 {
		return false
	}
	for _, c := range k {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || strings.IndexByte("!#$%&'*+-.^_\\x60|~", c) >= 0) {
			return false
		}
	}
	return true
}

func tnHTTP1ValidValue(v []byte) bool {
	for _, c := range v {
		if c != '\t' && (c < 0x20 || c == 0x7f) {
			return false
		}
	}
	return true
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

func tnLowerASCII(s string) string {
	if s == "Content-Length" {
		return "content-length"
	}
	if s == "Content-Type" {
		return "content-type"
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'A' && c <= 'Z') || c >= 0x80 {
			return strings.ToLower(s)
		}
	}
	return s
}

type tnHeaderEntry struct {
	key   string
	name  string
	value interface{}
}

// Outgoing headers: case-insensitive, keeping the first spelling and the order
type tnHeaderStore struct {
	entries []tnHeaderEntry
	buf     [4]tnHeaderEntry
}

func (h *tnHeaderStore) set(name string, value interface{}) {
	key := tnLowerASCII(name)
	for i := range h.entries {
		if h.entries[i].key == key {
			h.entries[i].value = value
			return
		}
	}
	if h.entries == nil {
		h.entries = h.buf[:0]
	}
	h.entries = append(h.entries, tnHeaderEntry{key: key, name: name, value: value})
}

func (h *tnHeaderStore) get(name string) interface{} {
	key := tnLowerASCII(name)
	for i := range h.entries {
		if h.entries[i].key == key {
			return h.entries[i].value
		}
	}
	return nil
}

func (h *tnHeaderStore) has(name string) bool {
	key := tnLowerASCII(name)
	for i := range h.entries {
		if h.entries[i].key == key {
			return true
		}
	}
	return false
}

func (h *tnHeaderStore) remove(name string) {
	key := tnLowerASCII(name)
	for i := range h.entries {
		if h.entries[i].key == key {
			h.entries = append(h.entries[:i], h.entries[i+1:]...)
			return
		}
	}
}

func (h *tnHeaderStore) record() *TnMap[string, interface{}] {
	m := TnNewMap[string, interface{}]()
	for i := range h.entries {
		m.Set(h.entries[i].key, h.entries[i].value)
	}
	return m
}

func (h *tnHeaderStore) keys() []string {
	out := make([]string, len(h.entries))
	for i := range h.entries {
		out[i] = h.entries[i].key
	}
	return out
}

func (h *tnHeaderStore) rawNames() []string {
	out := make([]string, len(h.entries))
	for i := range h.entries {
		out[i] = h.entries[i].name
	}
	return out
}

func (h *tnHeaderStore) toGo(dst http.Header) {
	for i := range h.entries {
		name := h.entries[i].name
		canon := http.CanonicalHeaderKey(name)
		dst.Del(name)
		for _, v := range tnHeaderStrings(h.entries[i].value) {
			dst[canon] = append(dst[canon], v)
		}
	}
}

func (h *tnHeaderStore) setAll(headers interface{}) {
	if headers == nil {
		return
	}
	switch m := headers.(type) {
	case *TnMap[string, string]:
		if m != nil {
			for k, v := range m.All() {
				h.set(k, v)
			}
		}
		return
	case *TnMap[string, interface{}]:
		if m != nil {
			for k, v := range m.All() {
				h.set(k, v)
			}
		}
		return
	}
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
	hdrs             *TnMap[string, string]
	hdrsDistinct     *TnMap[string, []string]
	rawHdrs          []string
	trlrs            *TnMap[string, string]
	statusCode       float64
	statusMessage    string
	complete         bool
	aborted          bool
	socket           *TnSocket
	rawGoHeader      http.Header
	rawHost          string
	rawChunked       bool
	rawH2            bool
	rawTLS           bool
	rawHeaderBlock   []byte
	rawLocal         net.Addr
	rawRemote        string
	sig              *TnAbortSignal
}

func (m *TnIncomingMessage) ensureSocket() *TnSocket {
	if m.socket == nil && (m.rawLocal != nil || m.rawRemote != "") {
		m.socket = tnInfoSocket(m.rawLocal, m.rawRemote)
		if m.rawTLS {
			m.socket.encrypted = true
		}
	}
	return m.socket
}

func (m *TnIncomingMessage) Get_socket() *TnSocket     { return m.ensureSocket() }
func (m *TnIncomingMessage) Get_connection() *TnSocket { return m.ensureSocket() }
func (m *TnIncomingMessage) setTimeout(ms float64, cb ...interface{}) *TnIncomingMessage {
	if s := m.ensureSocket(); s != nil {
		s.setTimeout(ms, cb...)
	}
	return m
}

func (m *TnIncomingMessage) ensureHeaders() {
	if m.hdrs != nil {
		return
	}
	if len(m.rawHeaderBlock) > 0 {
		tnIncomingHeadersRaw(m, m.rawHeaderBlock)
		return
	}
	tnBuildIncomingHeaders(m, m.rawGoHeader, m.rawHost, m.rawChunked)
	if m.rawH2 {
		tnPseudoHeaders(m)
	}
}

func (m *TnIncomingMessage) Get_headers() *TnMap[string, string] {
	m.ensureHeaders()
	return m.hdrs
}

func (m *TnIncomingMessage) Get_headersDistinct() *TnMap[string, []string] {
	m.ensureHeaders()
	return m.hdrsDistinct
}

func (m *TnIncomingMessage) Get_rawHeaders() []string {
	m.ensureHeaders()
	return m.rawHdrs
}

func (m *TnIncomingMessage) Get_trailers() *TnMap[string, string] {
	if m.trlrs == nil {
		m.trlrs = TnNewMap[string, string]()
	}
	return m.trlrs
}

func tnIncomingHeadersRaw(m *TnIncomingMessage, raw []byte) {
	m.hdrs = TnNewMap[string, string]()
	m.hdrsDistinct = TnNewMap[string, []string]()
	m.rawHdrs = []string{}
	rest := raw
	for len(rest) > 0 {
		idx := bytes.IndexByte(rest, '\\n')
		var line []byte
		if idx < 0 {
			line = rest
			rest = nil
		} else {
			line = rest[:idx]
			rest = rest[idx+1:]
		}
		if len(line) > 0 && line[len(line)-1] == '\\r' {
			line = line[:len(line)-1]
		}
		if len(line) == 0 {
			break
		}
		colon := bytes.IndexByte(line, ':')
		if colon <= 0 {
			continue
		}
		name := string(bytes.TrimSpace(line[:colon]))
		val := string(bytes.TrimSpace(line[colon+1:]))
		key := tnLowerASCII(name)
		m.rawHdrs = append(m.rawHdrs, name, val)
		if existing, ok := m.hdrsDistinct.Lookup(key); ok {
			m.hdrsDistinct.Set(key, append(existing, val))
			sep := ", "
			if key == "cookie" {
				sep = "; "
			}
			m.hdrs.Set(key, m.hdrs.Get(key)+sep+val)
		} else {
			m.hdrsDistinct.Set(key, []string{val})
			m.hdrs.Set(key, val)
		}
	}
}

// Headers as Node shows them: lower-case names, repeated values joined
func tnIncomingHeaders(m *TnIncomingMessage, h http.Header, host string, chunked bool) {
	m.rawGoHeader = h
	m.rawHost = host
	m.rawChunked = chunked
}

func tnBuildIncomingHeaders(m *TnIncomingMessage, h http.Header, host string, chunked bool) {
	m.hdrs = TnNewMap[string, string]()
	m.hdrsDistinct = TnNewMap[string, []string]()
	m.rawHdrs = []string{}
	add := func(name string, values []string) {
		key := tnLowerASCII(name)
		for _, v := range values {
			m.rawHdrs = append(m.rawHdrs, name, v)
		}
		m.hdrsDistinct.Set(key, append([]string{}, values...))
		sep := ", "
		if key == "cookie" {
			sep = "; "
		}
		m.hdrs.Set(key, strings.Join(values, sep))
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
	if chunked && !m.hdrs.Has("transfer-encoding") {
		add("Transfer-Encoding", []string{"chunked"})
	}
}

func tnNewIncoming() *TnIncomingMessage {
	m := &TnIncomingMessage{}
	m.flowing = -1
	m.decodeStrings = true
	m.readableSide = true
	m.asyncCtx = TnAsyncSnapshot()
	m.tnSelf = m
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
	status    int
	statusMsg string
	header    http.Header
	trailer   http.Header
	data      []byte
	end       bool
	// Header ops: send the headers now (flushHeaders) instead of with the body
	flush     bool
	// a 1xx informational response (writeInformation), before the real one
	info      bool
	done      func(err error)
}

// http.ServerResponse
type TnServerResponse struct {
	TnStream
	statusCode    float64
	statusMessage string
	sendDate      bool
	headersSent   bool
	wroteHead     bool
	wroteData     bool
	inSyncTurn    bool
	fastEnd       bool
	fastBody      []byte
	store         tnHeaderStore
	req           *TnIncomingMessage
	mu            sync.Mutex
	ops           []tnResOp
	signal        chan struct{}
	trailer       http.Header
	// end(chunk) is writing its chunk; endPosted: that write also ended the response
	lastWrite     bool
	endPosted     bool
}

func (res *TnServerResponse) Get_headersSent() bool       { return res.headersSent || res.wroteHead }
func (res *TnServerResponse) Get_req() *TnIncomingMessage { return res.req }
func (res *TnServerResponse) Get_socket() *TnSocket       { return res.req.Get_socket() }
func (res *TnServerResponse) Get_statusCode() float64     { return res.statusCode }
func (res *TnServerResponse) Set_statusCode(v float64)    { res.statusCode = v }
func (res *TnServerResponse) Get_statusMessage() string   { return res.statusMessage }
func (res *TnServerResponse) Set_statusMessage(v string)  { res.statusMessage = v }
func (res *TnServerResponse) Get_sendDate() bool          { return res.sendDate }
func (res *TnServerResponse) Set_sendDate(v bool)         { res.sendDate = v }

func (res *TnServerResponse) sig() chan struct{} {
	res.mu.Lock()
	if res.signal == nil {
		res.signal = make(chan struct{}, 1)
	}
	ch := res.signal
	res.mu.Unlock()
	return ch
}

// Queues an op without waking the handler goroutine (it goes out with the next post)
func (res *TnServerResponse) queue(op tnResOp) {
	res.mu.Lock()
	res.ops = append(res.ops, op)
	res.mu.Unlock()
}

func (res *TnServerResponse) post(op tnResOp) {
	res.mu.Lock()
	res.ops = append(res.ops, op)
	if res.signal == nil {
		res.signal = make(chan struct{}, 1)
	}
	ch := res.signal
	res.mu.Unlock()
	select {
	case ch <- struct{}{}:
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
	res.wroteHead = true
	return tnResOp{status: int(res.statusCode), statusMsg: res.statusMessage, header: h}
}

func (res *TnServerResponse) setHeader(name string, value interface{}) *TnServerResponse {
	if res.headersSent || res.wroteHead {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot set headers after they are sent to the client"))
	}
	res.store.set(name, value)
	return res
}

func (res *TnServerResponse) setHeaders(headers interface{}) *TnServerResponse {
	if res.headersSent || res.wroteHead {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot set headers after they are sent to the client"))
	}
	res.store.setAll(headers)
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

func (res *TnServerResponse) writeHeadKV(status float64, k string, v string) *TnServerResponse {
	if res.headersSent || res.wroteHead {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot write headers after they are sent to the client"))
	}
	res.statusCode = status
	res.store.set(k, v)
	res.wroteHead = true
	return res
}

// writeHead(status, [statusMessage], [headers])
func (res *TnServerResponse) writeHead(status float64, args ...interface{}) *TnServerResponse {
	if res.headersSent || res.wroteHead {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot write headers after they are sent to the client"))
	}
	res.statusCode = status
	for _, a := range args {
		if s, ok := a.(string); ok {
			res.statusMessage = s
		} else if a != nil {
			res.store.setAll(a)
		}
	}
	res.wroteHead = true
	return res
}

func (res *TnServerResponse) flushHeaders() {
	if !res.headersSent {
		op := res.headerOp()
		op.flush = true
		res.post(op)
	}
}

// res.writeContinue(): the 100 that answers Expect: 100-continue
func (res *TnServerResponse) writeContinue() {
	if res.headersSent {
		return
	}
	res.post(tnResOp{info: true, status: 100, header: http.Header{}})
}

// res.writeInformation(status, headers): a 1xx response before the final one
func (res *TnServerResponse) writeInformation(status float64, headers ...interface{}) {
	if res.headersSent {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot write headers after they are sent to the client"))
	}
	if status < 100 || status > 199 || status != math.Trunc(status) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"statusCode\\" is out of range. It must be >= 100 && <= 199. Received "+TnNumStr(status)))
	}
	if status == 101 {
		panic(TnNodeError("RangeError", "ERR_HTTP_INVALID_STATUS_CODE", "Invalid status code: 101"))
	}
	h := http.Header{}
	if len(headers) > 0 && headers[0] != nil {
		for _, k := range TnKeys(headers[0]) {
			h.Set(k, TnJSString(TnGetValue(headers[0], k)))
		}
	}
	res.post(tnResOp{info: true, status: int(status), header: h})
}

// http.isValidHeaderName / isValidHeaderValue
func TnIsValidHeaderName(name string) bool {
	if name == "" {
		return false
	}
	for i := 0; i < len(name); i++ {
		c := name[i]
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || strings.IndexByte("!#$%&'*+-.^_\\x60|~", c) >= 0) {
			return false
		}
	}
	return true
}

func TnIsValidHeaderValue(value string) bool {
	for i := 0; i < len(value); i++ {
		c := value[i]
		if c != '\t' && (c < 0x20 || c == 0x7f) {
			return false
		}
	}
	return true
}

// http.websocketMask(source, key, output, offset, length) / websocketUnmask(buffer, key)
func tnWebsocketKey(key interface{}) [4]byte {
	var k [4]byte
	switch v := key.(type) {
	case []byte:
		copy(k[:], v)
	case float64:
		n := uint32(v)
		k = [4]byte{byte(n >> 24), byte(n >> 16), byte(n >> 8), byte(n)}
	}
	return k
}

func TnWebsocketMask(source []byte, key interface{}, output []byte, offset float64, length float64) {
	k := tnWebsocketKey(key)
	o := int(offset)
	for i := 0; i < int(length) && i < len(source) && o+i < len(output); i++ {
		output[o+i] = source[i] ^ k[i%4]
	}
}

func TnWebsocketUnmask(buffer []byte, key interface{}) {
	k := tnWebsocketKey(key)
	for i := range buffer {
		buffer[i] ^= k[i%4]
	}
}

// req.signal: aborted when the request is (the client goes away before the
// response ends); a request that completes leaves it alone
func (m *TnIncomingMessage) Get_signal() *TnAbortSignal {
	if m.sig == nil {
		sig := TnNewAbortSignal()
		m.sig = sig
		m.once("close", func(args ...interface{}) {
			if m.aborted && !sig.aborted {
				sig.abort(nil)
			}
		})
	}
	return m.sig
}

// end(data?): a body written in one piece gets a Content-Length, as in Node
func (res *TnServerResponse) end(args ...interface{}) *TnServerResponse {
	// writeHead() only records the status and headers (headersSent stays false),
	// so the whole response can still be built on the connection goroutine.
	if res.inSyncTurn && !res.headersSent && !res.wroteData && !res.writeEnded && !res.destroyed &&
		len(res.ops) == 0 && len(res.writeQueue) == 0 && res.trailer == nil &&
		res.state == nil && res.fn0 == nil && res.fn1 == nil && len(args) <= 1 {
		if len(args) == 0 || args[0] == nil {
			res.fastEnd = true
			res.wroteHead = true
			res.writeEnded = true
			res.finished = true
			res.closed = true
			return res
		}
		switch d := args[0].(type) {
		case string:
			res.fastBody = unsafe.Slice(unsafe.StringData(d), len(d))
			res.fastEnd = true
			res.wroteHead = true
			res.writeEnded = true
			res.finished = true
			res.closed = true
			return res
		case []byte:
			res.fastBody = d
			res.fastEnd = true
			res.wroteHead = true
			res.writeEnded = true
			res.finished = true
			res.closed = true
			return res
		}
	}
	st := int(res.statusCode)
	if !res.headersSent && !res.wroteData && st >= 200 && st != 204 && st != 304 && !res.store.has("content-length") && !res.store.has("transfer-encoding") {
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

func (res *TnServerResponse) tnInitSink() {
	if res.sink != nil {
		return
	}
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
}

func tnNewServerResponse(req *TnIncomingMessage) *TnServerResponse {
	res := &TnServerResponse{statusCode: 200, sendDate: true, req: req}
	res.flowing = -1
	res.decodeStrings = true
	res.writableSide = true
	res.asyncCtx = TnAsyncSnapshot()
	res.tnSelf = res
	return res
}

type tnHttpConn struct {
	conn   net.Conn
	active int32
	closed chan struct{}
	once   sync.Once
}

func (hc *tnHttpConn) closeConn() {
	hc.once.Do(func() {
		close(hc.closed)
		hc.conn.Close()
	})
}

var (
	tnDateSec atomic.Int64
	tnDateVal atomic.Value
	tnDateMu  sync.Mutex
)

func tnAppendDateHeader(buf []byte) []byte {
	now := time.Now()
	sec := now.Unix()
	if sec == tnDateSec.Load() {
		if s, ok := tnDateVal.Load().(string); ok {
			return append(buf, s...)
		}
	}
	tnDateMu.Lock()
	if sec != tnDateSec.Load() {
		var b [64]byte
		s := append(b[:0], "Date: "...)
		s = now.UTC().AppendFormat(s, http.TimeFormat)
		s = append(s, '\\r', '\\n')
		tnDateVal.Store(string(s))
		tnDateSec.Store(sec)
	}
	s, _ := tnDateVal.Load().(string)
	tnDateMu.Unlock()
	return append(buf, s...)
}

func tnAppendStatusLine(buf []byte, status int, msg string) []byte {
	if msg == "" {
		switch status {
		case 200:
			return append(buf, "HTTP/1.1 200 OK\\r\\n"...)
		case 201:
			return append(buf, "HTTP/1.1 201 Created\\r\\n"...)
		case 204:
			return append(buf, "HTTP/1.1 204 No Content\\r\\n"...)
		case 400:
			return append(buf, "HTTP/1.1 400 Bad Request\\r\\n"...)
		case 404:
			return append(buf, "HTTP/1.1 404 Not Found\\r\\n"...)
		case 500:
			return append(buf, "HTTP/1.1 500 Internal Server Error\\r\\n"...)
		}
		msg = tnStatusText(status)
	}
	buf = append(buf, "HTTP/1.1 "...)
	buf = strconv.AppendInt(buf, int64(status), 10)
	buf = append(buf, ' ')
	buf = append(buf, msg...)
	return append(buf, '\\r', '\\n')
}

func tnInternMethod(b []byte) string {
	switch len(b) {
	case 3:
		if b[0] == 'G' && b[1] == 'E' && b[2] == 'T' {
			return "GET"
		}
		if b[0] == 'P' && b[1] == 'U' && b[2] == 'T' {
			return "PUT"
		}
	case 4:
		if b[0] == 'P' && b[1] == 'O' && b[2] == 'S' && b[3] == 'T' {
			return "POST"
		}
		if b[0] == 'H' && b[1] == 'E' && b[2] == 'A' && b[3] == 'D' {
			return "HEAD"
		}
	case 5:
		if b[0] == 'P' && b[1] == 'A' && b[2] == 'T' && b[3] == 'C' && b[4] == 'H' {
			return "PATCH"
		}
	case 6:
		if b[0] == 'D' && b[1] == 'E' && b[2] == 'L' && b[3] == 'E' && b[4] == 'T' && b[5] == 'E' {
			return "DELETE"
		}
	case 7:
		if b[0] == 'O' && b[1] == 'P' && b[2] == 'T' && b[3] == 'I' && b[4] == 'O' && b[5] == 'N' && b[6] == 'S' {
			return "OPTIONS"
		}
	}
	return string(b)
}

type tnHttp1ResponseWriter struct {
	conn          net.Conn
	reqMethod     string
	protoMinor    int
	keepAlive     bool
	closeAfter    bool
	header        http.Header
	status        int
	statusMessage string
	hasStatus     bool
	wroteHeader   bool
	chunked       bool
	buf           []byte
}

func (w *tnHttp1ResponseWriter) Header() http.Header {
	if w.header == nil {
		w.header = http.Header{}
	}
	return w.header
}

// A 1xx response written straight away (the final response follows)
func (w *tnHttp1ResponseWriter) writeInfo(status int, header http.Header) error {
	if w.wroteHeader {
		return nil
	}
	buf := []byte("HTTP/1.1 " + strconv.Itoa(status) + " " + tnStatusText(status) + "\\r\\n")
	for k, vs := range header {
		for _, v := range vs {
			buf = append(buf, k+": "+v+"\\r\\n"...)
		}
	}
	buf = append(buf, '\\r', '\\n')
	_, err := w.conn.Write(buf)
	return err
}

func (w *tnHttp1ResponseWriter) WriteHeader(status int) {
	if w.wroteHeader || w.hasStatus {
		return
	}
	w.status = status
	w.hasStatus = true
}

func (w *tnHttp1ResponseWriter) appendHeaders(ending bool, endLen int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true
	if !w.hasStatus {
		w.status = 200
		w.hasStatus = true
	}
	if w.protoMinor == 0 {
		msg := w.statusMessage
		if msg == "" {
			msg = tnStatusText(w.status)
		}
		w.buf = append(w.buf[:0], "HTTP/1.0 "...)
		w.buf = strconv.AppendInt(w.buf, int64(w.status), 10)
		w.buf = append(w.buf, ' ')
		w.buf = append(w.buf, msg...)
		w.buf = append(w.buf, '\\r', '\\n')
	} else {
		w.buf = tnAppendStatusLine(w.buf[:0], w.status, w.statusMessage)
	}
	hasCL := false
	hasTE := false
	hasDate := false
	omitDate := false
	hasConn := false
	for k, vals := range w.header {
		if strings.HasPrefix(k, http.TrailerPrefix) {
			continue
		}
		lk := tnLowerASCII(k)
		switch lk {
		case "content-length":
			if len(vals) > 0 {
				hasCL = true
			}
		case "transfer-encoding":
			if len(vals) > 0 {
				hasTE = true
				for _, v := range vals {
					if strings.Contains(strings.ToLower(v), "chunked") {
						w.chunked = true
					}
				}
			}
		case "date":
			if vals == nil {
				omitDate = true
			} else {
				hasDate = true
			}
		case "connection":
			if len(vals) > 0 {
				hasConn = true
				for _, v := range vals {
					if strings.Contains(strings.ToLower(v), "close") {
						w.closeAfter = true
					}
				}
			}
		}
		for _, v := range vals {
			w.buf = append(w.buf, k...)
			w.buf = append(w.buf, ':', ' ')
			w.buf = append(w.buf, v...)
			w.buf = append(w.buf, '\\r', '\\n')
		}
	}
	if !hasDate && !omitDate {
		w.buf = tnAppendDateHeader(w.buf)
	}
	noBody := w.reqMethod == "HEAD" || w.status < 200 || w.status == 204 || w.status == 304
	if !noBody && !hasCL && !hasTE {
		if ending {
			w.buf = append(w.buf, "Content-Length: "...)
			w.buf = strconv.AppendInt(w.buf, int64(endLen), 10)
			w.buf = append(w.buf, '\\r', '\\n')
		} else if w.protoMinor >= 1 {
			w.chunked = true
			w.buf = append(w.buf, "Transfer-Encoding: chunked\\r\\n"...)
		} else {
			w.closeAfter = true
		}
	}
	if !hasConn {
		if !w.keepAlive || w.closeAfter {
			w.buf = append(w.buf, "Connection: close\\r\\n"...)
		} else if w.protoMinor == 0 {
			w.buf = append(w.buf, "Connection: keep-alive\\r\\n"...)
		}
	}
	w.buf = append(w.buf, '\\r', '\\n')
}

func (w *tnHttp1ResponseWriter) Flush() error {
	if !w.wroteHeader {
		w.appendHeaders(false, 0)
		_, err := w.conn.Write(w.buf)
		return err
	}
	return nil
}

func (w *tnHttp1ResponseWriter) Write(data []byte) (int, error) {
	noBody := w.reqMethod == "HEAD" || (w.hasStatus && (w.status < 200 || w.status == 204 || w.status == 304))
	if !w.wroteHeader {
		w.appendHeaders(false, 0)
		if noBody || len(data) == 0 {
			_, err := w.conn.Write(w.buf)
			return len(data), err
		}
		if w.chunked {
			w.buf = strconv.AppendInt(w.buf, int64(len(data)), 16)
			w.buf = append(w.buf, '\\r', '\\n')
			w.buf = append(w.buf, data...)
			w.buf = append(w.buf, '\\r', '\\n')
		} else {
			w.buf = append(w.buf, data...)
		}
		_, err := w.conn.Write(w.buf)
		return len(data), err
	}
	if noBody || len(data) == 0 {
		return len(data), nil
	}
	w.buf = w.buf[:0]
	if w.chunked {
		w.buf = strconv.AppendInt(w.buf, int64(len(data)), 16)
		w.buf = append(w.buf, '\\r', '\\n')
		w.buf = append(w.buf, data...)
		w.buf = append(w.buf, '\\r', '\\n')
		_, err := w.conn.Write(w.buf)
		return len(data), err
	}
	return w.conn.Write(data)
}

func (w *tnHttp1ResponseWriter) finish(data []byte, trailer http.Header) error {
	if !w.wroteHeader {
		w.appendHeaders(true, len(data))
		noBody := w.reqMethod == "HEAD" || w.status < 200 || w.status == 204 || w.status == 304
		if !noBody {
			if w.chunked {
				if len(data) > 0 {
					w.buf = strconv.AppendInt(w.buf, int64(len(data)), 16)
					w.buf = append(w.buf, '\\r', '\\n')
					w.buf = append(w.buf, data...)
					w.buf = append(w.buf, '\\r', '\\n')
				}
				w.buf = append(w.buf, "0\\r\\n"...)
				for k, vals := range trailer {
					for _, v := range vals {
						w.buf = append(w.buf, k...)
						w.buf = append(w.buf, ':', ' ')
						w.buf = append(w.buf, v...)
						w.buf = append(w.buf, '\\r', '\\n')
					}
				}
				w.buf = append(w.buf, '\\r', '\\n')
			} else if len(data) > 0 {
				w.buf = append(w.buf, data...)
			}
		}
		_, err := w.conn.Write(w.buf)
		return err
	}
	noBody := w.reqMethod == "HEAD" || w.status < 200 || w.status == 204 || w.status == 304
	w.buf = w.buf[:0]
	if !noBody {
		if w.chunked {
			if len(data) > 0 {
				w.buf = strconv.AppendInt(w.buf, int64(len(data)), 16)
				w.buf = append(w.buf, '\\r', '\\n')
				w.buf = append(w.buf, data...)
				w.buf = append(w.buf, '\\r', '\\n')
			}
			w.buf = append(w.buf, "0\\r\\n"...)
			for k, vals := range trailer {
				for _, v := range vals {
					w.buf = append(w.buf, k...)
					w.buf = append(w.buf, ':', ' ')
					w.buf = append(w.buf, v...)
					w.buf = append(w.buf, '\\r', '\\n')
				}
			}
			w.buf = append(w.buf, '\\r', '\\n')
		} else if len(data) > 0 {
			w.buf = append(w.buf, data...)
		}
	}
	if len(w.buf) > 0 {
		_, err := w.conn.Write(w.buf)
		return err
	}
	return nil
}

// http.Server: a net.Server whose connections are served directly (HTTP/1.x) or by net/http (HTTP/2)
type TnHttpServer struct {
	TnNetServer
	httpServer       *http.Server
	tlsConfig        *tls.Config
	inFlight         sync.WaitGroup
	connMu           sync.Mutex
	httpConns        map[*tnHttpConn]struct{}
	closing          int32
	timeout          float64
	keepAliveTimeout float64
	headersTimeout   float64
	requestTimeout   float64
	maxHeadersCount  interface{}
	// header value validation ('strict' by default; see node:http's option)
	httpValidation string
	// node:http2 servers (pseudo-headers, the 'stream' API)
	h2 bool
}

// Set by node:http2: serves an HTTP/2 request through the 'stream' API (false when not handled)
var tnHttp2StreamHook func(hs *TnHttpServer, w http.ResponseWriter, r *http.Request) bool

// Set by node:http2: emits its 'session' event for a new HTTP/2 connection
var tnHttp2SessionHook func(hs *TnHttpServer, r *http.Request)

func (hs *TnHttpServer) Get_timeout() float64           { return hs.timeout }
func (hs *TnHttpServer) Set_timeout(v float64)          { hs.timeout = v }
func (hs *TnHttpServer) Get_keepAliveTimeout() float64  { return hs.keepAliveTimeout }
func (hs *TnHttpServer) Set_keepAliveTimeout(v float64) { hs.keepAliveTimeout = v }
func (hs *TnHttpServer) Get_headersTimeout() float64    { return hs.headersTimeout }
func (hs *TnHttpServer) Set_headersTimeout(v float64)   { hs.headersTimeout = v }
func (hs *TnHttpServer) Get_requestTimeout() float64    { return hs.requestTimeout }
func (hs *TnHttpServer) Set_requestTimeout(v float64)   { hs.requestTimeout = v }

func (hs *TnHttpServer) setTimeout(ms float64, cb ...interface{}) *TnHttpServer {
	hs.timeout = ms
	return hs
}

func (hs *TnHttpServer) serveConn(hc *tnHttpConn, local net.Addr) {
	upgraded := false
	defer func() {
		if !upgraded {
			hc.closeConn()
		}
		hs.connMu.Lock()
		delete(hs.httpConns, hc)
		hs.connMu.Unlock()
		hs.inFlight.Done()
	}()
	if tc, ok := hc.conn.(*tls.Conn); ok {
		if err := tc.Handshake(); err != nil {
			return
		}
	}
	remoteAddr := ""
	if ra := hc.conn.RemoteAddr(); ra != nil {
		remoteAddr = ra.String()
	}
	br := bufio.NewReaderSize(hc.conn, 8192)
	outBuf := make([]byte, 0, 4096)
	for {
		atomic.StoreInt32(&hc.active, 0)
		if atomic.LoadInt32(&hs.closing) != 0 {
			return
		}
		if _, err := br.Peek(1); err != nil {
			return
		}
		atomic.StoreInt32(&hc.active, 1)
		if atomic.LoadInt32(&hs.closing) != 0 {
			return
		}
		if handled, ka := hs.tryFastHTTP1(hc, br, local, remoteAddr, &outBuf); handled {
			if !ka || atomic.LoadInt32(&hs.closing) != 0 {
				return
			}
			continue
		}
		r, err := http.ReadRequest(br)
		if err != nil {
			// (Node answers a request it cannot parse with 400, then closes)
			var ne net.Error
			if !errors.As(err, &ne) || !ne.Timeout() {
				hc.conn.Write([]byte("HTTP/1.1 400 Bad Request\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n"))
			}
			return
		}
		ka, upg := hs.serveHTTP1(hc, br, r, local, remoteAddr)
		if upg {
			upgraded = true
			return
		}
		if !ka || atomic.LoadInt32(&hs.closing) != 0 {
			return
		}
	}
}

func (hs *TnHttpServer) tryFastHTTP1(hc *tnHttpConn, br *bufio.Reader, local net.Addr, remoteAddr string, outBuf *[]byte) (bool, bool) {
	n := br.Buffered()
	if n < 16 {
		return false, false
	}
	buf, _ := br.Peek(n)
	hdrEnd := bytes.Index(buf, []byte("\\r\\n\\r\\n"))
	if hdrEnd < 0 {
		return false, false
	}
	lineEnd := bytes.Index(buf[:hdrEnd], []byte("\\r\\n"))
	if lineEnd < 0 {
		return false, false
	}
	reqLine := buf[:lineEnd]
	sp1 := bytes.IndexByte(reqLine, ' ')
	if sp1 <= 0 {
		return false, false
	}
	sp2 := bytes.IndexByte(reqLine[sp1+1:], ' ')
	if sp2 <= 0 {
		return false, false
	}
	sp2 += sp1 + 1
	proto := reqLine[sp2+1:]
	if len(proto) != 8 || proto[0] != 'H' || proto[1] != 'T' || proto[2] != 'T' || proto[3] != 'P' || proto[4] != '/' || proto[5] != '1' || proto[6] != '.' || proto[7] != '1' {
		return false, false
	}
	methodBytes := reqLine[:sp1]
	if len(methodBytes) == 7 && string(methodBytes) == "CONNECT" {
		return false, false
	}
	hdrBlock := buf[lineEnd+2 : hdrEnd]
	contentLen := 0
	keepAlive := true
	rest := hdrBlock
	for len(rest) > 0 {
		nl := bytes.IndexByte(rest, '\\n')
		var line []byte
		if nl < 0 {
			line = rest
			rest = nil
		} else {
			line = rest[:nl]
			rest = rest[nl+1:]
		}
		if len(line) > 0 && line[len(line)-1] == '\\r' {
			line = line[:len(line)-1]
		}
		colon := bytes.IndexByte(line, ':')
		if colon <= 0 {
			return false, false
		}
		k := line[:colon]
		v := line[colon+1:]
		for len(v) > 0 && (v[0] == ' ' || v[0] == '\\t') {
			v = v[1:]
		}
		for len(v) > 0 && (v[len(v)-1] == ' ' || v[len(v)-1] == '\\t') {
			v = v[:len(v)-1]
		}
		if !tnHTTP1ValidName(k) {
			return false, false
		}
		if hs.httpValidation != "relaxed" && hs.httpValidation != "insecure" && !tnHTTP1ValidValue(v) {
			return false, false
		}
		switch len(k) {
		case 6: // Expect
			if (k[0]|0x20) == 'e' && strings.EqualFold(string(k), "expect") {
				return false, false
			}
		case 7: // Upgrade
			if (k[0]|0x20) == 'u' && strings.EqualFold(string(k), "upgrade") {
				return false, false
			}
		case 10: // Connection
			if (k[0]|0x20) == 'c' && strings.EqualFold(string(k), "connection") {
				if len(v) == 10 && (v[0]|0x20) == 'k' {
					// keep-alive
				} else if len(v) == 5 && (v[0]|0x20) == 'c' && strings.EqualFold(string(v), "close") {
					keepAlive = false
				} else {
					lv := bytes.ToLower(v)
					if bytes.Contains(lv, []byte("upgrade")) {
						return false, false
					}
					if bytes.Contains(lv, []byte("close")) {
						keepAlive = false
					}
				}
			}
		case 14: // Content-Length
			if (k[0]|0x20) == 'c' && (k[8]|0x20) == 'l' && strings.EqualFold(string(k), "content-length") {
				if len(v) == 0 {
					return false, false
				}
				cl := 0
				for i := 0; i < len(v); i++ {
					if v[i] < '0' || v[i] > '9' {
						return false, false
					}
					cl = cl*10 + int(v[i]-'0')
					if cl > 65536 {
						return false, false
					}
				}
				contentLen = cl
			}
		case 17: // Transfer-Encoding
			if (k[0]|0x20) == 't' && strings.EqualFold(string(k), "transfer-encoding") {
				return false, false
			}
		}
	}
	totalLen := hdrEnd + 4 + contentLen
	if n < totalLen {
		if totalLen > 8192 {
			return false, false
		}
		if _, err := br.Peek(totalLen); err != nil {
			return false, false
		}
		buf, _ = br.Peek(totalLen)
		hdrBlock = buf[lineEnd+2 : hdrEnd]
	}
	var body []byte
	if contentLen > 0 {
		body = make([]byte, contentLen)
		copy(body, buf[hdrEnd+4:totalLen])
	}
	method := tnInternMethod(buf[:sp1])
	reqURL := string(buf[sp1+1 : sp2])

	var req *TnIncomingMessage
	var res *TnServerResponse
	tnLoopRun(func() {
		prevCtx := tnAsyncCtx
		tnAsyncCtx = hs.asyncCtx
		defer func() { tnAsyncCtx = prevCtx }()

		req = tnNewIncoming()
		req.method = method
		req.url = reqURL
		req.httpVersion = "1.1"
		req.httpVersionMajor = 1
		req.httpVersionMinor = 1
		req.rawHeaderBlock = hdrBlock
		req.rawTLS = hs.tlsConfig != nil
		req.rawLocal = local
		req.rawRemote = remoteAddr

		res = tnNewServerResponse(req)
		res.inSyncTurn = true
		req.flowScheduled = true
		hs.emit("request", req, res)
		if !req.destroyed && req.flowing == 1 && !req.readableListening && len(req.queue) == 0 && req.decoder == nil {
			if len(body) > 0 {
				req.bytesRead += float64(len(body))
				if req.state == nil {
					if req.fn0 != nil && req.ev0 == "data" {
						if f, ok := req.fn0.(func([]byte)); ok {
							f(body)
						} else if f, ok := req.fn0.(func(interface{})); ok {
							f(body)
						} else {
							TnInvoke(req.fn0, body)
						}
					}
					if req.fn1 != nil && req.ev1 == "data" {
						if f, ok := req.fn1.(func([]byte)); ok {
							f(body)
						} else if f, ok := req.fn1.(func(interface{})); ok {
							f(body)
						} else {
							TnInvoke(req.fn1, body)
						}
					}
				} else {
					req.emit("data", body)
				}
			}
			if !req.destroyed && req.flowing == 1 && len(req.queue) == 0 {
				req.complete = true
				req.readEnded = true
				req.flowScheduled = false
				req.emitEnd()
			} else {
				req.complete = true
				req.push(nil)
				req.flowScheduled = false
				if !req.destroyed {
					req.flow()
				}
			}
		} else {
			if !req.destroyed {
				if len(body) > 0 {
					req.push(body)
				}
				req.complete = true
				req.push(nil)
			}
			req.flowScheduled = false
			if !req.destroyed {
				req.flow()
			}
		}
		TnRunMicrotasks()
		res.inSyncTurn = false
	})

	if !res.fastEnd && req.hdrs == nil && len(req.rawHeaderBlock) > 0 {
		req.rawHeaderBlock = append([]byte(nil), req.rawHeaderBlock...)
	}
	br.Discard(totalLen)

	if res.fastEnd {
		status := int(res.statusCode)
		b := tnAppendStatusLine((*outBuf)[:0], status, res.statusMessage)
		hasCL := false
		hasTE := false
		hasDate := false
		hasConn := false
		for i := range res.store.entries {
			e := &res.store.entries[i]
			switch e.key {
			case "content-length":
				hasCL = true
			case "transfer-encoding":
				hasTE = true
			case "date":
				hasDate = true
			case "connection":
				hasConn = true
				if s, ok := e.value.(string); ok && strings.Contains(strings.ToLower(s), "close") {
					keepAlive = false
				}
			}
			if s, ok := e.value.(string); ok {
				b = append(b, e.name...)
				b = append(b, ':', ' ')
				b = append(b, s...)
				b = append(b, '\\r', '\\n')
			} else if num, ok := e.value.(float64); ok {
				b = append(b, e.name...)
				b = append(b, ':', ' ')
				b = strconv.AppendFloat(b, num, 'f', -1, 64)
				b = append(b, '\\r', '\\n')
			} else {
				for _, v := range tnHeaderStrings(e.value) {
					b = append(b, e.name...)
					b = append(b, ':', ' ')
					b = append(b, v...)
					b = append(b, '\\r', '\\n')
				}
			}
		}
		if res.sendDate && !hasDate {
			b = tnAppendDateHeader(b)
		}
		if !keepAlive && !hasConn {
			b = append(b, "Connection: close\\r\\n"...)
		}
		noBody := req.method == "HEAD" || status < 200 || status == 204 || status == 304
		if !noBody && !hasCL && !hasTE {
			b = append(b, "Content-Length: "...)
			b = strconv.AppendInt(b, int64(len(res.fastBody)), 10)
			b = append(b, '\\r', '\\n')
		}
		b = append(b, '\\r', '\\n')
		if !noBody && len(res.fastBody) > 0 {
			b = append(b, res.fastBody...)
		}
		*outBuf = b
		if _, err := hc.conn.Write(b); err != nil {
			return true, false
		}
		return true, keepAlive
	}

	w := &tnHttp1ResponseWriter{
		conn:       hc.conn,
		reqMethod:  req.method,
		protoMinor: 1,
		keepAlive:  keepAlive,
		buf:        (*outBuf)[:0],
	}
	closedDone := make(chan struct{})
	close(closedDone)
	tnServeOps1(w, hc, res, func() {
		if !res.finished {
			req.aborted = true
			res.destroy()
		}
	}, closedDone)
	*outBuf = w.buf[:0]
	return true, w.keepAlive && !w.closeAfter
}

func (hs *TnHttpServer) serveUpgrade1(hc *tnHttpConn, br *bufio.Reader, r *http.Request, local net.Addr) (bool, bool) {
	event := ""
	if r.Method == http.MethodConnect {
		event = "connect"
	} else if r.Header.Get("Upgrade") != "" && tnHeaderHasToken(r.Header, "Connection", "upgrade") {
		event = "upgrade"
	}
	if event == "" {
		return false, false
	}
	listening := false
	tnLoopRun(func() { listening = hs.listenerCount(event) > 0 })
	if !listening {
		if event == "upgrade" {
			return false, false
		}
		return true, false
	}
	head := []byte{}
	if n := br.Buffered(); n > 0 {
		peeked, _ := br.Peek(n)
		head = append(head, peeked...)
	}
	tnLoopRun(func() {
		TnAsyncRun(hs.asyncCtx, func() {
			req := hs.incoming(r, local)
			req.complete = true
			req.push(nil)
			socket := TnNewSocket()
			socket.attach(hc.conn)
			if r.TLS != nil {
				socket.encrypted = true
			}
			req.socket = socket
			hs.emit(event, req, socket, head)
		})
	})
	return true, true
}

func (hs *TnHttpServer) serveHTTP1(hc *tnHttpConn, br *bufio.Reader, r *http.Request, local net.Addr, remoteAddr string) (bool, bool) {
	TnLoopRef()
	defer TnLoopUnref()
	r.RemoteAddr = remoteAddr
	if hs.tlsConfig != nil {
		if tc, ok := hc.conn.(*tls.Conn); ok {
			st := tc.ConnectionState()
			r.TLS = &st
		} else {
			r.TLS = &tls.ConnectionState{}
		}
	}
	if handled, upg := hs.serveUpgrade1(hc, br, r, local); handled {
		return false, upg
	}
	// Expect: 100-continue is the 'checkContinue' event when somebody listens
	// (the listener answers with res.writeContinue()); otherwise Node sends
	// the 100 for us and emits 'request'. Any other Expect is 'checkExpectation'.
	checkContinue := false
	checkExpectation := false
	if expect := r.Header.Get("Expect"); expect != "" {
		if strings.EqualFold(expect, "100-continue") {
			if hs.listenerCount("checkContinue") > 0 {
				checkContinue = true
			} else {
				hc.conn.Write([]byte("HTTP/1.1 100 Continue\\r\\n\\r\\n"))
			}
		} else if hs.listenerCount("checkExpectation") > 0 {
			checkExpectation = true
		}
	}
	bodyDone := make(chan struct{})
	var small []byte
	var smallErr error
	if r.ContentLength > 0 && r.ContentLength <= 65536 && r.Header.Get("Expect") == "" {
		small = make([]byte, r.ContentLength)
		_, smallErr = io.ReadFull(r.Body, small)
		r.Body.Close()
	}
	var req *TnIncomingMessage
	var res *TnServerResponse
	tnLoopRun(func() {
		TnAsyncRun(hs.asyncCtx, func() {
			req = hs.incoming(r, local)
			res = tnNewServerResponse(req)
			if checkContinue {
				hs.emit("checkContinue", req, res)
			} else if checkExpectation {
				hs.emit("checkExpectation", req, res)
			} else {
				hs.emit("request", req, res)
			}
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
				req.complete = true
				req.push(nil)
				close(bodyDone)
			} else {
				tnPumpBody(r.Body, req, func() {
					for k, v := range r.Trailer {
						req.Get_trailers().Set(strings.ToLower(k), strings.Join(v, ", "))
					}
				}, func() { close(bodyDone) })
			}
		})
	})
	keepAlive := !r.Close && (r.ProtoMajor > 1 || (r.ProtoMajor == 1 && r.ProtoMinor >= 1) || tnHeaderHasToken(r.Header, "Connection", "keep-alive"))
	w := &tnHttp1ResponseWriter{
		conn:       hc.conn,
		reqMethod:  r.Method,
		protoMinor: r.ProtoMinor,
		keepAlive:  keepAlive,
	}
	tnServeOps1(w, hc, res, func() {
		if !res.finished {
			req.aborted = true
			res.destroy()
		}
	}, bodyDone)
	if r.Body != nil {
		r.Body.Close()
	}
	return w.keepAlive && !w.closeAfter, false
}

func tnServeOps1(w *tnHttp1ResponseWriter, hc *tnHttpConn, res *TnServerResponse, abort func(), bodyDone chan struct{}) {
	for {
		ended := false
		for _, op := range res.take() {
			switch {
			case op.info:
				w.writeInfo(op.status, op.header)
			case op.header != nil:
				for k, v := range op.header {
					if v == nil {
						w.Header()[k] = nil
					} else {
						w.Header()[k] = v
					}
				}
				w.statusMessage = op.statusMsg
				w.WriteHeader(op.status)
				if op.flush {
					w.Flush()
				}
			case op.end:
				err := w.finish(op.data, op.trailer)
				ended = true
				op.done(err)
			default:
				_, err := w.Write(op.data)
				if err == nil {
					err = w.Flush()
				}
				op.done(err)
			}
		}
		if ended {
			break
		}
		select {
		case <-res.sig():
		case <-hc.closed:
			TnLoopPost(abort)
			<-bodyDone
			return
		}
	}
	<-bodyDone
}

func (hs *TnHttpServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if hs.h2 && tnHttp2SessionHook != nil {
		tnHttp2SessionHook(hs, r)
	}
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
				tnPumpBody(r.Body, req, func() {
					for k, v := range r.Trailer {
						req.Get_trailers().Set(strings.ToLower(k), strings.Join(v, ", "))
					}
				}, func() { close(bodyDone) })
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
	if r.ProtoMajor == 1 && r.ProtoMinor == 1 {
		req.httpVersion = "1.1"
	} else if r.ProtoMajor == 1 && r.ProtoMinor == 0 {
		req.httpVersion = "1.0"
	} else {
		req.httpVersion = strconv.Itoa(r.ProtoMajor) + "." + strconv.Itoa(r.ProtoMinor)
	}
	req.httpVersionMajor, req.httpVersionMinor = float64(r.ProtoMajor), float64(r.ProtoMinor)
	req.rawGoHeader = r.Header
	req.rawHost = r.Host
	req.rawChunked = len(r.TransferEncoding) > 0 && r.TransferEncoding[0] == "chunked"
	req.rawH2 = hs.h2 && r.ProtoMajor == 2
	req.rawTLS = r.TLS != nil
	req.rawLocal = local
	req.rawRemote = r.RemoteAddr
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
func tnPseudoHeaders(req *TnIncomingMessage) {
	scheme := "http"
	if req.rawTLS {
		scheme = "https"
	}
	headers := TnNewMap[string, string]()
	headers.Set(":method", req.method)
	headers.Set(":scheme", scheme)
	headers.Set(":authority", req.rawHost)
	headers.Set(":path", req.url)
	for k, v := range req.hdrs.All() {
		if k != "host" {
			headers.Set(k, v)
		}
	}
	req.hdrs = headers
}

// Applies a response's queued operations on the handler goroutine until it ends
// (or the client goes away: abort runs on the loop)
func tnServeOps(w http.ResponseWriter, r *http.Request, res *TnServerResponse, abort func(), bodyDone chan struct{}) {
	rc := http.NewResponseController(w)
	for {
		ended := false
		for _, op := range res.take() {
			switch {
			case op.info:
				// (net/http sends a 1xx with the header map, then the map is the final one's again)
				saved := w.Header().Clone()
				for k, v := range op.header {
					w.Header()[k] = v
				}
				w.WriteHeader(op.status)
				for k := range w.Header() {
					delete(w.Header(), k)
				}
				for k, v := range saved {
					w.Header()[k] = v
				}
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
		case <-res.sig():
		case <-r.Context().Done():
			TnLoopPost(abort)
			<-bodyDone
			return
		}
	}
	<-bodyDone
}

func TnNewHttpServer(secure bool, args ...interface{}) *TnHttpServer {
	hs := &TnHttpServer{keepAliveTimeout: 5000, headersTimeout: 60000, requestTimeout: 300000, httpConns: map[*tnHttpConn]struct{}{}, httpValidation: "strict"}
	hs.TnNetServer = *TnNewNetServer()
	hs.connectionEvent = "connection"
	for _, a := range args {
		if tnIsFunc(a) {
			hs.on("request", a)
			continue
		}
		if a == nil {
			continue
		}
		if secure {
			cfg, err := tnTLSServerConfig(a)
			if err != nil {
				panic(err)
			}
			hs.tlsConfig = cfg
		}
		hs.httpValidation = tnHttpValidation(a)
		if n, ok := tnNetNumber(TnGet(a, "keepAliveTimeout")); ok {
			hs.keepAliveTimeout = n
		}
		if n, ok := tnNetNumber(TnGet(a, "headersTimeout")); ok {
			hs.headersTimeout = n
		}
		if n, ok := tnNetNumber(TnGet(a, "requestTimeout")); ok {
			hs.requestTimeout = n
		}
	}
	hs.httpServer = &http.Server{Handler: hs, ErrorLog: log.New(io.Discard, "", 0)}
	hs.serve = func(ln net.Listener) {
		if hs.tlsConfig != nil {
			ln = tls.NewListener(ln, hs.tlsConfig)
		}
		if hs.h2 {
			hs.httpServer.IdleTimeout = time.Duration(hs.keepAliveTimeout * float64(time.Millisecond))
			hs.httpServer.Serve(ln)
			return
		}
		local := ln.Addr()
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			hc := &tnHttpConn{conn: conn, closed: make(chan struct{})}
			hs.connMu.Lock()
			if atomic.LoadInt32(&hs.closing) != 0 {
				hs.connMu.Unlock()
				conn.Close()
				return
			}
			hs.httpConns[hc] = struct{}{}
			hs.inFlight.Add(1)
			hs.connMu.Unlock()
			go hs.serveConn(hc, local)
		}
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
	hs.connMu.Lock()
	atomic.StoreInt32(&hs.closing, 1)
	hs.connMu.Unlock()
	// Closing the listener first also covers a Serve that has not started yet
	hs.ln.Close()
	hs.ln = nil
	hs.listening = false
	hs.closeIdleConnections()
	TnLoopRef()
	go func() {
		if hs.h2 {
			hs.httpServer.Shutdown(context.Background())
		} else {
			hs.inFlight.Wait()
			hs.closeAllConnections()
		}
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
	if hs.h2 && hs.httpServer != nil {
		hs.httpServer.Close()
		return
	}
	hs.connMu.Lock()
	conns := make([]*tnHttpConn, 0, len(hs.httpConns))
	for hc := range hs.httpConns {
		conns = append(conns, hc)
	}
	hs.connMu.Unlock()
	for _, hc := range conns {
		hc.closeConn()
	}
}

func (hs *TnHttpServer) closeIdleConnections() {
	if hs.h2 && hs.httpServer != nil {
		hs.httpServer.SetKeepAlivesEnabled(false)
		hs.httpServer.SetKeepAlivesEnabled(true)
		return
	}
	hs.connMu.Lock()
	var idle []*tnHttpConn
	for hc := range hs.httpConns {
		if atomic.LoadInt32(&hc.active) == 0 {
			idle = append(idle, hc)
		}
	}
	hs.connMu.Unlock()
	for _, hc := range idle {
		hc.closeConn()
	}
}

func (hs *TnHttpServer) listen(args ...interface{}) *TnHttpServer {
	hs.TnNetServer.listen(args...)
	return hs
}

// --- client ---

// http.Agent: connection pooling mapped onto Go's transport (maxSockets is
// MaxConnsPerHost plus a per-origin request limit, maxTotalSockets a
// process-wide one, keepAlive decides whether idle connections are kept,
// maxFreeSockets the idle pool size)
type TnHttpAgent struct {
	mu              sync.Mutex
	keepAlive       bool
	keepAliveMsecs  float64
	maxSockets      float64
	maxTotalSockets float64
	maxFreeSockets  float64
	scheduling      string
	timeout         interface{}
	options         interface{}
	transports      map[string]*http.Transport
	origins         map[string]*tnAgentOrigin
	total           chan struct{}
}

func TnNewHttpAgent(options ...interface{}) *TnHttpAgent {
	a := &TnHttpAgent{
		keepAliveMsecs:  1000,
		maxSockets:      math.Inf(1),
		maxTotalSockets: math.Inf(1),
		maxFreeSockets:  256,
		scheduling:      "lifo",
	}
	if len(options) > 0 && options[0] != nil {
		a.options = options[0]
		a.keepAlive, _ = TnGetValue(options[0], "keepAlive").(bool)
		for _, f := range []struct {
			name string
			dst  *float64
		}{
			{"keepAliveMsecs", &a.keepAliveMsecs},
			{"maxSockets", &a.maxSockets},
			{"maxTotalSockets", &a.maxTotalSockets},
			{"maxFreeSockets", &a.maxFreeSockets},
		} {
			if n, ok := tnNetNumber(TnGet(options[0], f.name)); ok {
				*f.dst = n
			}
		}
		if s := tnNetString(TnGet(options[0], "scheduling")); s != "" {
			a.scheduling = s
		}
		if t := TnGet(options[0], "timeout"); t != nil && !TnIsNil(t) {
			a.timeout = t
		}
	}
	a.resetLimit()
	return a
}

// maxTotalSockets: a channel of tokens, one per in-flight request (a free
// keep-alive connection doesn't hold one, so another origin can use the slot)
func (a *TnHttpAgent) resetLimit() {
	a.total = nil
	if !math.IsInf(a.maxTotalSockets, 1) && a.maxTotalSockets > 0 {
		n := int(a.maxTotalSockets)
		if n < 1 {
			n = 1
		}
		a.total = make(chan struct{}, n)
	}
}

// A response body holds the agent's slots until it is closed: idle keep-alive
// connections do not count against maxSockets / maxTotalSockets, so waiting
// requests can reuse them instead of deadlocking on a dial limit
type tnAgentBody struct {
	io.ReadCloser
	release func()
	once    sync.Once
}

func (b *tnAgentBody) Close() error {
	err := b.ReadCloser.Close()
	b.once.Do(b.release)
	return err
}

// An upgraded (101) body is a ReadWriteCloser: keep its Write
type tnAgentRWBody struct {
	io.ReadWriteCloser
	release func()
	once    sync.Once
}

func (b *tnAgentRWBody) Close() error {
	err := b.ReadWriteCloser.Close()
	b.once.Do(b.release)
	return err
}

type tnAgentOrigin struct {
	transport *http.Transport
	rt        *tnAgentRoundTripper
}

// Gates each request on the per-origin and process-wide socket limits
type tnAgentRoundTripper struct {
	agent     *TnHttpAgent
	transport *http.Transport
	origin    chan struct{}
}

func (rt *tnAgentRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	slots := []chan struct{}{}
	rt.agent.mu.Lock()
	total := rt.agent.total
	rt.agent.mu.Unlock()
	if rt.origin != nil {
		slots = append(slots, rt.origin)
	}
	if total != nil {
		slots = append(slots, total)
	}
	acquired := []chan struct{}{}
	for _, sem := range slots {
		select {
		case sem <- struct{}{}:
			acquired = append(acquired, sem)
		case <-req.Context().Done():
			for _, held := range acquired {
				<-held
			}
			return nil, req.Context().Err()
		}
	}
	release := func() {
		for _, sem := range acquired {
			<-sem
		}
	}
	resp, err := rt.transport.RoundTrip(req)
	if err != nil {
		release()
		return nil, err
	}
	if rwc, ok := resp.Body.(io.ReadWriteCloser); ok {
		resp.Body = &tnAgentRWBody{ReadWriteCloser: rwc, release: release}
	} else {
		resp.Body = &tnAgentBody{ReadCloser: resp.Body, release: release}
	}
	return resp, nil
}

func (a *TnHttpAgent) Get_keepAlive() bool           { return a.keepAlive }
func (a *TnHttpAgent) Set_keepAlive(v bool)          { a.keepAlive = v }
func (a *TnHttpAgent) Get_keepAliveMsecs() float64   { return a.keepAliveMsecs }
func (a *TnHttpAgent) Set_keepAliveMsecs(v float64)  { a.keepAliveMsecs = v }
func (a *TnHttpAgent) Get_maxSockets() float64       { return a.maxSockets }
func (a *TnHttpAgent) Set_maxSockets(v float64)      { a.maxSockets = v }
func (a *TnHttpAgent) Get_maxTotalSockets() float64  { return a.maxTotalSockets }
func (a *TnHttpAgent) Set_maxTotalSockets(v float64) { a.maxTotalSockets = v; a.resetLimit() }
func (a *TnHttpAgent) Get_maxFreeSockets() float64   { return a.maxFreeSockets }
func (a *TnHttpAgent) Set_maxFreeSockets(v float64)  { a.maxFreeSockets = v }
func (a *TnHttpAgent) Get_scheduling() string        { return a.scheduling }
func (a *TnHttpAgent) Set_scheduling(v string)       { a.scheduling = v }
func (a *TnHttpAgent) Get_timeout() interface{}      { return a.timeout }
func (a *TnHttpAgent) Set_timeout(v interface{})     { a.timeout = v }
func (a *TnHttpAgent) Get_options() interface{}      { return a.options }

// The transport of one origin (the TLS configuration is part of the key)
func (a *TnHttpAgent) transport(cfg *tls.Config, key string) *tnAgentOrigin {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.origins == nil {
		a.origins = map[string]*tnAgentOrigin{}
	}
	if o, ok := a.origins[key]; ok {
		return o
	}
	if a.transports == nil {
		a.transports = map[string]*http.Transport{}
	}
	t := &http.Transport{
		Proxy:               nil,
		DisableCompression:  true,
		TLSClientConfig:     cfg,
		ForceAttemptHTTP2:   false,
		DisableKeepAlives:   !a.keepAlive,
		IdleConnTimeout:     0,
		MaxIdleConnsPerHost: 256,
	}
	if !math.IsInf(a.maxSockets, 1) && a.maxSockets > 0 {
		t.MaxConnsPerHost = int(a.maxSockets)
	}
	if !math.IsInf(a.maxFreeSockets, 1) && a.maxFreeSockets >= 0 {
		t.MaxIdleConnsPerHost = int(a.maxFreeSockets)
	}
	dialer := &net.Dialer{Timeout: 30 * time.Second}
	if a.keepAlive {
		dialer.KeepAlive = time.Duration(a.keepAliveMsecs * float64(time.Millisecond))
	}
	t.DialContext = dialer.DialContext
	var origin chan struct{}
	if !math.IsInf(a.maxSockets, 1) && a.maxSockets > 0 {
		origin = make(chan struct{}, int(a.maxSockets))
	}
	a.transports[key] = t
	if a.origins == nil {
		a.origins = map[string]*tnAgentOrigin{}
	}
	o := &tnAgentOrigin{transport: t, rt: &tnAgentRoundTripper{agent: a, transport: t, origin: origin}}
	a.origins[key] = o
	return o
}

// A dedicated transport for a Unix socket (one origin)
func (a *TnHttpAgent) unixOrigin(path string) *tnAgentOrigin {
	a.mu.Lock()
	defer a.mu.Unlock()
	key := "unix://" + path
	if a.origins == nil {
		a.origins = map[string]*tnAgentOrigin{}
	}
	if o, ok := a.origins[key]; ok {
		return o
	}
	t := &http.Transport{DisableCompression: true, DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		var d net.Dialer
		return d.DialContext(ctx, "unix", path)
	}}
	var origin chan struct{}
	if !math.IsInf(a.maxSockets, 1) && a.maxSockets > 0 {
		origin = make(chan struct{}, int(a.maxSockets))
	}
	o := &tnAgentOrigin{transport: t, rt: &tnAgentRoundTripper{agent: a, transport: t, origin: origin}}
	a.origins[key] = o
	return o
}

func (a *TnHttpAgent) destroy() {
	a.mu.Lock()
	origins := a.origins
	a.origins = nil
	a.transports = nil
	a.mu.Unlock()
	for _, o := range origins {
		o.transport.CloseIdleConnections()
	}
}

var tnHttpGlobalAgent = TnNewHttpAgent(map[string]interface{}{"keepAlive": true})

func TnHttpGlobalAgent() *TnHttpAgent { return tnHttpGlobalAgent }

type TnClientRequest struct {
	TnStream
	method      string
	path        string
	host        string
	protocol    string
	port        string
	store       tnHeaderStore
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
	agent       *TnHttpAgent
	validation  string
	trailers    http.Header
	trailerMu   sync.Mutex
}

func (cr *TnClientRequest) Get_headersSent() bool { return cr.started }
func (cr *TnClientRequest) Get_socket() *TnSocket  { return TnNewSocket() }

// httpValidation ('strict' rejects control bytes in header values; 'relaxed'
// and 'insecure' accept them, as Node's lenient parser does)
func tnHttpValidation(options interface{}) string {
	mode := "strict"
	if options == nil {
		return mode
	}
	if v := TnGet(options, "httpValidation"); v != nil && !TnIsNil(v) {
		s, ok := v.(string)
		if !ok || (s != "strict" && s != "relaxed" && s != "insecure") {
			received := fmt.Sprint(v)
			if s, ok := v.(string); ok {
				received = "'" + s + "'"
			}
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.httpValidation' must be one of: 'strict', 'relaxed', 'insecure'. Received "+received))
		}
		mode = s
	}
	if b, ok := TnGetValue(options, "insecureHTTPParser").(bool); ok && b {
		mode = "insecure"
	}
	return mode
}

func tnHttpInvalidHeaderValue(name string) {
	panic(TnNodeError("TypeError", "ERR_INVALID_CHAR", "Invalid character in header content [\\""+name+"\\"]"))
}

func (cr *TnClientRequest) checkHeaderValue(name string, value interface{}) {
	if cr.validation != "strict" {
		return
	}
	for _, v := range tnHeaderStrings(value) {
		for i := 0; i < len(v); i++ {
			c := v[i]
			if c != '\\t' && (c < 0x20 || c == 0x7f) {
				tnHttpInvalidHeaderValue(name)
			}
		}
	}
}

func (cr *TnClientRequest) checkHeaders() {
	for i := range cr.store.entries {
		cr.checkHeaderValue(cr.store.entries[i].name, cr.store.entries[i].value)
	}
}

func (cr *TnClientRequest) setHeader(name string, value interface{}) *TnClientRequest {
	if cr.started {
		panic(TnNodeError("Error", "ERR_HTTP_HEADERS_SENT", "Cannot set headers after they are sent to the client"))
	}
	cr.checkHeaderValue(name, value)
	cr.store.set(name, value)
	return cr
}
func (cr *TnClientRequest) getHeader(name string) interface{} { return cr.store.get(name) }
func (cr *TnClientRequest) getHeaders() *TnMap[string, interface{}] { return cr.store.record() }
func (cr *TnClientRequest) getHeaderNames() []string { return cr.store.keys() }
func (cr *TnClientRequest) getRawHeaderNames() []string { return cr.store.rawNames() }
func (cr *TnClientRequest) hasHeader(name string) bool { return cr.store.has(name) }
func (cr *TnClientRequest) removeHeader(name string)  { cr.store.remove(name) }
func (cr *TnClientRequest) flushHeaders()             {}
func (cr *TnClientRequest) setNoDelay(args ...interface{}) {}
func (cr *TnClientRequest) setSocketKeepAlive(args ...interface{}) {}

// addTrailers(headers): sent with a chunked body whose Trailer header names
// them, as in Node (end(data) gets a Content-Length, which has no trailers)
func (cr *TnClientRequest) addTrailers(headers interface{}) {
	cr.trailerMu.Lock()
	defer cr.trailerMu.Unlock()
	if cr.trailers == nil {
		cr.trailers = http.Header{}
	}
	for _, e := range tnEntries(headers) {
		for _, v := range tnHeaderStrings(e[1]) {
			cr.trailers.Add(fmt.Sprint(e[0]), v)
		}
	}
}

// The trailer names the request declared (its Trailer header), with their
// values filled in: Go sends exactly these keys after the chunked body
func (cr *TnClientRequest) requestTrailers() http.Header {
	declared := cr.store.get("Trailer")
	if declared == nil {
		return nil
	}
	cr.trailerMu.Lock()
	defer cr.trailerMu.Unlock()
	if cr.trailers == nil {
		cr.trailers = http.Header{}
	}
	for _, line := range tnHeaderStrings(declared) {
		for _, name := range strings.Split(line, ",") {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			canon := http.CanonicalHeaderKey(name)
			if _, ok := cr.trailers[canon]; !ok {
				cr.trailers[canon] = nil
			}
		}
	}
	if len(cr.trailers) == 0 {
		return nil
	}
	// The same map addTrailers fills in before the body ends
	return cr.trailers
}

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
	// Trailers go with a chunked body whose Trailer header names them (also
	// when end(data) carries the whole body, as Node does)
	if tr := cr.requestTrailers(); tr != nil {
		req.Trailer = tr
		if complete {
			if req.Body == nil {
				req.Body = io.NopCloser(strings.NewReader(""))
			}
			req.ContentLength = -1
		}
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
	// One transport per origin (and TLS configuration): maxSockets is per
	// origin, while the agent's total-sockets limit is shared by all of them
	agentKey := fmt.Sprint(cr.protocol, "//", net.JoinHostPort(cr.host, cr.port), "|", cr.tlsKey)
	origin := cr.agent.transport(cr.tlsConfig, agentKey)
	if cr.socketPath != "" {
		origin = cr.agent.unixOrigin(cr.socketPath)
	}
	client := &http.Client{Transport: origin.rt, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
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
			if resp.ContentLength >= 0 && !res.Get_headers().Has("content-length") && cr.method != "HEAD" {
				res.Get_headers().Set("content-length", strconv.FormatInt(resp.ContentLength, 10))
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
					res.Get_trailers().Set(strings.ToLower(k), strings.Join(v, ", "))
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
	cr := &TnClientRequest{method: "GET", path: "/", host: "localhost", protocol: "http:", setHost: true, agent: TnHttpGlobalAgent(), validation: "strict"}
	if secure {
		cr.protocol = "https:"
	}
	cr.flowing = -1
	cr.decodeStrings = true
	cr.writableSide = true
	cr.asyncCtx = TnAsyncSnapshot()
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
		cr.validation = tnHttpValidation(options)
		cr.checkHeaders()
		if v := TnGet(options, "agent"); v != nil && !TnIsNil(v) {
			if ag, ok := v.(*TnHttpAgent); ok && ag != nil {
				cr.agent = ag
			} else if b, ok := v.(bool); ok && !b {
				cr.agent = TnNewHttpAgent()
			}
		}
		if b, ok := TnGetValue(options, "rejectUnauthorized").(bool); ok && !b {
			insecure = true
		}
		ca = tnPemStrings(TnGet(options, "ca"))
		if sig, ok := TnGetValue(options, "signal").(*TnAbortSignal); ok && sig != nil {
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
    '; setHeader=*TnClientRequest; getHeader=interface{}; getHeaders=*TnMap[string, interface{}]; getHeaderNames=[]string; getRawHeaderNames=[]string; hasHeader=bool; removeHeader=; addTrailers=; flushHeaders=; setTimeout=*TnClientRequest; setNoDelay=; setSocketKeepAlive=; abort=';
const SERVER_RESPONSE_METHODS = STREAM_METHODS.replace('end=*TnStream', 'end=*TnServerResponse') +
    '; setHeader=*TnServerResponse; setHeaders=*TnServerResponse; appendHeader=*TnServerResponse; getHeader=interface{}; getHeaders=*TnMap[string, interface{}]; getHeaderNames=[]string; hasHeader=bool; removeHeader=; addTrailers=; writeHead=*TnServerResponse; flushHeaders=; writeContinue=; writeInformation=; setTimeout=*TnServerResponse';
function eventName(nodes) {
    const event = nodes[0];
    return event && event.kind === 'StringLiteral' ? String(event.text) : '';
}
export function registerHttp(r) {
    defineModule(r, 'http');
    defineModule(r, 'https');
    defineHelper(r, 'nodeHttp', ['bufio', 'bytes', 'context', 'crypto/tls', 'errors', 'fmt', 'io', 'log', 'math', 'net', 'net/http', 'net/url', 'reflect', 'sort', 'strconv', 'strings', 'sync', 'sync/atomic', 'time', 'unsafe'], ['nodeNet', 'netErrors', 'nodeStream', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'orderedMap', 'buffer', 'tlsConfig'], httpHelper);
    const use = () => r.helper('nodeHttp');
    defineClass(r, 'http.IncomingMessage', '*TnIncomingMessage', 'class', STREAM_METHODS + '; setTimeout=*TnIncomingMessage', 'method=string; url=string; httpVersion=string; httpVersionMajor=float64; httpVersionMinor=float64; statusCode=float64; statusMessage=string; complete=bool; aborted=bool', STREAM_GETTERS + '; headers=*TnMap[string, string]; headersDistinct=*TnMap[string, []string]; rawHeaders=[]string; trailers=*TnMap[string, string]; socket=*TnSocket; connection=*TnSocket; signal=*TnAbortSignal', '');
    defineClass(r, 'http.ServerResponse', '*TnServerResponse', 'class', SERVER_RESPONSE_METHODS, 'statusCode=float64; statusMessage=string; sendDate=bool', STREAM_GETTERS + '; headersSent=bool; req=*TnIncomingMessage; socket=*TnSocket', 'statusCode; statusMessage; sendDate');
    defineClass(r, 'http.ClientRequest', '*TnClientRequest', 'class', CLIENT_REQUEST_METHODS, 'method=string; path=string; host=string; protocol=string; aborted=bool; reusedSocket=bool; maxHeadersCount=interface{}', STREAM_GETTERS + '; headersSent=bool; socket=*TnSocket', '');
    defineClass(r, 'http.Server', '*TnHttpServer', 'class', SERVER_METHODS.replace('listen=*TnNetServer', 'listen=*TnHttpServer').replace('close=*TnNetServer', 'close=*TnHttpServer') +
        '; setTimeout=*TnHttpServer; closeAllConnections=; closeIdleConnections=', 'maxHeadersCount=interface{}', 'listening=bool; maxConnections=float64; timeout=float64; keepAliveTimeout=float64; headersTimeout=float64; requestTimeout=float64', 'maxConnections; timeout; keepAliveTimeout; headersTimeout; requestTimeout');
    defineClass(r, 'http.Agent', '*TnHttpAgent', 'class', 'destroy=', 'keepAlive=bool; keepAliveMsecs=float64; maxSockets=float64; maxTotalSockets=float64; maxFreeSockets=float64; scheduling=string; timeout=interface{}; options=interface{}', '', 'keepAlive; keepAliveMsecs; maxSockets; maxTotalSockets; maxFreeSockets; scheduling; timeout');
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
    r.methods['http.ServerResponse#writeHead'] = (c) => {
        if (c.nodes.length === 2 && isObjectLiteral(c.nodes[1])) {
            const props = c.nodes[1].properties ?? [];
            if (props.length === 1 && props[0].kind === 'PropertyAssignment' && props[0].name && isStringNode(props[0].initializer)) {
                const k = props[0].name.kind === 'Identifier' || props[0].name.kind === 'StringLiteral' ? String(props[0].name.text) : '';
                if (k !== '') {
                    return `${c.recv}.writeHeadKV(${c.args[0]}, ${goString(k)}, ${goString(String(props[0].initializer.text))})`;
                }
            }
        }
        return `${c.recv}.writeHead(${c.args.join(', ')})`;
    };
    r.methods['https.ServerResponse#writeHead'] = r.methods['http.ServerResponse#writeHead'];
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
        if (name === 'request' || name === 'checkContinue' || name === 'checkExpectation')
            return ['*TnIncomingMessage', '*TnServerResponse'];
        if (name === 'stream')
            return ['*TnHttp2Stream', '*TnMap[string, interface{}]', 'float64'];
        if (name === 'session')
            return ['*TnHttp2Session', '*TnSocket'];
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
            return 'TnHttpGlobalAgent()';
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
    for (const [name, result] of [['isValidHeaderName', 'bool'], ['isValidHeaderValue', 'bool'], ['websocketMask', ''], ['websocketUnmask', '']]) {
        r.functions[`http.${name}`] = (c) => {
            use();
            return `Tn${name[0].toUpperCase()}${name.slice(1)}(${c.args.join(', ')})`;
        };
        r.results[`http.${name}`] = result;
    }
    r.values['http.maxHeaderSize'] = (_c) => '16384.0';
    r.valueTypes['http.maxHeaderSize'] = 'float64';
}
