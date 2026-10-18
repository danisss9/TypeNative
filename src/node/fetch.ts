// Global fetch + Headers / Request / Response (the WHATWG Fetch API Node
// ships), on Go's net/http client. fetch() resolves once the response headers
// arrive; text() / json() / bytes() read the body on a goroutine. Like Node's
// fetch: redirects are followed (redirect: 'manual' | 'error' change that),
// gzip / deflate bodies are decompressed, network failures reject with
// TypeError('fetch failed') whose `cause` is the system error.

import { NodeRegistry, NodeCall, defineClass, defineHelper, setResults } from './registry.js';

const fetchHelper = `// fetch
// Headers: case-insensitive, iterated sorted by name (as in the spec)
type TnHeaders struct {
	vals  map[string][]string
	guard string
}

func TnNewHeaders(init ...interface{}) *TnHeaders {
	h := &TnHeaders{vals: map[string][]string{}}
	if len(init) > 0 && init[0] != nil {
		switch src := init[0].(type) {
		case *TnHeaders:
			for k, v := range src.vals {
				h.vals[k] = append([]string{}, v...)
			}
		case [][]string:
			for _, pair := range src {
				if len(pair) == 2 {
					h.append(pair[0], pair[1])
				}
			}
		case [][]interface{}:
			for _, pair := range src {
				if len(pair) == 2 {
					h.append(TnJSString(pair[0]), TnJSString(pair[1]))
				}
			}
		case []interface{}:
			for _, item := range src {
				if pair, ok := item.([]interface{}); ok && len(pair) == 2 {
					h.append(TnJSString(pair[0]), TnJSString(pair[1]))
				} else if pair, ok := item.([]string); ok && len(pair) == 2 {
					h.append(pair[0], pair[1])
				}
			}
		default:
			for _, e := range tnEntries(init[0]) {
				for _, v := range tnHeaderStrings(e[1]) {
					h.append(fmt.Sprint(e[0]), v)
				}
			}
		}
	}
	return h
}

func (h *TnHeaders) get(name string) *string {
	values, ok := h.vals[strings.ToLower(name)]
	if !ok {
		return nil
	}
	joined := strings.Join(values, ", ")
	return &joined
}

func (h *TnHeaders) getSetCookie() []string {
	return append([]string{}, h.vals["set-cookie"]...)
}

func (h *TnHeaders) has(name string) bool {
	_, ok := h.vals[strings.ToLower(name)]
	return ok
}

func (h *TnHeaders) set(name string, value string) {
	h.vals[strings.ToLower(name)] = []string{strings.TrimSpace(value)}
}

func (h *TnHeaders) append(name string, value string) {
	key := strings.ToLower(name)
	h.vals[key] = append(h.vals[key], strings.TrimSpace(value))
}

func (h *TnHeaders) delete(name string) {
	delete(h.vals, strings.ToLower(name))
}

func (h *TnHeaders) sortedKeys() []string {
	keys := make([]string, 0, len(h.vals))
	for k := range h.vals {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func (h *TnHeaders) entries() [][]string {
	out := [][]string{}
	for _, k := range h.sortedKeys() {
		if k == "set-cookie" {
			for _, v := range h.vals[k] {
				out = append(out, []string{k, v})
			}
			continue
		}
		out = append(out, []string{k, strings.Join(h.vals[k], ", ")})
	}
	return out
}

func (h *TnHeaders) keys() []string {
	out := []string{}
	for _, e := range h.entries() {
		out = append(out, e[0])
	}
	return out
}

func (h *TnHeaders) values() []string {
	out := []string{}
	for _, e := range h.entries() {
		out = append(out, e[1])
	}
	return out
}

func (h *TnHeaders) forEach(cb interface{}) {
	for _, e := range h.entries() {
		TnInvoke(cb, e[1], e[0], h)
	}
}

func (h *TnHeaders) tnIterator() [][]string { return h.entries() }

func (h *TnHeaders) toGo(dst http.Header) {
	for k, v := range h.vals {
		dst[http.CanonicalHeaderKey(k)] = append([]string{}, v...)
	}
}

// A request or response body: bytes, a reader consumed once, or a ReadableStream
type tnBody struct {
	data     []byte
	reader   io.ReadCloser
	stream   *TnReadableStream
	hasBody  bool
	bodyUsed bool
}

func (b *tnBody) used() bool {
	return b.bodyUsed || (b.stream != nil && b.stream.disturbed)
}

// The body as a ReadableStream (null without a body)
func (b *tnBody) webStream() *TnReadableStream {
	if !b.hasBody {
		return nil
	}
	if b.stream == nil {
		if b.reader != nil {
			b.stream = tnWebFromReader(b.reader)
			b.reader = nil
		} else {
			b.stream = tnWebFromBytes(b.data)
		}
		if b.bodyUsed {
			b.stream.disturbed = true
		}
	}
	return b.stream
}

func (b *tnBody) consume() chan []byte {
	ch := make(chan []byte, 1)
	if b.used() || (b.stream != nil && b.stream.reader != nil) {
		TnReject(ch, TnNodeError("TypeError", "", "Body is unusable: Body has already been read"))
		return ch
	}
	b.bodyUsed = true
	if b.stream != nil {
		tnWebReadAll(b.stream, func(chunks []interface{}, reason interface{}, failed bool) {
			if failed {
				TnReject(ch, reason)
				return
			}
			data := []byte{}
			for _, c := range chunks {
				data = append(data, tnWebChunkBytes(c)...)
			}
			ch <- data
		})
		return ch
	}
	if b.reader == nil {
		ch <- b.data
		return ch
	}
	reader := b.reader
	go func() {
		defer reader.Close()
		data, err := io.ReadAll(reader)
		if err != nil {
			e := TnNodeError("TypeError", "", "terminated")
			e.props["cause"] = TnNetError(err, "read", "", -1)
			TnReject(ch, e)
			return
		}
		ch <- data
	}()
	return ch
}

func tnBodyText(b *tnBody) chan string {
	out := make(chan string, 1)
	src := b.consume()
	go func() {
		data, reason, rejected := tnSettle(src)
		if rejected {
			TnReject(out, reason)
			return
		}
		out <- TnBufferToString(data, "utf8")
	}()
	return out
}

func tnBodyJSON(b *tnBody) chan interface{} {
	out := make(chan interface{}, 1)
	src := b.consume()
	go func() {
		data, reason, rejected := tnSettle(src)
		if rejected {
			TnReject(out, reason)
			return
		}
		var v interface{}
		if err := json.Unmarshal(data, &v); err != nil {
			TnReject(out, TnNodeError("SyntaxError", "", "Unexpected token in JSON: "+err.Error()))
			return
		}
		out <- v
	}()
	return out
}

func tnBodyBlob(b *tnBody, headers *TnHeaders) chan *TnBlob {
	out := make(chan *TnBlob, 1)
	src := b.consume()
	go func() {
		data, reason, rejected := tnSettle(src)
		if rejected {
			TnReject(out, reason)
			return
		}
		blob := &TnBlob{data: data}
		if ct := headers.get("content-type"); ct != nil {
			blob.type_ = tnBlobType(map[string]interface{}{"type": *ct})
		}
		out <- blob
	}()
	return out
}

func tnBodyFormData(b *tnBody, headers *TnHeaders) chan *TnFormData {
	out := make(chan *TnFormData, 1)
	src := b.consume()
	go func() {
		data, reason, rejected := tnSettle(src)
		if rejected {
			TnReject(out, reason)
			return
		}
		ct := ""
		if h := headers.get("content-type"); h != nil {
			ct = *h
		}
		form, err := tnParseFormData(data, ct)
		if err != nil {
			TnReject(out, TnNodeError("TypeError", "", "Response.formData: Could not parse content as FormData."))
			return
		}
		out <- form
	}()
	return out
}

// Body init values: strings, Buffers, URLSearchParams, Blobs, FormData,
// ReadableStreams, anything with toString
func tnBodyInit(body interface{}, headers *TnHeaders) *tnBody {
	b := &tnBody{}
	if body == nil || TnIsNil(body) {
		return b
	}
	b.hasBody = true
	switch x := body.(type) {
	case string:
		b.data = []byte(x)
		if !headers.has("content-type") {
			headers.set("content-type", "text/plain;charset=UTF-8")
		}
	case []byte:
		b.data = x
	case *TnReadableStream:
		b.stream = x
	case *TnBlob:
		b.data = x.data
		if x.type_ != "" && !headers.has("content-type") {
			headers.set("content-type", x.type_)
		}
	case *TnFormData:
		data, ct := x.encode()
		b.data = data
		if !headers.has("content-type") {
			headers.set("content-type", ct)
		}
	case interface{ Get_size() float64; String() string }:
		b.data = []byte(x.String())
		if !headers.has("content-type") {
			headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8")
		}
	default:
		b.data = []byte(TnJSString(body))
		if !headers.has("content-type") {
			headers.set("content-type", "text/plain;charset=UTF-8")
		}
	}
	return b
}

type TnResponse struct {
	status     float64
	statusText string
	headers    *TnHeaders
	url        string
	redirected bool
	type_      string
	body       *tnBody
}

func (r *TnResponse) Get_type_() string { return r.type_ }
func (r *TnResponse) Get_ok() bool        { return r.status >= 200 && r.status <= 299 }
func (r *TnResponse) Get_bodyUsed() bool  { return r.body.used() }
func (r *TnResponse) Get_body() *TnReadableStream { return r.body.webStream() }
func (r *TnResponse) text() chan string   { return tnBodyText(r.body) }
func (r *TnResponse) json() chan interface{} { return tnBodyJSON(r.body) }
func (r *TnResponse) bytes() chan []byte  { return r.body.consume() }
func (r *TnResponse) arrayBuffer() chan []byte { return r.body.consume() }
func (r *TnResponse) blob() chan *TnBlob  { return tnBodyBlob(r.body, r.headers) }
func (r *TnResponse) formData() chan *TnFormData { return tnBodyFormData(r.body, r.headers) }

// Stream bodies split into two branches
func (b *tnBody) cloneStream() *tnBody {
	branches := b.stream.tee()
	b.stream = branches[0]
	return &tnBody{stream: branches[1], hasBody: true}
}

// clone(): both copies can be read
func (r *TnResponse) clone() *TnResponse {
	if r.body.used() {
		panic(TnNodeError("TypeError", "", "Response.clone: Body has already been consumed."))
	}
	// A network body is not read here: both copies stream it (tee)
	if r.body.reader != nil {
		r.body.webStream()
	}
	if r.body.stream != nil {
		c := *r
		c.headers = TnNewHeaders(r.headers)
		c.body = r.body.cloneStream()
		return &c
	}
	c := *r
	c.headers = TnNewHeaders(r.headers)
	c.body = &tnBody{data: r.body.data, hasBody: r.body.hasBody}
	return &c
}

func tnResponseInit(r *TnResponse, init []interface{}) {
	if len(init) == 0 || init[0] == nil {
		return
	}
	if n, ok := tnNetNumber(TnGet(init[0], "status")); ok {
		r.status = n
		r.statusText = ""
	}
	if s, ok := TnGet(init[0], "statusText").(string); ok {
		r.statusText = s
	}
	if h := TnGet(init[0], "headers"); h != nil {
		r.headers = TnNewHeaders(h)
	}
}

// new Response(body?, init?)
func TnNewResponse(body interface{}, init ...interface{}) *TnResponse {
	r := &TnResponse{status: 200, headers: TnNewHeaders(), type_: "default"}
	tnResponseInit(r, init)
	r.body = tnBodyInit(body, r.headers)
	return r
}

// Response.json(data, init?)
func TnResponseJSON(data interface{}, init ...interface{}) *TnResponse {
	r := TnNewResponse(TnJSONStringify(data, ""), init...)
	r.headers.set("content-type", "application/json")
	return r
}

func TnResponseError() *TnResponse {
	return &TnResponse{status: 0, headers: TnNewHeaders(), type_: "error", body: &tnBody{}}
}

func TnResponseRedirect(target string, status ...float64) *TnResponse {
	r := &TnResponse{status: 302, headers: TnNewHeaders(), type_: "default", body: &tnBody{}}
	if len(status) > 0 {
		r.status = status[0]
	}
	r.headers.set("location", target)
	return r
}

type TnRequest struct {
	url      string
	method   string
	headers  *TnHeaders
	redirect string
	signal   *TnAbortSignal
	body     *tnBody
}

func (r *TnRequest) Get_bodyUsed() bool    { return r.body.used() }
func (r *TnRequest) Get_body() *TnReadableStream { return r.body.webStream() }
func (r *TnRequest) text() chan string     { return tnBodyText(r.body) }
func (r *TnRequest) json() chan interface{} { return tnBodyJSON(r.body) }
func (r *TnRequest) bytes() chan []byte    { return r.body.consume() }
func (r *TnRequest) arrayBuffer() chan []byte { return r.body.consume() }
func (r *TnRequest) blob() chan *TnBlob    { return tnBodyBlob(r.body, r.headers) }
func (r *TnRequest) formData() chan *TnFormData { return tnBodyFormData(r.body, r.headers) }

func (r *TnRequest) clone() *TnRequest {
	c := *r
	c.headers = TnNewHeaders(r.headers)
	if r.body.stream != nil {
		c.body = r.body.cloneStream()
		return &c
	}
	c.body = &tnBody{data: r.body.data, hasBody: r.body.hasBody}
	return &c
}

func tnFetchURL(input interface{}) string {
	switch x := input.(type) {
	case string:
		return x
	case interface{ Get_href() string }:
		return x.Get_href()
	case *TnRequest:
		return x.url
	}
	return TnJSString(input)
}

// new Request(input, init?)
func TnNewRequest(input interface{}, init ...interface{}) *TnRequest {
	req := &TnRequest{method: "GET", headers: TnNewHeaders(), redirect: "follow", body: &tnBody{}}
	if src, ok := input.(*TnRequest); ok {
		c := src.clone()
		req = c
	} else {
		raw := tnFetchURL(input)
		u, err := tnurl.Parse(raw)
		if err != nil || u.Scheme == "" {
			e := TnNodeError("TypeError", "ERR_INVALID_URL", "Failed to parse URL from "+raw)
			panic(e)
		}
		req.url = u.String()
	}
	if len(init) > 0 && init[0] != nil {
		opts := init[0]
		if m := tnNetString(TnGet(opts, "method")); m != "" {
			upper := strings.ToUpper(m)
			switch upper {
			case "DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT":
				m = upper
			}
			req.method = m
		}
		if h := TnGet(opts, "headers"); h != nil {
			req.headers = TnNewHeaders(h)
		}
		if rd := tnNetString(TnGet(opts, "redirect")); rd != "" {
			req.redirect = rd
		}
		if sig, ok := TnGet(opts, "signal").(*TnAbortSignal); ok && sig != nil {
			req.signal = sig
		}
		if body := TnGet(opts, "body"); body != nil && !TnIsNil(body) {
			if req.method == "GET" || req.method == "HEAD" {
				panic(TnNodeError("TypeError", "", "Request with GET/HEAD method cannot have body."))
			}
			req.body = tnBodyInit(body, req.headers)
		}
	}
	return req
}

var tnFetchClients sync.Map

// The Fetch standard's blocked ports: fetch fails with cause "bad port"
var tnFetchBadPorts = map[string]bool{}

func init() {
	for _, p := range []int{1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080} {
		tnFetchBadPorts[strconv.Itoa(p)] = true
	}
}

func tnFetchBadPort(u *tnurl.URL) *TnError {
	if (u.Scheme == "http" || u.Scheme == "https") && tnFetchBadPorts[u.Port()] {
		return TnNodeError("Error", "", "bad port")
	}
	return nil
}

func tnFetchClient(redirect string) *http.Client {
	if c, ok := tnFetchClients.Load(redirect); ok {
		return c.(*http.Client)
	}
	client := &http.Client{Transport: &http.Transport{Proxy: nil, ForceAttemptHTTP2: true, IdleConnTimeout: 4 * time.Second}}
	switch redirect {
	case "manual":
		client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	case "error":
		client.CheckRedirect = func(*http.Request, []*http.Request) error {
			return TnNodeError("TypeError", "", "unexpected redirect")
		}
	default:
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			if len(via) >= 20 {
				return TnNodeError("TypeError", "", "redirect count exceeded")
			}
			if bad := tnFetchBadPort(req.URL); bad != nil {
				return bad
			}
			return nil
		}
	}
	tnFetchClients.Store(redirect, client)
	return client
}

func tnFetchAbortReason(signal *TnAbortSignal) interface{} {
	if signal.reason != nil {
		return signal.reason
	}
	return tnAbortError("This operation was aborted", "AbortError")
}

// fetch(input, init?)
func TnFetch(input interface{}, init ...interface{}) chan *TnResponse {
	ch := make(chan *TnResponse, 1)
	var req *TnRequest
	func() {
		defer func() {
			if r := recover(); r != nil {
				TnReject(ch, r)
			}
		}()
		req = TnNewRequest(input, init...)
	}()
	if req == nil {
		return ch
	}
	if req.signal != nil && req.signal.aborted {
		TnReject(ch, tnFetchAbortReason(req.signal))
		return ch
	}
	ctx, cancel := context.WithCancel(context.Background())
	var aborted int32
	if req.signal != nil {
		signal := req.signal
		signal.addEventListener("abort", func(ev *TnEvent) {
			atomic.StoreInt32(&aborted, 1)
			cancel()
		})
	}
	var body io.Reader
	if req.body.stream != nil {
		body = tnWebIOReader(req.body.stream)
	} else if req.body.hasBody {
		body = bytes.NewReader(req.body.data)
	}
	goReq, err := http.NewRequestWithContext(ctx, req.method, req.url, body)
	if err != nil {
		cancel()
		TnReject(ch, TnNodeError("TypeError", "", "fetch failed"))
		return ch
	}
	if bad := tnFetchBadPort(goReq.URL); bad != nil {
		cancel()
		e := TnNodeError("TypeError", "", "fetch failed")
		e.props["cause"] = bad
		TnReject(ch, e)
		return ch
	}
	req.headers.toGo(goReq.Header)
	if goReq.Header.Get("Accept") == "" {
		goReq.Header.Set("Accept", "*/*")
	}
	if goReq.Header.Get("User-Agent") == "" {
		goReq.Header.Set("User-Agent", "node")
	}
	if h := goReq.Header.Get("Host"); h != "" {
		goReq.Host = h
	}
	client := tnFetchClient(req.redirect)
	signal := req.signal
	go func() {
		resp, err := client.Do(goReq)
		if err != nil {
			cancel()
			if atomic.LoadInt32(&aborted) == 1 {
				TnReject(ch, tnFetchAbortReason(signal))
				return
			}
			e := TnNodeError("TypeError", "", "fetch failed")
			if te := tnUnwrapFetchError(err); te != nil {
				if te.Get_name() == "TypeError" {
					TnReject(ch, te)
					return
				}
				e.props["cause"] = te
			} else {
				var opErr *net.OpError
				if errors.As(err, &opErr) && opErr.Op == "dial" {
					host, port, _ := net.SplitHostPort(goReq.URL.Host)
					if port == "" {
						port = "80"
						if goReq.URL.Scheme == "https" {
							port = "443"
						}
					}
					if ip := tnDialedIP(err); ip != "" {
						host = ip
					}
					p, _ := strconv.ParseFloat(port, 64)
					e.props["cause"] = TnNetError(err, "connect", host, p)
				} else if code := tnNetCode(err); code == "ENOTFOUND" || code == "EAI_AGAIN" {
					ce := TnNodeError("Error", code, "getaddrinfo "+code+" "+goReq.URL.Hostname())
					ce.props["errno"] = tnNetErrnos[code]
					ce.props["syscall"] = "getaddrinfo"
					ce.props["hostname"] = goReq.URL.Hostname()
					e.props["cause"] = ce
				} else {
					e.props["cause"] = TnNodeError("Error", code, err.Error())
				}
			}
			TnReject(ch, e)
			return
		}
		res := &TnResponse{
			status:     float64(resp.StatusCode),
			statusText: strings.TrimSpace(strings.TrimPrefix(resp.Status, strconv.Itoa(resp.StatusCode))),
			headers:    TnNewHeaders(),
			url:        resp.Request.URL.String(),
			redirected: resp.Request.URL.String() != req.url,
			type_:      "basic",
		}
		for k, v := range resp.Header {
			res.headers.vals[strings.ToLower(k)] = append([]string{}, v...)
		}
		res.body = &tnBody{reader: &tnCancelOnClose{ReadCloser: resp.Body, cancel: cancel}, hasBody: true}
		ch <- res
	}()
	return ch
}

type tnCancelOnClose struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (c *tnCancelOnClose) Close() error {
	err := c.ReadCloser.Close()
	c.cancel()
	return err
}

func tnUnwrapFetchError(err error) *TnError {
	var te *TnError
	if errors.As(err, &te) {
		return te
	}
	return nil
}`;

export function registerFetch(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeFetch',
    ['bytes', 'context', 'encoding/json', 'errors', 'fmt', 'io', 'net', 'net/http', 'net/url', 'sort', 'strconv', 'strings', 'sync', 'sync/atomic', 'time'],
    ['nodeHttp', 'nodeNet', 'netErrors', 'nodeEvents', 'promise', 'buffer', 'dynamic', 'nodeInvoke', 'jsonStringify', 'nodeStreamWeb'],
    fetchHelper
  );
  const use = () => r.helper('nodeFetch');
  defineClass(
    r,
    'globals.Headers',
    '*TnHeaders',
    'class',
    'get=*string; getSetCookie=[]string; has=bool; set=; append=; delete=; entries=[][]string; keys=[]string; values=[]string; forEach=',
    '',
    '',
    ''
  );
  r.iterators['*TnHeaders'] = 'tnIterator';
  r.classes['globals.Headers'].methods['tnIterator'] = '[][]string';
  r.paramTypers['globals.Headers#forEach'] = (_n: any[]) => ['string', 'string', '*TnHeaders'];
  const bodyMethods =
    'text=chan string; json=chan interface{}; bytes=chan []byte; arrayBuffer=chan []byte; blob=chan *TnBlob; formData=chan *TnFormData';
  defineClass(
    r,
    'globals.Response',
    '*TnResponse',
    'class',
    `${bodyMethods}; clone=*TnResponse`,
    'status=float64; statusText=string; headers=*TnHeaders; url=string; redirected=bool',
    'ok=bool; bodyUsed=bool; type=string; body=*TnReadableStream',
    ''
  );
  defineClass(
    r,
    'globals.Request',
    '*TnRequest',
    'class',
    `${bodyMethods}; clone=*TnRequest`,
    'url=string; method=string; headers=*TnHeaders; redirect=string; signal=*TnAbortSignal',
    'bodyUsed=bool; body=*TnReadableStream',
    ''
  );
  for (const name of ['Headers', 'Response', 'Request']) r.globals[name] = `globals.${name}`;
  r.globals['fetch'] = 'globals.fetch';
  r.constructors['globals.Headers'] = (c: NodeCall) => {
    use();
    return `TnNewHeaders(${c.args.join(', ')})`;
  };
  r.constructors['globals.Response'] = (c: NodeCall) => {
    use();
    return `TnNewResponse(${c.args.length > 0 ? c.args.join(', ') : 'nil'})`;
  };
  r.constructors['globals.Request'] = (c: NodeCall) => {
    use();
    return `TnNewRequest(${c.args.join(', ')})`;
  };
  r.functions['globals.fetch'] = (c: NodeCall) => {
    use();
    return `TnFetch(${c.args.join(', ')})`;
  };
  r.results['globals.fetch'] = 'chan *TnResponse';
  r.functions['globals.Response.json'] = (c: NodeCall) => {
    use();
    return `TnResponseJSON(${c.args.join(', ')})`;
  };
  r.functions['globals.Response.error'] = (_c: NodeCall) => {
    use();
    return 'TnResponseError()';
  };
  r.functions['globals.Response.redirect'] = (c: NodeCall) => {
    use();
    return `TnResponseRedirect(${c.args.join(', ')})`;
  };
  setResults(r, 'globals.Response', 'json=*TnResponse; error=*TnResponse; redirect=*TnResponse');
}
