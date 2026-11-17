// node:worker_threads — a Worker runs the current program again as a child
// process (its own isolate, as in Node): the child connects back to the
// parent over a loopback TCP connection that carries length-prefixed,
// structured-clone-like messages (JSON plus Buffers, Maps, Sets, Dates,
// BigInts and Errors). In the child, isMainThread is false and parentPort /
// workerData are set. MessageChannel / MessagePort / BroadcastChannel work
// within one process. The worker's stdout / stderr are the parent's; an
// uncaught exception in a worker becomes an 'error' event and exit code 1.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const cloneHelper = `// Structured clone (subset): values to and from JSON with type tags
// Objects keep their key order: {"$tn": "Object", "k": keys, "v": values}
func tnCloneObject(keys []string, values []interface{}) map[string]interface{} {
	k := make([]interface{}, len(keys))
	for i, key := range keys {
		k[i] = key
	}
	return map[string]interface{}{"$tn": "Object", "k": k, "v": values}
}

// Transferables (MessagePorts in a transferList) go through a hook of the
// sending link; without one they can't be cloned, as in Node
type tnCloneHooks struct {
	transfer func(v interface{}) (interface{}, bool)
	receive  func(tag map[string]interface{}) interface{}
}

func tnCloneEncode(v interface{}) interface{} { return tnCloneEncodeIn(v, nil) }

func tnCloneEncodeIn(v interface{}, h *tnCloneHooks) interface{} {
	if t, ok := v.(interface{ tnTransferable() }); ok && !TnIsNil(v) {
		if h != nil && h.transfer != nil {
			if out, ok := h.transfer(t); ok {
				return out
			}
		}
		panic(TnNodeError("DataCloneError", "", "Object that needs transfer was found in message but not listed in transferList"))
	}
	switch x := v.(type) {
	case nil:
		return nil
	case bool, string, float64:
		return x
	case int:
		return float64(x)
	case *string:
		if x == nil {
			return nil
		}
		return *x
	case *float64:
		if x == nil {
			return nil
		}
		return *x
	case *bool:
		if x == nil {
			return nil
		}
		return *x
	case []byte:
		return map[string]interface{}{"$tn": "Buffer", "v": base64.StdEncoding.EncodeToString(x)}
	case *tnbig.Int:
		return map[string]interface{}{"$tn": "BigInt", "v": x.String()}
	case time.Time:
		return map[string]interface{}{"$tn": "Date", "v": float64(x.UnixMilli())}
	case *TnError:
		props := map[string]interface{}{}
		for k, val := range x.props {
			props[k] = tnCloneEncodeIn(val, h)
		}
		return map[string]interface{}{"$tn": "Error", "message": x.message, "code": x.code, "props": props}
	case map[string]interface{}:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		values := make([]interface{}, len(keys))
		for i, k := range keys {
			values[i] = tnCloneEncodeIn(x[k], h)
		}
		return tnCloneObject(keys, values)
	case []interface{}:
		out := make([]interface{}, len(x))
		for i, val := range x {
			out[i] = tnCloneEncodeIn(val, h)
		}
		return out
	}
	if withEntries, ok := v.(interface{ Entries() [][]interface{} }); ok {
		kind := uint8(0)
		if tagged, ok := v.(interface{ TnJSKind() uint8 }); ok {
			kind = tagged.TnJSKind()
		}
		// a record (string keys, not made by new Map()) is a plain object
		if kind == 0 {
			entries := withEntries.Entries()
			keys := make([]string, 0, len(entries))
			values := make([]interface{}, 0, len(entries))
			plain := true
			for _, e := range entries {
				k, isString := e[0].(string)
				if !isString {
					plain = false
					break
				}
				keys = append(keys, k)
				values = append(values, tnCloneEncodeIn(e[1], h))
			}
			if plain {
				return tnCloneObject(keys, values)
			}
		}
		if kind == 2 {
			values := []interface{}{}
			for _, e := range withEntries.Entries() {
				values = append(values, tnCloneEncodeIn(e[0], h))
			}
			return map[string]interface{}{"$tn": "Set", "v": values}
		}
		pairs := []interface{}{}
		for _, e := range withEntries.Entries() {
			pairs = append(pairs, []interface{}{tnCloneEncodeIn(e[0], h), tnCloneEncodeIn(e[1], h)})
		}
		return map[string]interface{}{"$tn": "Map", "v": pairs}
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Func, reflect.Chan:
		panic(TnNodeError("DataCloneError", "", fmt.Sprint(v)+" could not be cloned."))
	case reflect.Slice, reflect.Array:
		out := make([]interface{}, rv.Len())
		for i := 0; i < rv.Len(); i++ {
			out[i] = tnCloneEncodeIn(rv.Index(i).Interface(), h)
		}
		return out
	case reflect.Map:
		out := map[string]interface{}{}
		for _, key := range rv.MapKeys() {
			out[fmt.Sprint(key.Interface())] = tnCloneEncodeIn(rv.MapIndex(key).Interface(), h)
		}
		return out
	case reflect.Pointer:
		if rv.IsNil() {
			return nil
		}
		if rv.Elem().Kind() == reflect.Struct {
			sv := rv.Elem()
			keys := []string{}
			values := []interface{}{}
			for i := 0; i < sv.NumField(); i++ {
				f := sv.Field(i)
				if f.Kind() == reflect.Func {
					continue
				}
				value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
				keys = append(keys, strings.TrimSuffix(sv.Type().Field(i).Name, "_"))
				values = append(values, tnCloneEncodeIn(value, h))
			}
			return tnCloneObject(keys, values)
		}
		return tnCloneEncodeIn(rv.Elem().Interface(), h)
	case reflect.Float32, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64, reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return rv.Convert(reflect.TypeOf(float64(0))).Interface()
	}
	return TnJSString(v)
}

func tnCloneDecode(v interface{}) interface{} { return tnCloneDecodeIn(v, nil) }

func tnCloneDecodeIn(v interface{}, h *tnCloneHooks) interface{} {
	switch x := v.(type) {
	case []interface{}:
		for i, val := range x {
			x[i] = tnCloneDecodeIn(val, h)
		}
		return x
	case map[string]interface{}:
		if tag, ok := x["$tn"].(string); ok {
			switch tag {
			case "Port":
				if h != nil && h.receive != nil {
					return h.receive(x)
				}
				return x
			case "Buffer":
				b, _ := base64.StdEncoding.DecodeString(TnJSString(x["v"]))
				return b
			case "BigInt":
				n, _ := new(tnbig.Int).SetString(TnJSString(x["v"]), 10)
				return n
			case "Date":
				ms, _ := x["v"].(float64)
				return time.UnixMilli(int64(ms))
			case "Error":
				e := TnNodeError("Error", TnJSString(x["code"]), TnJSString(x["message"]))
				if x["code"] == "" {
					e.code = ""
				}
				if props, ok := x["props"].(map[string]interface{}); ok {
					for k, val := range props {
						e.props[k] = tnCloneDecodeIn(val, h)
					}
				}
				return e
			case "Map":
				m := TnJSCollection(TnNewMap[interface{}, interface{}](), 1)
				if pairs, ok := x["v"].([]interface{}); ok {
					for _, p := range pairs {
						if pair, ok := p.([]interface{}); ok && len(pair) == 2 {
							m.Set(tnCloneDecodeIn(pair[0], h), tnCloneDecodeIn(pair[1], h))
						}
					}
				}
				return m
			case "Object":
				// an ordered record, as plain objects print and stringify in order
				m := TnNewMap[string, interface{}]()
				keys, _ := x["k"].([]interface{})
				values, _ := x["v"].([]interface{})
				for i, k := range keys {
					if i < len(values) {
						m.Set(TnJSString(k), tnCloneDecodeIn(values[i], h))
					}
				}
				return m
			case "Set":
				m := TnJSCollection(TnNewMap[interface{}, interface{}](), 2)
				if values, ok := x["v"].([]interface{}); ok {
					for _, val := range values {
						d := tnCloneDecodeIn(val, h)
						m.Set(d, d)
					}
				}
				return m
			}
		}
		for k, val := range x {
			x[k] = tnCloneDecodeIn(val, h)
		}
		return x
	}
	return v
}`;

const workerHelper = `// node:worker_threads
// MessagePort: in-process pairs (MessageChannel) or the link to the parent
type TnMessagePort struct {
	TnEventEmitter
	other     *TnMessagePort
	transport func(data []byte)
	// the link a received port talks over (decodes ports it carries)
	link *tnPortLink
	// a transferred port: deliveries go over the link to its new owner
	forward   func(data []byte)
	detached  bool
	linkClose func()
	queue     []interface{}
	started   bool
	closed    bool
	refd      bool
	unrefd    bool
	onmessage interface{}
	scheduled bool
}

func tnNewPort() *TnMessagePort { return &TnMessagePort{} }

func (p *TnMessagePort) tnTransferable() {}

func (p *TnMessagePort) Get_onmessage() interface{} { return p.onmessage }
func (p *TnMessagePort) Set_onmessage(fn interface{}) {
	p.onmessage = fn
	p.start()
}

// on('message') starts the port and keeps the process alive until close()
func (p *TnMessagePort) on(event string, fn interface{}) *TnEventEmitter {
	p.TnEventEmitter.on(event, fn)
	if event == "message" {
		p.start()
	}
	return &p.TnEventEmitter
}

func (p *TnMessagePort) once(event string, fn interface{}) *TnEventEmitter {
	p.TnEventEmitter.once(event, fn)
	if event == "message" {
		p.start()
	}
	return &p.TnEventEmitter
}

func (p *TnMessagePort) addListener(event string, fn interface{}) *TnEventEmitter { return p.on(event, fn) }

func (p *TnMessagePort) start() {
	if p.closed {
		return
	}
	p.started = true
	if !p.refd && !p.unrefd {
		p.refd = true
		TnLoopRef()
	}
	p.schedule()
}

func (p *TnMessagePort) ref() *TnMessagePort {
	p.unrefd = false
	if !p.refd && p.started && !p.closed {
		p.refd = true
		TnLoopRef()
	}
	return p
}

func (p *TnMessagePort) unref() *TnMessagePort {
	p.unrefd = true
	if p.refd {
		p.refd = false
		TnLoopUnref()
	}
	return p
}

func (p *TnMessagePort) hasRef() bool { return p.refd }

func (p *TnMessagePort) schedule() {
	if p.scheduled || !p.started || len(p.queue) == 0 {
		return
	}
	p.scheduled = true
	TnLoopPost(func() {
		p.scheduled = false
		for p.started && !p.closed && len(p.queue) > 0 {
			msg := p.queue[0]
			p.queue = p.queue[1:]
			p.dispatch(msg)
		}
	})
}

func (p *TnMessagePort) dispatch(msg interface{}) {
	if p.onmessage != nil {
		TnInvoke(p.onmessage, &TnMessageEvent{data: msg, eventType: "message"})
	}
	p.emit("message", msg)
}

func (p *TnMessagePort) deliver(msg interface{}) {
	if p.closed {
		return
	}
	p.queue = append(p.queue, msg)
	p.schedule()
}

func (p *TnMessagePort) postMessage(value interface{}, transfer ...interface{}) {
	if p.closed || p.detached {
		return
	}
	link := p.link
	if p.transport == nil {
		link = nil
	}
	p.postRaw(tnEncodeTransfer(value, transfer, link))
}

// An encoded message posted on this port: to its peer, or over its link
func (p *TnMessagePort) postRaw(data []byte) {
	if p.transport != nil {
		p.transport(data)
		return
	}
	if p.other != nil {
		p.other.deliverData(data, nil)
	}
}

// An encoded message arriving at this port (from link, nil when in-process)
func (p *TnMessagePort) deliverData(data []byte, link *tnPortLink) {
	if p.forward != nil {
		p.forward(data)
		return
	}
	p.deliver(tnDecodeTransfer(data, link))
}

func (p *TnMessagePort) close() { p.closeFrom(false) }

// remote: the other process closed it (nothing to tell the link)
func (p *TnMessagePort) closeFrom(remote bool) {
	if p.closed {
		return
	}
	p.closed = true
	p.unref()
	if !remote && p.linkClose != nil {
		p.linkClose()
	}
	if !p.detached {
		TnLoopPost(func() { p.emit("close") })
	}
	if other := p.other; other != nil && !other.closed {
		other.close()
	}
}

// --- transferring ports ---
// A MessagePort in a transferList travels as {"$tn": "Port", "id": n}. The
// sender keeps the entangled peer and relays over the worker link: 'p'
// frames (id + message) both ways, 'q' when either side closes. Ids count up
// in the parent and down in a worker, so they never collide.
type tnPortEnd struct {
	onData  func(data []byte)
	onClose func()
}

type tnPortLink struct {
	send  func(kind byte, payload []byte)
	ports map[float64]*tnPortEnd
	next  float64
	step  float64
}

func tnNewPortLink(step float64, send func(kind byte, payload []byte)) *tnPortLink {
	return &tnPortLink{send: send, ports: map[float64]*tnPortEnd{}, step: step}
}

func tnPortFrame(id float64, data []byte) []byte {
	b := make([]byte, 8, 8+len(data))
	binary.BigEndian.PutUint64(b, math.Float64bits(id))
	return append(b, data...)
}

// A 'p' / 'q' frame from the link (on the loop); false for other kinds
func (l *tnPortLink) handle(kind byte, payload []byte) bool {
	if (kind != 'p' && kind != 'q') || len(payload) < 8 {
		return false
	}
	id := math.Float64frombits(binary.BigEndian.Uint64(payload))
	end := l.ports[id]
	if end == nil {
		return true
	}
	if kind == 'p' {
		end.onData(payload[8:])
	} else {
		delete(l.ports, id)
		end.onClose()
	}
	return true
}

// The link is gone: every port relayed over it closes
func (l *tnPortLink) closeAll() {
	ends := l.ports
	l.ports = map[float64]*tnPortEnd{}
	for _, end := range ends {
		end.onClose()
	}
}

// A port leaving this process: what reaches it goes over the link, what the
// other side posts on it goes where it would have
func (l *tnPortLink) export(p *TnMessagePort) map[string]interface{} {
	l.next += l.step
	id := l.next
	p.detached = true
	p.queue = nil
	p.unref()
	p.forward = func(data []byte) { l.send('p', tnPortFrame(id, data)) }
	p.linkClose = func() {
		delete(l.ports, id)
		l.send('q', tnPortFrame(id, nil))
	}
	l.ports[id] = &tnPortEnd{onData: p.postRaw, onClose: func() { p.closeFrom(true) }}
	return map[string]interface{}{"$tn": "Port", "id": id}
}

// A port arriving over the link
func (l *tnPortLink) receive(id float64) *TnMessagePort {
	r := tnNewPort()
	r.link = l
	r.transport = func(data []byte) { l.send('p', tnPortFrame(id, data)) }
	r.linkClose = func() {
		delete(l.ports, id)
		l.send('q', tnPortFrame(id, nil))
	}
	l.ports[id] = &tnPortEnd{onData: func(data []byte) { r.deliverData(data, l) }, onClose: func() { r.closeFrom(true) }}
	return r
}

// In-process transfers hand over the port itself
var tnLocalPorts = map[float64]*TnMessagePort{}
var tnLocalPortNext float64

func tnTransferListed(list []interface{}, p *TnMessagePort) bool {
	for _, t := range list {
		if t == interface{}(p) {
			return true
		}
	}
	return false
}

// The elements of a transferList argument (an array, or { transfer: [...] })
func tnTransferItems(transfer []interface{}) []interface{} {
	if len(transfer) == 0 || transfer[0] == nil || TnIsNil(transfer[0]) {
		return nil
	}
	v := transfer[0]
	if t := TnGet(v, "transfer"); t != nil && reflect.ValueOf(v).Kind() != reflect.Slice {
		v = t
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && rv.Elem().Kind() == reflect.Slice {
		rv = rv.Elem()
	}
	out := []interface{}{}
	if rv.Kind() == reflect.Slice {
		for i := 0; i < rv.Len(); i++ {
			out = append(out, rv.Index(i).Interface())
		}
	}
	return out
}

func tnEncodeTransfer(value interface{}, transfer []interface{}, link *tnPortLink) []byte {
	list := tnTransferItems(transfer)
	hooks := &tnCloneHooks{transfer: func(v interface{}) (interface{}, bool) {
		p, ok := v.(*TnMessagePort)
		if !ok || !tnTransferListed(list, p) {
			return nil, false
		}
		if p.closed || p.detached {
			panic(TnNodeError("DataCloneError", "", "MessagePort in transfer list is already detached"))
		}
		if link != nil {
			return link.export(p), true
		}
		tnLocalPortNext++
		tnLocalPorts[tnLocalPortNext] = p
		return map[string]interface{}{"$tn": "Port", "local": tnLocalPortNext}, true
	}}
	data, err := json.Marshal(tnCloneEncodeIn(value, hooks))
	if err != nil {
		panic(TnNodeError("DataCloneError", "", err.Error()))
	}
	return data
}

func tnDecodeTransfer(data []byte, link *tnPortLink) interface{} {
	var v interface{}
	json.Unmarshal(data, &v)
	return tnCloneDecodeIn(v, &tnCloneHooks{receive: func(tag map[string]interface{}) interface{} {
		if n, ok := tag["local"].(float64); ok {
			p := tnLocalPorts[n]
			delete(tnLocalPorts, n)
			return p
		}
		id, _ := tag["id"].(float64)
		if link == nil {
			return nil
		}
		return link.receive(id)
	}})
}

type TnMessageEvent struct {
	data      interface{}
	eventType string
}

func (e *TnMessageEvent) Get_type_() string { return e.eventType }

type TnMessageChannel struct {
	port1 *TnMessagePort
	port2 *TnMessagePort
}

func TnNewMessageChannel() *TnMessageChannel {
	a, b := tnNewPort(), tnNewPort()
	a.other, b.other = b, a
	return &TnMessageChannel{port1: a, port2: b}
}

type TnReceivedMessage struct {
	message interface{}
}

// receiveMessageOnPort(port): the next queued message, synchronously (undefined when none)
func TnReceiveMessageOnPort(p *TnMessagePort) *TnReceivedMessage {
	if len(p.queue) == 0 {
		return nil
	}
	msg := p.queue[0]
	p.queue = p.queue[1:]
	return &TnReceivedMessage{message: msg}
}

// BroadcastChannel: every instance with the same name in this process
var tnBroadcast = map[string][]*TnBroadcastChannel{}

type TnBroadcastChannel struct {
	name      string
	port      *TnMessagePort
	listeners []interface{}
}

func TnNewBroadcastChannel(name string) *TnBroadcastChannel {
	ch := &TnBroadcastChannel{name: name, port: tnNewPort()}
	tnBroadcast[name] = append(tnBroadcast[name], ch)
	return ch
}

func (b *TnBroadcastChannel) Get_name() string            { return b.name }
func (b *TnBroadcastChannel) Get_onmessage() interface{}  { return b.port.onmessage }
func (b *TnBroadcastChannel) Set_onmessage(fn interface{}) { b.port.Set_onmessage(fn) }

func (b *TnBroadcastChannel) addEventListener(event string, fn interface{}, options ...interface{}) {
	if event == "message" {
		b.port.on("message", func(msg interface{}) {
			TnInvoke(fn, &TnMessageEvent{data: msg, eventType: "message"})
		})
	}
}

func (b *TnBroadcastChannel) postMessage(value interface{}) {
	data := tnEncodeMessage(value)
	for _, other := range tnBroadcast[b.name] {
		if other != b && !other.port.closed {
			other.port.deliver(tnDecodeMessage(data))
		}
	}
}

func (b *TnBroadcastChannel) close() {
	b.port.close()
	list := tnBroadcast[b.name]
	for i, other := range list {
		if other == b {
			tnBroadcast[b.name] = append(list[:i], list[i+1:]...)
			break
		}
	}
}

func (b *TnBroadcastChannel) ref() *TnBroadcastChannel {
	b.port.ref()
	return b
}

func (b *TnBroadcastChannel) unref() *TnBroadcastChannel {
	b.port.unref()
	return b
}

// --- the worker side: set up before main runs ---
var TnIsMainThread = os.Getenv("TN_WORKER_ADDR") == ""
var TnWorkerData interface{}
var TnParentPort *TnMessagePort
var TnThreadID float64
var tnEnvironmentData = map[string]interface{}{}

func init() {
	if TnIsMainThread {
		return
	}
	conn, err := net.Dial("tcp", os.Getenv("TN_WORKER_ADDR"))
	if err != nil {
		os.Exit(1)
	}
	tnWriteFrame(conn, 't', []byte(os.Getenv("TN_WORKER_TOKEN")))
	kind, payload, err := tnReadFrame(conn)
	if err != nil || kind != 'd' {
		os.Exit(1)
	}
	var setup map[string]interface{}
	json.Unmarshal(payload, &setup)
	TnWorkerData = tnCloneDecode(setup["workerData"])
	if env, ok := tnCloneDecode(setup["environmentData"]).(*TnMap[string, interface{}]); ok {
		for _, k := range env.Keys() {
			tnEnvironmentData[k] = env.Get(k)
		}
	}
	TnThreadID, _ = setup["threadId"].(float64)
	tnApplyResourceLimits(setup["resourceLimits"])
	port := tnNewPort()
	var writeMu sync.Mutex
	link := tnNewPortLink(-1, func(kind byte, data []byte) {
		writeMu.Lock()
		defer writeMu.Unlock()
		tnWriteFrame(conn, kind, data)
	})
	port.link = link
	port.transport = func(data []byte) { link.send('m', data) }
	TnParentPort = port
	go func() {
		for {
			kind, payload, err := tnReadFrame(conn)
			if err != nil {
				TnLoopPost(func() {
					link.closeAll()
					port.close()
				})
				return
			}
			TnLoopPost(func() {
				if kind == 'm' {
					port.deliverData(payload, link)
				} else {
					link.handle(kind, payload)
				}
			})
		}
	}()
}

// resourceLimits: the heap limits are Go's soft memory limit, and a live heap
// past them ends the worker with ERR_WORKER_OUT_OF_MEMORY (reported by the
// parent from a marker line on stderr); stackSizeMb caps goroutine stacks
var TnResourceLimits = TnNewMap[string, float64]()

const tnWorkerOOMMarker = "\\x00tn:worker-out-of-memory"

func tnApplyResourceLimits(raw interface{}) {
	limits, ok := raw.(map[string]interface{})
	if !ok {
		return
	}
	num := func(key string, def float64) float64 {
		if n, ok := limits[key].(float64); ok && n > 0 {
			return n
		}
		return def
	}
	young, old := num("maxYoungGenerationSizeMb", 0), num("maxOldGenerationSizeMb", 0)
	stack := num("stackSizeMb", 4)
	TnResourceLimits.Set("maxYoungGenerationSizeMb", young)
	TnResourceLimits.Set("maxOldGenerationSizeMb", old)
	TnResourceLimits.Set("codeRangeSizeMb", num("codeRangeSizeMb", 0))
	TnResourceLimits.Set("stackSizeMb", stack)
	if _, set := limits["stackSizeMb"].(float64); set {
		tndebug.SetMaxStack(int(stack * 1024 * 1024))
	}
	if young+old <= 0 {
		return
	}
	limit := int64((young + old) * 1024 * 1024)
	tndebug.SetMemoryLimit(limit)
	go func() {
		sample := []metrics.Sample{{Name: "/gc/heap/live:bytes"}}
		for {
			time.Sleep(5 * time.Millisecond)
			metrics.Read(sample)
			if sample[0].Value.Kind() == metrics.KindUint64 && int64(sample[0].Value.Uint64()) > limit {
				fmt.Fprintln(os.Stderr, tnWorkerOOMMarker)
				os.Exit(1)
			}
		}
	}()
}

func TnGetEnvironmentData(key interface{}) interface{} { return tnEnvironmentData[TnJSString(key)] }
func TnSetEnvironmentData(key interface{}, value interface{}) {
	if value == nil {
		delete(tnEnvironmentData, TnJSString(key))
		return
	}
	tnEnvironmentData[TnJSString(key)] = value
}

// --- the parent side ---
var tnNextThreadID float64

type TnWorker struct {
	TnEventEmitter
	threadId float64
	cmd      *exec.Cmd
	conn     net.Conn
	writeMu  sync.Mutex
	link     *tnPortLink
	pending  [][]byte
	refd     bool
	exited   bool
	killed   bool
	exitWait []chan float64
	stdin    *TnStream
	stdout   *TnStream
	stderr   *TnStream
	limits   *TnMap[string, float64]
}

func (w *TnWorker) Get_threadId() float64 { return w.threadId }
func (w *TnWorker) Get_stdin() *TnStream  { return w.stdin }
func (w *TnWorker) Get_stdout() *TnStream { return w.stdout }
func (w *TnWorker) Get_stderr() *TnStream { return w.stderr }

// worker.resourceLimits: the limits given (codeRangeSizeMb -1 when unset, as
// in Node) while the worker runs, {} once it has exited
func (w *TnWorker) Get_resourceLimits() *TnMap[string, float64] {
	if w.exited || w.limits == nil {
		return TnNewMap[string, float64]()
	}
	return w.limits
}

// A frame to the worker (pending until it connects)
func (w *TnWorker) sendFrame(kind byte, data []byte) {
	if w.exited {
		return
	}
	if w.conn == nil {
		w.pending = append(w.pending, append([]byte{kind}, data...))
		return
	}
	w.writeMu.Lock()
	defer w.writeMu.Unlock()
	tnWriteFrame(w.conn, kind, data)
}

// new Worker('./w.ts'): runs the entry point compiled from that file
func TnNewWorkerAt(entry string, filename interface{}, options ...interface{}) *TnWorker {
	tnNextEntry = entry
	defer func() { tnNextEntry = "" }()
	return TnNewWorker(filename, options...)
}

func TnNewWorker(filename interface{}, options ...interface{}) *TnWorker {
	tnPermRequire("worker")
	tnNextThreadID++
	w := &TnWorker{threadId: tnNextThreadID}
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	if opts != nil {
		if b, ok := TnGetValue(opts, "eval").(bool); ok && b {
			panic(TnNodeError("Error", "ERR_WORKER_UNSUPPORTED_OPERATION", "eval workers are not supported by TypeNative"))
		}
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(TnNodeError("Error", "ERR_WORKER_INIT_FAILED", err.Error()))
	}
	tokenBytes := make([]byte, 16)
	cryptorand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)
	exe, err := os.Executable()
	if err != nil {
		exe = os.Args[0]
	}
	args := []string{}
	env := os.Environ()
	var workerData interface{}
	var limits map[string]interface{}
	pipeStdout, pipeStderr, pipeStdin := false, false, false
	if opts != nil {
		pipeStdout, _ = TnGetValue(opts, "stdout").(bool)
		pipeStderr, _ = TnGetValue(opts, "stderr").(bool)
		pipeStdin, _ = TnGetValue(opts, "stdin").(bool)
		if rl := TnGet(opts, "resourceLimits"); rl != nil && !TnIsNil(rl) {
			limits = map[string]interface{}{}
			w.limits = TnNewMap[string, float64]()
			for _, key := range []string{"maxYoungGenerationSizeMb", "maxOldGenerationSizeMb", "codeRangeSizeMb", "stackSizeMb"} {
				n, ok := tnNetNumber(TnGet(rl, key))
				if ok {
					limits[key] = n
				} else if key == "stackSizeMb" {
					n = 4
				} else {
					n = -1
				}
				w.limits.Set(key, n)
			}
		}
		workerData = TnGet(opts, "workerData")
		if argv := TnGet(opts, "argv"); argv != nil {
			rv := reflect.ValueOf(argv)
			if rv.Kind() == reflect.Slice {
				for i := 0; i < rv.Len(); i++ {
					args = append(args, TnJSString(rv.Index(i).Interface()))
				}
			}
		}
		if custom := TnGet(opts, "env"); custom != nil {
			if s, ok := custom.(string); !ok || s != "TnShareEnv" {
				env = tnEnvList(custom)
			}
		}
	}
	env = tnSpawnEntryEnv(env)
	env = append(env, "TN_WORKER_ADDR="+ln.Addr().String(), "TN_WORKER_TOKEN="+token)
	setup, err := json.Marshal(map[string]interface{}{
		"workerData":      tnCloneEncode(workerData),
		"environmentData": tnCloneEncode(tnEnvironmentData),
		"threadId":        w.threadId,
		"resourceLimits":  limits,
	})
	if err != nil {
		panic(TnNodeError("DataCloneError", "", err.Error()))
	}
	cmd := exec.Command(exe, args...)
	cmd.Env = env
	cmd.Stdin = nil
	if !pipeStdout {
		cmd.Stdout = os.Stdout
	}
	// worker.stdout / stderr are readable streams: with stdout: true /
	// stderr: true the output goes only there, else to the parent's own
	w.stdout, w.stderr = TnNewReadable(), TnNewReadable()
	var stdoutPipe io.ReadCloser
	if pipeStdout {
		stdoutPipe, _ = cmd.StdoutPipe()
	}
	if pipeStdin {
		stdinPipe, _ := cmd.StdinPipe()
		w.stdin = TnNewWritable()
		w.stdin.sink = func(chunk interface{}, done func(err interface{})) {
			stdinPipe.Write(tnChunksBytes([]interface{}{chunk}))
			done(nil)
		}
		w.stdin.sinkFinal = func(done func(err interface{})) {
			stdinPipe.Close()
			done(nil)
		}
	}
	stderr, _ := cmd.StderrPipe()
	w.cmd = cmd
	if err := cmd.Start(); err != nil {
		ln.Close()
		e := TnNodeError("Error", "ERR_WORKER_INIT_FAILED", err.Error())
		TnLoopPost(func() { w.emit("error", e) })
		return w
	}
	w.refd = true
	TnLoopRef()
	// stderr passes through; a Go panic (an uncaught exception) becomes 'error'
	var panicMsg string
	outOfMemory := false
	stderrDone := make(chan struct{})
	go func() {
		defer close(stderrDone)
		scanner := bufio.NewScanner(stderr)
		scanner.Buffer(make([]byte, 64*1024), 1024*1024)
		inPanic := false
		for scanner.Scan() {
			line := scanner.Text()
			if line == tnWorkerOOMMarker {
				outOfMemory = true
				continue
			}
			if !inPanic && strings.HasPrefix(line, "panic: ") {
				inPanic = true
				panicMsg = strings.TrimPrefix(line, "panic: ")
				continue
			}
			if !inPanic {
				if pipeStderr {
					chunk := []byte(line + "\\n")
					TnLoopPost(func() { w.stderr.push(chunk) })
				} else {
					fmt.Fprintln(os.Stderr, line)
				}
			}
		}
	}()
	stdoutDone := make(chan struct{})
	if stdoutPipe != nil {
		go func() {
			defer close(stdoutDone)
			buf := make([]byte, 32768)
			for {
				n, err := stdoutPipe.Read(buf)
				if n > 0 {
					chunk := append([]byte{}, buf[:n]...)
					TnLoopPost(func() { w.stdout.push(chunk) })
				}
				if err != nil {
					return
				}
			}
		}()
	} else {
		close(stdoutDone)
	}
	w.link = tnNewPortLink(1, w.sendFrame)
	go func() {
		deadline := time.Now().Add(30 * time.Second)
		ln.(*net.TCPListener).SetDeadline(deadline)
		for {
			conn, err := ln.Accept()
			if err != nil {
				ln.Close()
				return
			}
			kind, payload, err := tnReadFrame(conn)
			if err != nil || kind != 't' || string(payload) != token {
				conn.Close()
				continue
			}
			ln.Close()
			tnWriteFrame(conn, 'd', setup)
			TnLoopPost(func() {
				w.conn = conn
				for _, frame := range w.pending {
					tnWriteFrame(conn, frame[0], frame[1:])
				}
				w.pending = nil
				w.emit("online")
			})
			for {
				kind, payload, err := tnReadFrame(conn)
				if err != nil {
					return
				}
				TnLoopPost(func() {
					if kind == 'm' {
						w.emit("message", tnDecodeTransfer(payload, w.link))
					} else {
						w.link.handle(kind, payload)
					}
				})
			}
		}
	}()
	go func() {
		<-stderrDone
		<-stdoutDone
	err := cmd.Wait()
	code := float64(0)
	if exitErr, ok := err.(*exec.ExitError); ok {
		code = float64(exitErr.ExitCode())
	}
		TnLoopPost(func() {
			w.exited = true
			if w.conn != nil {
				w.conn.Close()
			}
			w.link.closeAll()
			w.stdout.push(nil)
			w.stderr.push(nil)
			if w.killed {
				code = 1
			} else if outOfMemory {
				code = 1
				w.emit("error", TnNodeError("Error", "ERR_WORKER_OUT_OF_MEMORY", "Worker terminated due to reaching memory limit: JS heap out of memory"))
			} else if panicMsg != "" {
				code = 1
				w.emit("error", TnNodeError("Error", "", panicMsg))
			}
			w.emit("exit", code)
			for _, ch := range w.exitWait {
				ch <- code
			}
			if w.refd {
				w.refd = false
				TnLoopUnref()
			}
		})
	}()
	return w
}

func (w *TnWorker) postMessage(value interface{}, transfer ...interface{}) {
	if w.exited {
		return
	}
	w.sendFrame('m', tnEncodeTransfer(value, transfer, w.link))
}

// terminate(): stops the worker; resolves with its exit code
func (w *TnWorker) terminate() chan float64 {
	ch := make(chan float64, 1)
	if w.exited || w.cmd == nil || w.cmd.Process == nil {
		ch <- 0
		return ch
	}
	w.exitWait = append(w.exitWait, ch)
	w.killed = true
	w.cmd.Process.Kill()
	return ch
}

func (w *TnWorker) ref() *TnWorker {
	if !w.refd && !w.exited {
		w.refd = true
		TnLoopRef()
	}
	return w
}

func (w *TnWorker) unref() *TnWorker {
	if w.refd {
		w.refd = false
		TnLoopUnref()
	}
	return w
}`;

const EMITTER =
  'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64';

export function registerWorkerThreads(r: NodeRegistry): void {
  defineModule(r, 'worker_threads');
  defineHelper(r, 'nodeClone', ['encoding/base64', 'encoding/json', 'fmt', 'math/big', 'reflect', 'sort', 'strings', 'time', 'unsafe'], ['dynamic', 'orderedMap', 'error'], cloneHelper);
  defineHelper(
    r,
    'nodeWorker',
    ['bufio', 'crypto/rand', 'encoding/binary', 'encoding/hex', 'encoding/json', 'fmt', 'io', 'math', 'net', 'os', 'os/exec', 'reflect', 'runtime/debug', 'runtime/metrics', 'strings', 'sync', 'time'],
    ['nodeClone', 'nodeIpc', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'nodeChild', 'entryPoints', 'nodeStream', 'netErrors', 'orderedMap'],
    workerHelper
  );
  const use = () => r.helper('nodeWorker');
  defineClass(
    r,
    'worker_threads.Worker',
    '*TnWorker',
    'class',
    `${EMITTER}; postMessage=; terminate=chan float64; ref=*TnWorker; unref=*TnWorker`,
    '',
    'threadId=float64; stdin=*TnStream; stdout=*TnStream; stderr=*TnStream; resourceLimits=*TnMap[string, float64]',
    ''
  );
  defineClass(
    r,
    'worker_threads.MessagePort',
    '*TnMessagePort',
    'class',
    `${EMITTER}; postMessage=; start=; close=; ref=*TnMessagePort; unref=*TnMessagePort; hasRef=bool`,
    '',
    'onmessage=interface{}',
    'onmessage'
  );
  defineClass(r, 'worker_threads.MessageChannel', '*TnMessageChannel', 'class', '', 'port1=*TnMessagePort; port2=*TnMessagePort', '', '');
  defineClass(
    r,
    'worker_threads.BroadcastChannel',
    '*TnBroadcastChannel',
    'class',
    'postMessage=; close=; addEventListener=; ref=*TnBroadcastChannel; unref=*TnBroadcastChannel',
    '',
    'name=string; onmessage=interface{}',
    'onmessage'
  );
  defineClass(r, 'worker_threads.MessageEvent', '*TnMessageEvent', 'class', '', 'data=interface{}', 'type=string', '');
  defineClass(r, 'worker_threads.ReceivedMessage', '*TnReceivedMessage', 'class', '', 'message=interface{}', '', '');
  for (const name of ['MessageChannel', 'MessagePort', 'BroadcastChannel']) {
    r.globals[name] = `worker_threads.${name}`;
  }
  const workerListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'message' || name === 'error' || name === 'messageerror') return ['interface{}'];
    if (name === 'exit') return ['float64'];
    return [];
  };
  r.paramTypers['worker_threads.Worker#on'] = workerListeners;
  r.paramTypers['worker_threads.Worker#once'] = workerListeners;
  r.paramTypers['worker_threads.MessagePort#on'] = workerListeners;
  r.paramTypers['worker_threads.MessagePort#once'] = workerListeners;
  r.paramTypers['worker_threads.BroadcastChannel#addEventListener'] = (_n: any[]) => ['*TnMessageEvent'];

  r.constructors['worker_threads.Worker'] = (c: NodeCall) => {
    use();
    // new Worker('./w.ts'): that file is compiled in as a second entry point
    const entry = r.entryPoint(c.nodes[0]);
    if (entry !== '') return `TnNewWorkerAt(${JSON.stringify(entry)}, ${c.args.join(', ')})`;
    return `TnNewWorker(${c.args.join(', ')})`;
  };
  r.constructors['worker_threads.MessageChannel'] = (_c: NodeCall) => {
    use();
    return 'TnNewMessageChannel()';
  };
  r.constructors['worker_threads.BroadcastChannel'] = (c: NodeCall) => {
    use();
    return `TnNewBroadcastChannel(${c.args[0]})`;
  };
  const value = (name: string, goType: string, expr: string) => {
    r.values[`worker_threads.${name}`] = (_c: NodeCall) => {
      use();
      return expr;
    };
    r.valueTypes[`worker_threads.${name}`] = goType;
  };
  value('isMainThread', 'bool', 'TnIsMainThread');
  value('parentPort', '*TnMessagePort', 'TnParentPort');
  value('workerData', 'interface{}', 'TnWorkerData');
  value('threadId', 'float64', 'TnThreadID');
  value('SHARE_ENV', 'string', '"TnShareEnv"');
  value('resourceLimits', '*TnMap[string, float64]', 'TnResourceLimits');
  r.functions['worker_threads.receiveMessageOnPort'] = (c: NodeCall) => {
    use();
    return `TnReceiveMessageOnPort(${c.args[0]})`;
  };
  r.functions['worker_threads.getEnvironmentData'] = (c: NodeCall) => {
    use();
    return `TnGetEnvironmentData(${c.args[0]})`;
  };
  r.functions['worker_threads.setEnvironmentData'] = (c: NodeCall) => {
    use();
    return `TnSetEnvironmentData(${c.args.join(', ')})`;
  };
  r.functions['worker_threads.markAsUntransferable'] = (_c: NodeCall) => '_ = 0';
  r.functions['worker_threads.isMarkedAsUntransferable'] = (_c: NodeCall) => 'false';
  setResults(r, 'worker_threads', 'receiveMessageOnPort=*TnReceivedMessage; getEnvironmentData=interface{}; isMarkedAsUntransferable=bool');

  // __filename / __dirname: the running program
  r.globals['__filename'] = 'globals.__filename';
  r.globals['__dirname'] = 'globals.__dirname';
  r.values['globals.__filename'] = (_c: NodeCall) => {
    r.helper('nodeProcess');
    return 'TnProcessExecPath()';
  };
  r.valueTypes['globals.__filename'] = 'string';
  r.values['globals.__dirname'] = (_c: NodeCall) => {
    r.helper('nodeProcess');
    r.pkg('path/filepath');
    return 'filepath.Dir(TnProcessExecPath())';
  };
  r.valueTypes['globals.__dirname'] = 'string';
}
