// node:worker_threads — a Worker runs the current program again as a child
// process (its own isolate, as in Node): the child connects back to the
// parent over a loopback TCP connection that carries length-prefixed,
// structured-clone-like messages (JSON plus Buffers, Maps, Sets, Dates,
// BigInts and Errors). In the child, isMainThread is false and parentPort /
// workerData are set. MessageChannel / MessagePort / BroadcastChannel work
// within one process. The worker's stdout / stderr are the parent's; an
// uncaught exception in a worker becomes an 'error' event and exit code 1.
import { defineClass, defineHelper, defineModule, setResults, isStringNode } from './registry.js';
const cloneHelper = `// Structured clone (subset): values to and from JSON with type tags
func tnCloneEncode(v interface{}) interface{} {
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
			props[k] = tnCloneEncode(val)
		}
		return map[string]interface{}{"$tn": "Error", "message": x.message, "code": x.code, "props": props}
	case map[string]interface{}:
		out := map[string]interface{}{}
		for k, val := range x {
			out[k] = tnCloneEncode(val)
		}
		return out
	case []interface{}:
		out := make([]interface{}, len(x))
		for i, val := range x {
			out[i] = tnCloneEncode(val)
		}
		return out
	}
	if withEntries, ok := v.(interface{ Entries() [][]interface{} }); ok {
		if _, isSet := v.(interface{ IsSet() bool }); isSet {
			values := []interface{}{}
			for _, e := range withEntries.Entries() {
				values = append(values, tnCloneEncode(e[0]))
			}
			return map[string]interface{}{"$tn": "Set", "v": values}
		}
		pairs := []interface{}{}
		for _, e := range withEntries.Entries() {
			pairs = append(pairs, []interface{}{tnCloneEncode(e[0]), tnCloneEncode(e[1])})
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
			out[i] = tnCloneEncode(rv.Index(i).Interface())
		}
		return out
	case reflect.Map:
		out := map[string]interface{}{}
		for _, key := range rv.MapKeys() {
			out[fmt.Sprint(key.Interface())] = tnCloneEncode(rv.MapIndex(key).Interface())
		}
		return out
	case reflect.Pointer:
		if rv.IsNil() {
			return nil
		}
		if rv.Elem().Kind() == reflect.Struct {
			sv := rv.Elem()
			out := map[string]interface{}{}
			for i := 0; i < sv.NumField(); i++ {
				f := sv.Field(i)
				if f.Kind() == reflect.Func {
					continue
				}
				value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
				out[strings.TrimSuffix(sv.Type().Field(i).Name, "_")] = tnCloneEncode(value)
			}
			return out
		}
		return tnCloneEncode(rv.Elem().Interface())
	case reflect.Float32, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64, reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return rv.Convert(reflect.TypeOf(float64(0))).Interface()
	}
	return TnJSString(v)
}

func tnCloneDecode(v interface{}) interface{} {
	switch x := v.(type) {
	case []interface{}:
		for i, val := range x {
			x[i] = tnCloneDecode(val)
		}
		return x
	case map[string]interface{}:
		if tag, ok := x["$tn"].(string); ok {
			switch tag {
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
						e.props[k] = tnCloneDecode(val)
					}
				}
				return e
			case "Map":
				m := TnNewMap[interface{}, interface{}]()
				if pairs, ok := x["v"].([]interface{}); ok {
					for _, p := range pairs {
						if pair, ok := p.([]interface{}); ok && len(pair) == 2 {
							m.Set(tnCloneDecode(pair[0]), tnCloneDecode(pair[1]))
						}
					}
				}
				return m
			case "Set":
				m := TnNewMap[interface{}, interface{}]()
				if values, ok := x["v"].([]interface{}); ok {
					for _, val := range values {
						d := tnCloneDecode(val)
						m.Set(d, d)
					}
				}
				return m
			}
		}
		for k, val := range x {
			x[k] = tnCloneDecode(val)
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
	queue     []interface{}
	started   bool
	closed    bool
	refd      bool
	unrefd    bool
	onmessage interface{}
	scheduled bool
}

func tnNewPort() *TnMessagePort { return &TnMessagePort{} }

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
	if p.closed {
		return
	}
	data := tnEncodeMessage(value)
	if p.transport != nil {
		p.transport(data)
		return
	}
	if p.other != nil {
		p.other.deliver(tnDecodeMessage(data))
	}
}

func (p *TnMessagePort) close() {
	if p.closed {
		return
	}
	p.closed = true
	p.unref()
	TnLoopPost(func() { p.emit("close") })
	if other := p.other; other != nil && !other.closed {
		other.close()
	}
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
	if env, ok := tnCloneDecode(setup["environmentData"]).(map[string]interface{}); ok {
		tnEnvironmentData = env
	}
	TnThreadID, _ = setup["threadId"].(float64)
	port := tnNewPort()
	var writeMu sync.Mutex
	port.transport = func(data []byte) {
		writeMu.Lock()
		defer writeMu.Unlock()
		tnWriteFrame(conn, 'm', data)
	}
	TnParentPort = port
	go func() {
		for {
			kind, payload, err := tnReadFrame(conn)
			if err != nil {
				TnLoopPost(func() { port.close() })
				return
			}
			if kind == 'm' {
				msg := tnDecodeMessage(payload)
				TnLoopPost(func() { port.deliver(msg) })
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
	pending  [][]byte
	refd     bool
	exited   bool
	killed   bool
	exitWait []chan float64
}

func (w *TnWorker) Get_threadId() float64 { return w.threadId }

func TnNewWorker(filename interface{}, options ...interface{}) *TnWorker {
	tnNextThreadID++
	w := &TnWorker{threadId: tnNextThreadID}
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	if opts != nil {
		if b, ok := TnGet(opts, "eval").(bool); ok && b {
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
	if opts != nil {
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
	env = append(env, "TN_WORKER_ADDR="+ln.Addr().String(), "TN_WORKER_TOKEN="+token)
	setup, err := json.Marshal(map[string]interface{}{
		"workerData":      tnCloneEncode(workerData),
		"environmentData": tnCloneEncode(tnEnvironmentData),
		"threadId":        w.threadId,
	})
	if err != nil {
		panic(TnNodeError("DataCloneError", "", err.Error()))
	}
	cmd := exec.Command(exe, args...)
	cmd.Env = env
	cmd.Stdin = nil
	cmd.Stdout = os.Stdout
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
	stderrDone := make(chan struct{})
	go func() {
		defer close(stderrDone)
		scanner := bufio.NewScanner(stderr)
		scanner.Buffer(make([]byte, 64*1024), 1024*1024)
		inPanic := false
		for scanner.Scan() {
			line := scanner.Text()
			if !inPanic && strings.HasPrefix(line, "panic: ") {
				inPanic = true
				panicMsg = strings.TrimPrefix(line, "panic: ")
				continue
			}
			if !inPanic {
				fmt.Fprintln(os.Stderr, line)
			}
		}
	}()
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
				for _, data := range w.pending {
					tnWriteFrame(conn, 'm', data)
				}
				w.pending = nil
				w.emit("online")
			})
			for {
				kind, payload, err := tnReadFrame(conn)
				if err != nil {
					return
				}
				if kind == 'm' {
					msg := tnDecodeMessage(payload)
					TnLoopPost(func() { w.emit("message", msg) })
				}
			}
		}
	}()
	go func() {
		<-stderrDone
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
			if w.killed {
				code = 1
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
	data := tnEncodeMessage(value)
	if w.conn == nil {
		w.pending = append(w.pending, data)
		return
	}
	tnWriteFrame(w.conn, 'm', data)
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
const EMITTER = 'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64';
export function registerWorkerThreads(r) {
    defineModule(r, 'worker_threads');
    defineHelper(r, 'nodeClone', ['encoding/base64', 'encoding/json', 'fmt', 'math/big', 'reflect', 'strings', 'time', 'unsafe'], ['dynamic', 'orderedMap', 'error'], cloneHelper);
    defineHelper(r, 'nodeWorker', ['bufio', 'crypto/rand', 'encoding/hex', 'encoding/json', 'fmt', 'net', 'os', 'os/exec', 'reflect', 'strings', 'sync', 'time'], ['nodeClone', 'nodeIpc', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'nodeChild'], workerHelper);
    const use = () => r.helper('nodeWorker');
    defineClass(r, 'worker_threads.Worker', '*TnWorker', 'class', `${EMITTER}; postMessage=; terminate=chan float64; ref=*TnWorker; unref=*TnWorker`, '', 'threadId=float64', '');
    defineClass(r, 'worker_threads.MessagePort', '*TnMessagePort', 'class', `${EMITTER}; postMessage=; start=; close=; ref=*TnMessagePort; unref=*TnMessagePort; hasRef=bool`, '', 'onmessage=interface{}', 'onmessage');
    defineClass(r, 'worker_threads.MessageChannel', '*TnMessageChannel', 'class', '', 'port1=*TnMessagePort; port2=*TnMessagePort', '', '');
    defineClass(r, 'worker_threads.BroadcastChannel', '*TnBroadcastChannel', 'class', 'postMessage=; close=; addEventListener=; ref=*TnBroadcastChannel; unref=*TnBroadcastChannel', '', 'name=string; onmessage=interface{}', 'onmessage');
    defineClass(r, 'worker_threads.MessageEvent', '*TnMessageEvent', 'class', '', 'data=interface{}', 'type=string', '');
    defineClass(r, 'worker_threads.ReceivedMessage', '*TnReceivedMessage', 'class', '', 'message=interface{}', '', '');
    for (const name of ['MessageChannel', 'MessagePort', 'BroadcastChannel']) {
        r.globals[name] = `worker_threads.${name}`;
    }
    const workerListeners = (nodes) => {
        const event = nodes[0];
        const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
        if (name === 'message' || name === 'error' || name === 'messageerror')
            return ['interface{}'];
        if (name === 'exit')
            return ['float64'];
        return [];
    };
    r.paramTypers['worker_threads.Worker#on'] = workerListeners;
    r.paramTypers['worker_threads.Worker#once'] = workerListeners;
    r.paramTypers['worker_threads.MessagePort#on'] = workerListeners;
    r.paramTypers['worker_threads.MessagePort#once'] = workerListeners;
    r.paramTypers['worker_threads.BroadcastChannel#addEventListener'] = (_n) => ['*TnMessageEvent'];
    r.constructors['worker_threads.Worker'] = (c) => {
        use();
        // The worker runs this program again: other files can't be loaded at runtime
        if (isStringNode(c.nodes[0]) && /\.(m?[jt]s|tsx?)$/.test(String(c.nodes[0].text))) {
            console.warn(`[TypeNative] new Worker('${c.nodes[0].text}') runs the current program; use new Worker(__filename) / new URL(import.meta.url) and branch on isMainThread`);
        }
        return `TnNewWorker(${c.args.join(', ')})`;
    };
    r.constructors['worker_threads.MessageChannel'] = (_c) => {
        use();
        return 'TnNewMessageChannel()';
    };
    r.constructors['worker_threads.BroadcastChannel'] = (c) => {
        use();
        return `TnNewBroadcastChannel(${c.args[0]})`;
    };
    const value = (name, goType, expr) => {
        r.values[`worker_threads.${name}`] = (_c) => {
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
    value('resourceLimits', 'map[string]interface{}', 'map[string]interface{}{}');
    r.functions['worker_threads.receiveMessageOnPort'] = (c) => {
        use();
        return `TnReceiveMessageOnPort(${c.args[0]})`;
    };
    r.functions['worker_threads.getEnvironmentData'] = (c) => {
        use();
        return `TnGetEnvironmentData(${c.args[0]})`;
    };
    r.functions['worker_threads.setEnvironmentData'] = (c) => {
        use();
        return `TnSetEnvironmentData(${c.args.join(', ')})`;
    };
    r.functions['worker_threads.markAsUntransferable'] = (_c) => '_ = 0';
    r.functions['worker_threads.isMarkedAsUntransferable'] = (_c) => 'false';
    setResults(r, 'worker_threads', 'receiveMessageOnPort=*TnReceivedMessage; getEnvironmentData=interface{}; isMarkedAsUntransferable=bool');
    // __filename / __dirname: the running program
    r.globals['__filename'] = 'globals.__filename';
    r.globals['__dirname'] = 'globals.__dirname';
    r.values['globals.__filename'] = (_c) => {
        r.helper('nodeProcess');
        return 'TnProcessExecPath()';
    };
    r.valueTypes['globals.__filename'] = 'string';
    r.values['globals.__dirname'] = (_c) => {
        r.helper('nodeProcess');
        r.pkg('path/filepath');
        return 'filepath.Dir(TnProcessExecPath())';
    };
    r.valueTypes['globals.__dirname'] = 'string';
}
