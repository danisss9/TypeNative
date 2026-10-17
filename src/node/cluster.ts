// IPC between a program and the copies of itself it forks, child_process.fork
// and node:cluster. A forked child is this program run again with an IPC link
// back to its parent: a loopback TCP connection (authenticated by a token)
// carrying length-prefixed frames — structured-clone messages ('m') and
// cluster control messages ('c').
//
// Cluster workers share listening ports without passing handles (which is not
// portable): a worker's server.listen() asks the primary, which owns the real
// listener and hands each accepted connection to a worker in turn by dialing
// the worker's private loopback listener, sending the client's address on one
// line, then relaying the bytes. Workers see the real remote address.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const ipcHelper = `// IPC frames: 4-byte big-endian length, 1 kind byte, JSON payload
func tnWriteFrame(w io.Writer, kind byte, payload []byte) error {
	header := make([]byte, 5)
	binary.BigEndian.PutUint32(header, uint32(len(payload)+1))
	header[4] = kind
	if _, err := w.Write(append(header, payload...)); err != nil {
		return err
	}
	return nil
}

func tnReadFrame(r io.Reader) (byte, []byte, error) {
	header := make([]byte, 4)
	if _, err := io.ReadFull(r, header); err != nil {
		return 0, nil, err
	}
	size := binary.BigEndian.Uint32(header)
	body := make([]byte, size)
	if _, err := io.ReadFull(r, body); err != nil {
		return 0, nil, err
	}
	return body[0], body[1:], nil
}

func tnEncodeMessage(v interface{}) []byte {
	data, err := json.Marshal(tnCloneEncode(v))
	if err != nil {
		panic(TnNodeError("DataCloneError", "", err.Error()))
	}
	return data
}

func tnDecodeMessage(data []byte) interface{} {
	var v interface{}
	json.Unmarshal(data, &v)
	return tnCloneDecode(v)
}

// One end of an IPC link. Handlers run on the loop; direct control handlers
// run on the reading goroutine (replies a blocked caller waits for)
type tnIpcLink struct {
	conn          net.Conn
	mu            sync.Mutex
	closed        bool
	onMessage     func(msg interface{})
	onControl     func(ctl map[string]interface{})
	directControl func(ctl map[string]interface{}) bool
	onClose       func()
}

func (l *tnIpcLink) write(kind byte, data []byte) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return false
	}
	return tnWriteFrame(l.conn, kind, data) == nil
}

func (l *tnIpcLink) control(ctl map[string]interface{}) bool {
	data, _ := json.Marshal(ctl)
	return l.write('c', data)
}

func (l *tnIpcLink) close() {
	l.mu.Lock()
	if l.closed {
		l.mu.Unlock()
		return
	}
	l.closed = true
	l.mu.Unlock()
	l.conn.Close()
}

func (l *tnIpcLink) start() {
	go func() {
		for {
			kind, payload, err := tnReadFrame(l.conn)
			if err != nil {
				TnLoopPost(func() {
					if l.onClose != nil {
						l.onClose()
					}
				})
				return
			}
			switch kind {
			case 'm':
				msg := tnDecodeMessage(payload)
				TnLoopPost(func() {
					if l.onMessage != nil {
						l.onMessage(msg)
					}
				})
			case 'c':
				var ctl map[string]interface{}
				json.Unmarshal(payload, &ctl)
				if l.directControl != nil && l.directControl(ctl) {
					continue
				}
				TnLoopPost(func() {
					if l.onControl != nil {
						l.onControl(ctl)
					}
				})
			}
		}
	}()
}

func tnIpcCallback(args []interface{}) interface{} {
	for _, a := range args {
		if a != nil && reflect.ValueOf(a).Kind() == reflect.Func {
			return a
		}
	}
	return nil
}

// --- the parent side: child_process.fork ---

type tnChildIpc struct {
	link      *tnIpcLink
	pending   [][]byte
	connected bool
	onConnect func()
	onControl func(ctl map[string]interface{})
}

func tnCPIpc(cp *TnChildProcess) *tnChildIpc {
	st, _ := cp.ipc.(*tnChildIpc)
	return st
}

func tnIpcClosedError() *TnError {
	return TnNodeError("Error", "ERR_IPC_CHANNEL_CLOSED", "Channel closed")
}

// child.send(message, callback?)
func (cp *TnChildProcess) send(message interface{}, args ...interface{}) bool {
	st := tnCPIpc(cp)
	cb := tnIpcCallback(args)
	if st == nil || !st.connected {
		err := tnIpcClosedError()
		if cb != nil {
			TnLoopPost(func() { TnInvoke(cb, err) })
		} else {
			TnLoopPost(func() { cp.emit("error", err) })
		}
		return false
	}
	data := tnEncodeMessage(message)
	if st.link == nil {
		st.pending = append(st.pending, data)
	} else {
		st.link.write('m', data)
	}
	if cb != nil {
		TnLoopPost(func() { TnInvoke(cb, nil) })
	}
	return true
}

func (cp *TnChildProcess) disconnect() {
	st := tnCPIpc(cp)
	if st == nil || !st.connected {
		return
	}
	st.connected = false
	if st.link != nil {
		st.link.close()
	}
	TnLoopPost(func() { cp.emit("disconnect") })
}

func (cp *TnChildProcess) Get_connected() bool {
	st := tnCPIpc(cp)
	return st != nil && st.connected
}

// Runs this program again with an IPC link; extraEnv adds environment entries
func tnForkWith(argv []string, opts interface{}, extraEnv []string) *TnChildProcess {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(TnNodeError("Error", "ERR_IPC_CHANNEL_CLOSED", err.Error()))
	}
	tokenBytes := make([]byte, 16)
	cryptorand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)
	exe, err := os.Executable()
	if err != nil {
		exe = os.Args[0]
	}
	env := os.Environ()
	if custom := TnGet(opts, "env"); custom != nil && !TnIsNil(custom) {
		env = tnEnvList(custom)
	}
	env = append(env, extraEnv...)
	env = append(env, "TN_IPC_ADDR="+ln.Addr().String(), "TN_IPC_TOKEN="+token)
	envMap := map[string]interface{}{}
	for _, kv := range env {
		if k, v, ok := strings.Cut(kv, "="); ok {
			envMap[k] = v
		}
	}
	stdio := "inherit"
	if silent, _ := TnGet(opts, "silent").(bool); silent {
		stdio = "pipe"
	}
	spawnOpts := map[string]interface{}{"env": envMap, "stdio": stdio}
	if cwd, ok := TnGet(opts, "cwd").(string); ok && cwd != "" {
		spawnOpts["cwd"] = cwd
	}
	cp := TnSpawn(exe, argv, spawnOpts)
	st := &tnChildIpc{connected: true}
	cp.ipc = st
	go func() {
		ln.(*net.TCPListener).SetDeadline(time.Now().Add(30 * time.Second))
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
			link := &tnIpcLink{conn: conn}
			TnLoopPost(func() {
				st.link = link
				if !st.connected {
					link.close()
					return
				}
				for _, data := range st.pending {
					link.write('m', data)
				}
				st.pending = nil
				link.onMessage = func(msg interface{}) { cp.emit("message", msg) }
				link.onControl = func(ctl map[string]interface{}) {
					if st.onControl != nil {
						st.onControl(ctl)
					}
				}
				link.onClose = func() {
					if st.connected {
						st.connected = false
						cp.emit("disconnect")
					}
				}
				link.start()
				if st.onConnect != nil {
					st.onConnect()
				}
			})
			return
		}
	}()
	return cp
}

// fork(modulePath, args?, options?): this program, run again (a native binary
// holds one program; branch on process.send / cluster.isPrimary)
func TnFork(modulePath interface{}, rest ...interface{}) *TnChildProcess {
	argv := []string{}
	var opts interface{}
	for _, a := range rest {
		if a == nil || TnIsNil(a) {
			continue
		}
		rv := reflect.ValueOf(a)
		if rv.Kind() == reflect.Pointer && rv.Elem().Kind() == reflect.Slice {
			rv = rv.Elem()
		}
		if rv.Kind() == reflect.Slice {
			for i := 0; i < rv.Len(); i++ {
				argv = append(argv, TnJSString(rv.Index(i).Interface()))
			}
			continue
		}
		opts = a
	}
	return tnForkWith(argv, opts, nil)
}

// --- the child side: process.send / process.on('message') ---

var tnIpcParent *tnIpcLink
var tnIpcConnected bool
var tnIpcRefd bool

func init() {
	addr := os.Getenv("TN_IPC_ADDR")
	if addr == "" {
		return
	}
	token := os.Getenv("TN_IPC_TOKEN")
	os.Unsetenv("TN_IPC_ADDR")
	os.Unsetenv("TN_IPC_TOKEN")
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return
	}
	if tnWriteFrame(conn, 't', []byte(token)) != nil {
		conn.Close()
		return
	}
	link := &tnIpcLink{conn: conn}
	tnIpcParent = link
	tnIpcConnected = true
	link.onMessage = func(msg interface{}) { tnProcessEmitter.emit("message", msg) }
	link.onClose = func() {
		if tnIpcConnected {
			tnIpcConnected = false
			tnIpcUnref()
			tnProcessEmitter.emit("disconnect")
		}
	}
	link.start()
	// A 'message' listener keeps the child alive while the channel is open
	tnProcessMessageHook = tnIpcRef
}

func tnIpcRef() {
	if tnIpcConnected && !tnIpcRefd {
		tnIpcRefd = true
		TnLoopRef()
	}
}

func tnIpcUnref() {
	if tnIpcRefd {
		tnIpcRefd = false
		TnLoopUnref()
	}
}

// process.send(message, callback?)
func TnProcessSend(message interface{}, args ...interface{}) bool {
	cb := tnIpcCallback(args)
	if !tnIpcConnected {
		err := tnIpcClosedError()
		if cb != nil {
			TnLoopPost(func() { TnInvoke(cb, err) })
			return false
		}
		panic(err)
	}
	ok := tnIpcParent.write('m', tnEncodeMessage(message))
	if cb != nil {
		TnLoopPost(func() { TnInvoke(cb, nil) })
	}
	return ok
}

func TnProcessDisconnect() {
	if !tnIpcConnected {
		return
	}
	tnIpcConnected = false
	tnIpcUnref()
	tnIpcParent.close()
	TnLoopPost(func() { tnProcessEmitter.emit("disconnect") })
}

func TnProcessConnected() bool { return tnIpcConnected }`;

const clusterHelper = `// node:cluster
type TnClusterAddress struct {
	address     string
	port        float64
	addressType float64
}

func tnClusterAddress(a net.Addr) *TnClusterAddress {
	info := &TnClusterAddress{addressType: 4}
	if tcp, ok := a.(*net.TCPAddr); ok {
		info.address = tcp.IP.String()
		info.port = float64(tcp.Port)
		if tcp.IP.To4() == nil {
			info.addressType = 6
		}
	}
	return info
}

type TnClusterWorker struct {
	TnEventEmitter
	id                    float64
	process               *TnChildProcess
	state                 string
	exitedAfterDisconnect bool
}

func (w *TnClusterWorker) Get_id() float64                 { return w.id }
func (w *TnClusterWorker) Get_process() *TnChildProcess    { return w.process }
func (w *TnClusterWorker) Get_exitedAfterDisconnect() bool { return w.exitedAfterDisconnect }

func (w *TnClusterWorker) send(message interface{}, args ...interface{}) bool {
	if w.process == nil {
		return TnProcessSend(message, args...)
	}
	return w.process.send(message, args...)
}

func (w *TnClusterWorker) isConnected() bool {
	if w.process == nil {
		return tnIpcConnected
	}
	return w.process.Get_connected()
}

func (w *TnClusterWorker) isDead() bool {
	if w.process == nil {
		return false
	}
	return w.state == "dead"
}

// disconnect(): the worker closes its servers, then its IPC channel (it exits
// once nothing else keeps it alive)
func (w *TnClusterWorker) disconnect() *TnClusterWorker {
	if w.process == nil {
		tnClusterWorkerDisconnect()
		return w
	}
	w.exitedAfterDisconnect = true
	if st := tnCPIpc(w.process); st != nil && st.link != nil {
		st.link.control(map[string]interface{}{"act": "disconnect"})
	}
	return w
}

func (w *TnClusterWorker) kill(signal ...interface{}) {
	if w.process == nil {
		os.Exit(0)
	}
	w.exitedAfterDisconnect = true
	w.process.kill(signal...)
}

func (w *TnClusterWorker) destroy(signal ...interface{}) { w.kill(signal...) }

type TnCluster struct {
	TnEventEmitter
	isPrimary bool
	workers   *TnMap[string, *TnClusterWorker]
	worker    *TnClusterWorker
	settings  map[string]interface{}
	nextID    float64
	args      []string
	silent    bool
}

var tnCluster = tnNewCluster()

func tnNewCluster() *TnCluster {
	id := os.Getenv("NODE_UNIQUE_ID")
	c := &TnCluster{isPrimary: id == "", workers: TnNewMap[string, *TnClusterWorker](), settings: map[string]interface{}{}}
	if !c.isPrimary {
		n, _ := strconv.ParseFloat(id, 64)
		c.worker = &TnClusterWorker{id: n, state: "online"}
		tnListenHook = tnClusterListen
	}
	return c
}

func (c *TnCluster) Get_workers() *TnMap[string, *TnClusterWorker] {
	if !c.isPrimary {
		return nil
	}
	return c.workers
}

// setupPrimary({ args, silent, exec, execArgv })
func (c *TnCluster) setupPrimary(settings ...interface{}) {
	if len(settings) == 0 || settings[0] == nil {
		return
	}
	s := settings[0]
	if args := TnGet(s, "args"); args != nil {
		rv := reflect.ValueOf(args)
		if rv.Kind() == reflect.Pointer {
			rv = rv.Elem()
		}
		if rv.Kind() == reflect.Slice {
			c.args = nil
			for i := 0; i < rv.Len(); i++ {
				c.args = append(c.args, TnJSString(rv.Index(i).Interface()))
			}
		}
	}
	if b, ok := TnGet(s, "silent").(bool); ok {
		c.silent = b
	}
	for _, key := range []string{"args", "silent", "exec", "execArgv", "cwd"} {
		if v := TnGet(s, key); v != nil {
			c.settings[key] = v
		}
	}
}

// fork(env?): a worker running this program
func (c *TnCluster) fork(env ...interface{}) *TnClusterWorker {
	if !c.isPrimary {
		panic(TnNodeError("Error", "ERR_CLUSTER_FORK_IN_WORKER", "cluster.fork() can only be called from the primary"))
	}
	c.nextID++
	id := c.nextID
	key := strconv.FormatFloat(id, 'f', -1, 64)
	w := &TnClusterWorker{id: id, state: "none"}
	extra := []string{"NODE_UNIQUE_ID=" + key}
	if len(env) > 0 && env[0] != nil {
		extra = append(extra, tnEnvList(env[0])...)
	}
	opts := map[string]interface{}{"silent": c.silent}
	if cwd, ok := c.settings["cwd"].(string); ok {
		opts["cwd"] = cwd
	}
	cp := tnForkWith(c.args, opts, extra)
	w.process = cp
	c.workers.Set(key, w)
	st := tnCPIpc(cp)
	st.onConnect = func() {
		w.state = "online"
		w.emit("online")
		c.emit("online", w)
	}
	st.onControl = func(ctl map[string]interface{}) { c.control(w, st.link, ctl) }
	cp.TnEventEmitter.on("message", func(msg interface{}) {
		w.emit("message", msg)
		c.emit("message", w, msg)
	})
	cp.TnEventEmitter.on("disconnect", func() {
		if w.state != "dead" {
			w.state = "disconnected"
		}
		tnClusterDropWorker(w)
		w.emit("disconnect")
		c.emit("disconnect", w)
	})
	cp.TnEventEmitter.on("exit", func(code interface{}, signal interface{}) {
		w.state = "dead"
		c.workers.Delete(key)
		tnClusterDropWorker(w)
		w.emit("exit", code, signal)
		c.emit("exit", w, code, signal)
	})
	cp.TnEventEmitter.on("error", func(err interface{}) { w.emit("error", err) })
	TnLoopPost(func() { c.emit("fork", w) })
	return w
}

// disconnect(callback?): every worker
func (c *TnCluster) disconnect(cb ...interface{}) {
	remaining := 0
	done := func() {
		if len(cb) > 0 && cb[0] != nil {
			TnInvoke(cb[0])
		}
	}
	for _, w := range c.workers.Values() {
		if !w.isConnected() {
			continue
		}
		remaining++
		w.TnEventEmitter.once("disconnect", func() {
			remaining--
			if remaining == 0 {
				done()
			}
		})
		w.disconnect()
	}
	if remaining == 0 {
		TnLoopPost(done)
	}
}

// --- shared listeners (primary) ---

type tnClusterHandler struct {
	worker  *TnClusterWorker
	private string
}

type tnSharedServer struct {
	key      string
	ln       net.Listener
	mu       sync.Mutex
	handlers []tnClusterHandler
	next     int
}

var tnSharedServers = map[string]*tnSharedServer{}

func (s *tnSharedServer) pick() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.handlers) == 0 {
		return ""
	}
	h := s.handlers[s.next%len(s.handlers)]
	s.next++
	return h.private
}

func (s *tnSharedServer) remove(match func(h tnClusterHandler) bool) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	kept := []tnClusterHandler{}
	for _, h := range s.handlers {
		if !match(h) {
			kept = append(kept, h)
		}
	}
	s.handlers = kept
	return len(kept)
}

// Relays one client connection to a worker's private listener
func tnClusterRelay(client net.Conn, target string) {
	back, err := net.Dial("tcp", target)
	if err != nil {
		client.Close()
		return
	}
	if _, err := io.WriteString(back, client.RemoteAddr().String()+"\\n"); err != nil {
		client.Close()
		back.Close()
		return
	}
	var wg sync.WaitGroup
	pipe := func(dst net.Conn, src net.Conn) {
		defer wg.Done()
		io.Copy(dst, src)
		if cw, ok := dst.(interface{ CloseWrite() error }); ok {
			cw.CloseWrite()
		} else {
			dst.Close()
		}
	}
	wg.Add(2)
	go pipe(back, client)
	go pipe(client, back)
	wg.Wait()
	client.Close()
	back.Close()
}

func (s *tnSharedServer) acceptLoop() {
	for {
		conn, err := s.ln.Accept()
		if err != nil {
			return
		}
		target := s.pick()
		if target == "" {
			conn.Close()
			continue
		}
		go tnClusterRelay(conn, target)
	}
}

func tnClusterDropWorker(w *TnClusterWorker) {
	for key, s := range tnSharedServers {
		if s.remove(func(h tnClusterHandler) bool { return h.worker == w }) == 0 {
			s.ln.Close()
			delete(tnSharedServers, key)
		}
	}
}

func tnCtlString(ctl map[string]interface{}, key string) string {
	s, _ := ctl[key].(string)
	return s
}

func tnClusterErrno(err error) string {
	code := ""
	var errno syscall.Errno
	if errors.As(err, &errno) {
		switch errno {
		case syscall.EADDRINUSE:
			code = "EADDRINUSE"
		case syscall.EACCES:
			code = "EACCES"
		case syscall.EADDRNOTAVAIL:
			code = "EADDRNOTAVAIL"
		}
	}
	return code
}

func (c *TnCluster) control(w *TnClusterWorker, link *tnIpcLink, ctl map[string]interface{}) {
	switch tnCtlString(ctl, "act") {
	case "listen":
		network, address, private := tnCtlString(ctl, "network"), tnCtlString(ctl, "address"), tnCtlString(ctl, "private")
		reply := map[string]interface{}{"act": "listenResult", "seq": ctl["seq"]}
		key := network + "|" + address
		srv := tnSharedServers[key]
		if srv == nil {
			ln, err := net.Listen(network, address)
			if err != nil {
				reply["error"] = err.Error()
				reply["code"] = tnClusterErrno(err)
				link.control(reply)
				return
			}
			srv = &tnSharedServer{key: key, ln: ln}
			tnSharedServers[key] = srv
			go srv.acceptLoop()
		}
		srv.mu.Lock()
		srv.handlers = append(srv.handlers, tnClusterHandler{worker: w, private: private})
		srv.mu.Unlock()
		reply["address"] = srv.ln.Addr().String()
		link.control(reply)
	case "listening":
		w.state = "listening"
		addr, _ := net.ResolveTCPAddr("tcp", tnCtlString(ctl, "address"))
		info := tnClusterAddress(addr)
		w.emit("listening", info)
		c.emit("listening", w, info)
	case "close":
		key, private := tnCtlString(ctl, "key"), tnCtlString(ctl, "private")
		if srv := tnSharedServers[key]; srv != nil {
			if srv.remove(func(h tnClusterHandler) bool { return h.private == private }) == 0 {
				srv.ln.Close()
				delete(tnSharedServers, key)
			}
		}
	}
}

// --- worker side: servers listen through the primary ---

type tnClusterListener struct {
	private   net.Listener
	addr      net.Addr
	key       string
	closeOnce sync.Once
}

type tnClusterConn struct {
	net.Conn
	r      *bufio.Reader
	remote net.Addr
	local  net.Addr
}

func (c *tnClusterConn) Read(p []byte) (int, error) { return c.r.Read(p) }
func (c *tnClusterConn) RemoteAddr() net.Addr      { return c.remote }
func (c *tnClusterConn) LocalAddr() net.Addr       { return c.local }
func (c *tnClusterConn) CloseWrite() error {
	if cw, ok := c.Conn.(interface{ CloseWrite() error }); ok {
		return cw.CloseWrite()
	}
	return nil
}

func (l *tnClusterListener) Accept() (net.Conn, error) {
	for {
		conn, err := l.private.Accept()
		if err != nil {
			return nil, err
		}
		r := bufio.NewReader(conn)
		line, err := r.ReadString('\\n')
		if err != nil {
			conn.Close()
			continue
		}
		remote, _ := net.ResolveTCPAddr("tcp", strings.TrimSpace(line))
		return &tnClusterConn{Conn: conn, r: r, remote: remote, local: l.addr}, nil
	}
}

func (l *tnClusterListener) Close() error {
	l.closeOnce.Do(func() {
		if tnIpcConnected {
			tnIpcParent.control(map[string]interface{}{"act": "close", "key": l.key, "private": l.private.Addr().String()})
		}
	})
	return l.private.Close()
}

func (l *tnClusterListener) Addr() net.Addr { return l.addr }

var tnClusterSeq float64
var tnClusterPending = map[float64]chan map[string]interface{}{}
var tnClusterPendingMu sync.Mutex
var tnClusterServers []*TnNetServer

func tnClusterControlHandlers() {
	if tnIpcParent.directControl != nil {
		return
	}
	tnIpcParent.directControl = func(ctl map[string]interface{}) bool {
		if tnCtlString(ctl, "act") != "listenResult" {
			return false
		}
		seq, _ := ctl["seq"].(float64)
		tnClusterPendingMu.Lock()
		ch := tnClusterPending[seq]
		delete(tnClusterPending, seq)
		tnClusterPendingMu.Unlock()
		if ch != nil {
			ch <- ctl
		}
		return true
	}
	tnIpcParent.onControl = func(ctl map[string]interface{}) {
		if tnCtlString(ctl, "act") == "disconnect" {
			tnClusterWorkerDisconnect()
		}
	}
}

// The worker's servers close, then its channel
func tnClusterWorkerDisconnect() {
	servers := tnClusterServers
	tnClusterServers = nil
	remaining := 0
	for _, srv := range servers {
		if srv.listening {
			remaining++
			srv.TnEventEmitter.once("close", func() {
				remaining--
				if remaining == 0 {
					TnProcessDisconnect()
				}
			})
			srv.close()
		}
	}
	if remaining == 0 {
		TnProcessDisconnect()
	}
}

func tnClusterListen(srv *TnNetServer, network string, address string) (net.Listener, error) {
	if tnIpcParent == nil || !tnIpcConnected {
		return net.Listen(network, address)
	}
	tnClusterControlHandlers()
	private, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	tnClusterPendingMu.Lock()
	tnClusterSeq++
	seq := tnClusterSeq
	ch := make(chan map[string]interface{}, 1)
	tnClusterPending[seq] = ch
	tnClusterPendingMu.Unlock()
	tnIpcParent.control(map[string]interface{}{"act": "listen", "seq": seq, "network": network, "address": address, "private": private.Addr().String()})
	var reply map[string]interface{}
	select {
	case reply = <-ch:
	case <-time.After(10 * time.Second):
		private.Close()
		return nil, &net.OpError{Op: "listen", Net: network, Err: os.ErrDeadlineExceeded}
	}
	if msg := tnCtlString(reply, "error"); msg != "" {
		private.Close()
		var errno error = errors.New(msg)
		switch tnCtlString(reply, "code") {
		case "EADDRINUSE":
			errno = syscall.EADDRINUSE
		case "EACCES":
			errno = syscall.EACCES
		case "EADDRNOTAVAIL":
			errno = syscall.EADDRNOTAVAIL
		}
		return nil, &net.OpError{Op: "listen", Net: network, Err: &os.SyscallError{Syscall: "listen", Err: errno}}
	}
	shared, _ := net.ResolveTCPAddr("tcp", tnCtlString(reply, "address"))
	tnClusterServers = append(tnClusterServers, srv)
	tnIpcParent.control(map[string]interface{}{"act": "listening", "address": shared.String()})
	return &tnClusterListener{private: private, addr: shared, key: network + "|" + address}, nil
}`;

const CLUSTER_EMITTER =
  'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64';

export function registerCluster(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeIpc',
    ['crypto/rand', 'encoding/binary', 'encoding/hex', 'encoding/json', 'io', 'net', 'os', 'reflect', 'strings', 'sync', 'time'],
    ['nodeClone', 'nodeChild', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic'],
    ipcHelper
  );
  const useIpc = () => r.helper('nodeIpc');

  // child_process.fork and the child's process.send / connected / disconnect
  r.functions['child_process.fork'] = (c: NodeCall) => {
    useIpc();
    return `TnFork(${c.args.join(', ')})`;
  };
  r.results['child_process.fork'] = '*TnChildProcess';
  const cp = r.classes['child_process.ChildProcess'];
  cp.methods['send'] = 'bool';
  cp.methods['disconnect'] = '';
  cp.getters['connected'] = 'bool';
  r.methods['child_process.ChildProcess#send'] = (c: NodeCall) => {
    useIpc();
    return `${c.recv}.send(${c.args.join(', ')})`;
  };
  r.methods['child_process.ChildProcess#disconnect'] = (c: NodeCall) => {
    useIpc();
    return `${c.recv}.disconnect()`;
  };
  r.functions['process.send'] = (c: NodeCall) => {
    useIpc();
    return `TnProcessSend(${c.args.join(', ')})`;
  };
  r.results['process.send'] = 'bool';
  r.functions['process.disconnect'] = (_c: NodeCall) => {
    useIpc();
    return 'TnProcessDisconnect()';
  };
  r.values['process.connected'] = (_c: NodeCall) => {
    useIpc();
    return 'TnProcessConnected()';
  };
  r.valueTypes['process.connected'] = 'bool';

  // node:cluster
  defineModule(r, 'cluster');
  r.namespaces['cluster.default'] = 'cluster';
  defineHelper(
    r,
    'nodeCluster',
    ['bufio', 'errors', 'io', 'net', 'os', 'reflect', 'strconv', 'strings', 'sync', 'syscall', 'time'],
    ['nodeIpc', 'nodeNet', 'orderedMap'],
    clusterHelper
  );
  const use = () => r.helper('nodeCluster');
  defineClass(
    r,
    'cluster.Worker',
    '*TnClusterWorker',
    'class',
    `${CLUSTER_EMITTER}; send=bool; kill=; destroy=; disconnect=*TnClusterWorker; isDead=bool; isConnected=bool`,
    '',
    'id=float64; process=*TnChildProcess; exitedAfterDisconnect=bool',
    ''
  );
  defineClass(r, 'cluster.Address', '*TnClusterAddress', 'class', '', 'address=string; port=float64; addressType=float64', '', '');
  const value = (name: string, goType: string, expr: string) => {
    r.values[`cluster.${name}`] = (_c: NodeCall) => {
      use();
      return expr;
    };
    r.valueTypes[`cluster.${name}`] = goType;
  };
  value('isPrimary', 'bool', 'tnCluster.isPrimary');
  value('isMaster', 'bool', 'tnCluster.isPrimary');
  value('isWorker', 'bool', '!tnCluster.isPrimary');
  value('workers', '*TnMap[string, *TnClusterWorker]', 'tnCluster.Get_workers()');
  value('worker', '*TnClusterWorker', 'tnCluster.worker');
  value('settings', 'map[string]interface{}', 'tnCluster.settings');
  value('SCHED_NONE', 'float64', 'float64(1)');
  value('SCHED_RR', 'float64', 'float64(2)');
  value('schedulingPolicy', 'float64', 'float64(2)');
  const method = (name: string, goName: string, result: string) => {
    r.functions[`cluster.${name}`] = (c: NodeCall) => {
      use();
      return `tnCluster.${goName}(${c.args.join(', ')})`;
    };
    if (result) r.results[`cluster.${name}`] = result;
  };
  method('fork', 'fork', '*TnClusterWorker');
  method('setupPrimary', 'setupPrimary', '');
  method('setupMaster', 'setupPrimary', '');
  method('disconnect', 'disconnect', '');
  for (const name of ['on', 'once', 'addListener', 'off', 'removeListener', 'removeAllListeners', 'prependListener']) {
    method(name, name, '*TnEventEmitter');
  }
  method('emit', 'emit', 'bool');
  method('listenerCount', 'listenerCount', 'float64');
  setResults(r, 'cluster', '');
  const clusterListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'listening') return ['*TnClusterWorker', '*TnClusterAddress'];
    if (name === 'message') return ['*TnClusterWorker', 'interface{}'];
    if (name === 'exit') return ['*TnClusterWorker', 'interface{}', 'interface{}'];
    return ['*TnClusterWorker'];
  };
  r.paramTypers['cluster.on'] = clusterListeners;
  r.paramTypers['cluster.once'] = clusterListeners;
  const workerListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'listening') return ['*TnClusterAddress'];
    if (name === 'message' || name === 'error') return ['interface{}'];
    if (name === 'exit') return ['interface{}', 'interface{}'];
    return [];
  };
  r.paramTypers['cluster.Worker#on'] = workerListeners;
  r.paramTypers['cluster.Worker#once'] = workerListeners;
}
