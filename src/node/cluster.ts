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

// --- handle passing (send(msg, socket)) ---
// A transferred net.Socket travels as a descriptor inside an 'h' frame: the
// sender keeps the real connection and relays its bytes over tunnel frames —
// 'w' carries data read off the real connection to the receiving side, 'd'
// carries its writes back, 'x' is a half-close either way, 'z' a destroy. Ids
// count up in the parent and down in a child, so they never collide.

func tnHandleFrame(id float64, data []byte) []byte {
	b := make([]byte, 8, 8+len(data))
	binary.BigEndian.PutUint64(b, math.Float64bits(id))
	return append(b, data...)
}

// The receiving side's end of a transferred socket: a net.Conn whose reads
// drain 'w' frames and whose writes leave as 'd' frames
type tnHandleConn struct {
	link  *tnIpcLink
	id    float64
	mu    sync.Mutex
	inbox [][]byte
	wake  chan struct{}
	eof   bool
	done  bool
	wend  bool
	raddr *net.TCPAddr
	laddr *net.TCPAddr
}

func tnHandleConnAddr(desc map[string]interface{}, host string, port string) *net.TCPAddr {
	h, _ := desc[host].(string)
	p, _ := desc[port].(float64)
	return &net.TCPAddr{IP: net.ParseIP(h), Port: int(p)}
}

func tnNewHandleConn(l *tnIpcLink, id float64, desc map[string]interface{}) *tnHandleConn {
	return &tnHandleConn{
		link: l, id: id, wake: make(chan struct{}, 1),
		raddr: tnHandleConnAddr(desc, "ra", "rp"),
		laddr: tnHandleConnAddr(desc, "la", "lp"),
	}
}

// A tunnel frame for a socket this side owns
func (c *tnHandleConn) tnFrame(kind byte, data []byte) {
	c.mu.Lock()
	switch kind {
	case 'w':
		if !c.eof && !c.done {
			c.inbox = append(c.inbox, data)
		}
	case 'x':
		c.eof = true
	case 'z':
		c.done = true
		c.eof = true
		c.inbox = nil
	}
	c.mu.Unlock()
	select {
	case c.wake <- struct{}{}:
	default:
	}
}

func (c *tnHandleConn) Read(b []byte) (int, error) {
	for {
		c.mu.Lock()
		if len(c.inbox) > 0 {
			data := c.inbox[0]
			n := copy(b, data)
			if n < len(data) {
				c.inbox[0] = data[n:]
			} else {
				c.inbox = c.inbox[1:]
			}
			c.mu.Unlock()
			return n, nil
		}
		eof, done := c.eof, c.done
		c.mu.Unlock()
		if done || eof {
			return 0, io.EOF
		}
		<-c.wake
	}
}

func (c *tnHandleConn) Write(b []byte) (int, error) {
	c.mu.Lock()
	dead := c.done || c.wend
	c.mu.Unlock()
	if dead {
		return 0, net.ErrClosed
	}
	if !c.link.write('d', tnHandleFrame(c.id, b)) {
		return 0, net.ErrClosed
	}
	return len(b), nil
}

func (c *tnHandleConn) Close() error {
	c.mu.Lock()
	was := c.done
	c.done = true
	c.eof = true
	c.mu.Unlock()
	if !was {
		c.link.write('z', tnHandleFrame(c.id, nil))
	}
	select {
	case c.wake <- struct{}{}:
	default:
	}
	return nil
}

func (c *tnHandleConn) CloseWrite() error {
	c.mu.Lock()
	c.wend = true
	c.mu.Unlock()
	c.link.write('x', tnHandleFrame(c.id, nil))
	return nil
}

func (c *tnHandleConn) LocalAddr() net.Addr  { return c.laddr }
func (c *tnHandleConn) RemoteAddr() net.Addr { return c.raddr }
func (c *tnHandleConn) SetDeadline(t time.Time) error {
	return nil
}
func (c *tnHandleConn) SetReadDeadline(t time.Time) error   { return nil }
func (c *tnHandleConn) SetWriteDeadline(t time.Time) error  { return nil }

// The sender's record of a socket it transferred
type tnRelayEnd struct {
	conn   net.Conn
	socket *TnSocket
}

// A queued frame: an 'm' / 'h' message or a tunnel frame for a socket
type tnTunnelFrame struct {
	kind byte
	data []byte
}

// One end of an IPC link. Handlers run on the loop; direct control handlers
// run on the reading goroutine (replies a blocked caller waits for)
type tnIpcLink struct {
	conn          net.Conn
	mu            sync.Mutex
	closed        bool
	onMessage     func(msg interface{}, handle interface{})
	onControl     func(ctl map[string]interface{})
	directControl func(ctl map[string]interface{}) bool
	onClose       func()
	done          chan struct{}
	hnext         float64
	hstep         float64
	hmu           sync.Mutex
	handles       map[float64]*tnHandleConn
	relays        map[float64]*tnRelayEnd
	pendingH      map[float64][]tnTunnelFrame
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
				if l.done != nil {
					close(l.done)
				}
				return
			}
			switch kind {
			case 'm':
				msg := tnDecodeMessage(payload)
				TnLoopPost(func() {
					if l.onMessage != nil {
						l.onMessage(msg, nil)
					}
				})
			case 'h':
				var wrap map[string]json.RawMessage
				json.Unmarshal(payload, &wrap)
				msg := tnDecodeMessage(wrap["msg"])
				var desc map[string]interface{}
				json.Unmarshal(wrap["handle"], &desc)
				TnLoopPost(func() {
					var handle interface{}
					if len(desc) > 0 {
						handle = l.resolveHandle(desc)
					}
					if l.onMessage != nil {
						l.onMessage(msg, handle)
					}
				})
			case 'w', 'd', 'x', 'z':
				l.handleTunnel(kind, payload)
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

// The handle argument of send(message, handle?, ..., callback?): the first
// net.Socket among the extra arguments
func tnIpcHandle(args []interface{}) *TnSocket {
	for _, a := range args {
		if s, ok := a.(*TnSocket); ok {
			return s
		}
	}
	return nil
}

// Transfers a connected socket over this link: the socket's connection is
// relayed from now on; the descriptor travels in the message
func (l *tnIpcLink) exportSocket(s *TnSocket) map[string]interface{} {
	if s.relay != nil {
		panic(TnNodeError("DataCloneError", "", "This socket has already been sent"))
	}
	if s.conn == nil {
		panic(TnNodeError("DataCloneError", "", "The socket must be connected to send it"))
	}
	l.hmu.Lock()
	l.hnext += l.hstep
	id := l.hnext
	l.relays[id] = &tnRelayEnd{conn: s.conn, socket: s}
	l.hmu.Unlock()
	s.relay = &tnSocketRelay{id: id, send: func(kind byte, data []byte) bool {
		return l.write(kind, tnHandleFrame(id, data))
	}}
	// the sender's copy is no longer used: like Node after send(handle), it
	// does not keep the process alive
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	return map[string]interface{}{
		"$tn": "Handle", "kind": "socket", "id": id,
		"ra": s.remoteAddress, "rp": s.remotePort,
		"la": s.localAddress, "lp": s.localPort,
	}
}

// A socket arriving: its end lives here from now on, fed by tunnel frames
func (l *tnIpcLink) resolveHandle(desc map[string]interface{}) *TnSocket {
	id, _ := desc["id"].(float64)
	c := tnNewHandleConn(l, id, desc)
	l.hmu.Lock()
	pend := l.pendingH[id]
	delete(l.pendingH, id)
	l.handles[id] = c
	l.hmu.Unlock()
	for _, f := range pend {
		c.tnFrame(f.kind, f.data)
	}
	s := TnNewSocket()
	s.attach(c)
	return s
}

// A tunnel frame ('w'/'d'/'x'/'z') for a transferred socket: to the end this
// side owns, to the connection this side relays, or in flight (the message
// carrying the descriptor is still on the loop)
func (l *tnIpcLink) handleTunnel(kind byte, payload []byte) {
	if len(payload) < 8 {
		return
	}
	id := math.Float64frombits(binary.BigEndian.Uint64(payload))
	data := payload[8:]
	l.hmu.Lock()
	if c := l.handles[id]; c != nil {
		l.hmu.Unlock()
		c.tnFrame(kind, data)
		return
	}
	if r := l.relays[id]; r != nil {
		l.hmu.Unlock()
		l.relayFrame(r, kind, data)
		return
	}
	l.pendingH[id] = append(l.pendingH[id], tnTunnelFrame{kind: kind, data: data})
	l.hmu.Unlock()
}

func (l *tnIpcLink) relayFrame(r *tnRelayEnd, kind byte, data []byte) {
	switch kind {
	case 'd':
		r.conn.Write(data)
	case 'x':
		if cw, ok := r.conn.(interface{ CloseWrite() error }); ok {
			cw.CloseWrite()
		}
	case 'z':
		r.conn.Close()
	}
}

// Registers a relay before the link exists (a send on a not-yet-connected
// child); merged into the link when it connects
func (l *tnIpcLink) adoptRelays(relays map[float64]*tnRelayEnd, pendingH map[float64][]tnTunnelFrame, hnext float64) {
	l.hmu.Lock()
	for id, r := range relays {
		l.relays[id] = r
	}
	for id, frames := range pendingH {
		l.pendingH[id] = append(l.pendingH[id], frames...)
	}
	if l.hnext == 0 && hnext != 0 {
		l.hnext = hnext
	}
	l.hmu.Unlock()
}

// --- the parent side: child_process.fork ---

type tnChildIpc struct {
	link          *tnIpcLink
	pending       []tnTunnelFrame
	pendingRelays map[float64]*tnRelayEnd
	hnext         float64
	connected     bool
	onConnect     func()
	onControl     func(ctl map[string]interface{})
	drained       chan struct{}
}

// Holds the child's 'exit' until everything it sent (and the channel's close)
// is delivered, so 'message' and 'disconnect' come first as in Node
func (st *tnChildIpc) waitDrained() {
	select {
	case <-st.drained:
	case <-time.After(time.Second):
	}
}

func tnCPIpc(cp *TnChildProcess) *tnChildIpc {
	st, _ := cp.ipc.(*tnChildIpc)
	return st
}

func tnIpcClosedError() *TnError {
	return TnNodeError("Error", "ERR_IPC_CHANNEL_CLOSED", "Channel closed")
}

// A frame to the child, held until the link connects
func (st *tnChildIpc) writeFrame(kind byte, data []byte) bool {
	if st.link == nil {
		st.pending = append(st.pending, tnTunnelFrame{kind: kind, data: data})
		return true
	}
	return st.link.write(kind, data)
}

// Transfers a socket to the child (may run before the link connects)
func (st *tnChildIpc) exportSocket(s *TnSocket) map[string]interface{} {
	if s.relay != nil {
		panic(TnNodeError("DataCloneError", "", "This socket has already been sent"))
	}
	if s.conn == nil {
		panic(TnNodeError("DataCloneError", "", "The socket must be connected to send it"))
	}
	st.hnext++
	id := st.hnext
	end := &tnRelayEnd{conn: s.conn, socket: s}
	if st.link == nil {
		if st.pendingRelays == nil {
			st.pendingRelays = map[float64]*tnRelayEnd{}
		}
		st.pendingRelays[id] = end
	} else {
		st.link.hmu.Lock()
		st.link.relays[id] = end
		st.link.hmu.Unlock()
	}
	s.relay = &tnSocketRelay{id: id, send: func(kind byte, data []byte) bool {
		return st.writeFrame(kind, tnHandleFrame(id, data))
	}}
	// the sender's copy is no longer used: like Node after send(handle), it
	// does not keep the process alive
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	return map[string]interface{}{
		"$tn": "Handle", "kind": "socket", "id": id,
		"ra": s.remoteAddress, "rp": s.remotePort,
		"la": s.localAddress, "lp": s.localPort,
	}
}

// child.send(message, handle?, callback?)
func (cp *TnChildProcess) send(message interface{}, args ...interface{}) bool {
	st := tnCPIpc(cp)
	cb := tnIpcCallback(args)
	handle := tnIpcHandle(args)
	if st == nil || !st.connected {
		err := tnIpcClosedError()
		if cb != nil {
			TnLoopPost(func() { TnInvoke(cb, err) })
		} else {
			TnLoopPost(func() { cp.emit("error", err) })
		}
		return false
	}
	if handle != nil {
		desc := st.exportSocket(handle)
		payload, _ := json.Marshal(map[string]interface{}{
			"msg":    json.RawMessage(tnEncodeMessage(message)),
			"handle": desc,
		})
		st.writeFrame('h', payload)
	} else {
		st.writeFrame('m', tnEncodeMessage(message))
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
	env = tnSpawnEntryEnv(env)
	envMap := map[string]interface{}{}
	for _, kv := range env {
		if k, v, ok := strings.Cut(kv, "="); ok {
			envMap[k] = v
		}
	}
	stdio := "inherit"
	if silent, _ := TnGetValue(opts, "silent").(bool); silent {
		stdio = "pipe"
	}
	spawnOpts := map[string]interface{}{"env": envMap, "stdio": stdio}
	if cwd, ok := TnGetValue(opts, "cwd").(string); ok && cwd != "" {
		spawnOpts["cwd"] = cwd
	}
	cp := TnSpawn(exe, argv, spawnOpts)
	st := &tnChildIpc{connected: true, drained: make(chan struct{})}
	cp.ipc = st
	go func() {
		ln.(*net.TCPListener).SetDeadline(time.Now().Add(30 * time.Second))
		for {
			conn, err := ln.Accept()
			if err != nil {
				ln.Close()
				close(st.drained)
				return
			}
			kind, payload, err := tnReadFrame(conn)
			if err != nil || kind != 't' || string(payload) != token {
				conn.Close()
				continue
			}
			ln.Close()
			link := &tnIpcLink{conn: conn, done: st.drained, hstep: 1, handles: map[float64]*tnHandleConn{}, relays: map[float64]*tnRelayEnd{}, pendingH: map[float64][]tnTunnelFrame{}}
			link.adoptRelays(st.pendingRelays, nil, st.hnext)
			st.pendingRelays = nil
			TnLoopPost(func() {
				st.link = link
				if !st.connected {
					link.close()
					close(st.drained)
					return
				}
				for _, f := range st.pending {
					link.write(f.kind, f.data)
				}
				st.pending = nil
				link.onMessage = func(msg interface{}, handle interface{}) { cp.emit("message", msg, handle) }
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
// fork('./child.ts'): runs the entry point compiled from that file
func TnForkAt(entry string, modulePath interface{}, rest ...interface{}) *TnChildProcess {
	tnNextEntry = entry
	defer func() { tnNextEntry = "" }()
	return TnFork(modulePath, rest...)
}

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
	link := &tnIpcLink{conn: conn, hstep: -1, handles: map[float64]*tnHandleConn{}, relays: map[float64]*tnRelayEnd{}, pendingH: map[float64][]tnTunnelFrame{}}
	tnIpcParent = link
	tnIpcConnected = true
	link.onMessage = func(msg interface{}, handle interface{}) { tnProcessEmitter.emit("message", msg, handle) }
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
	if handle := tnIpcHandle(args); handle != nil {
		desc := tnIpcParent.exportSocket(handle)
		payload, _ := json.Marshal(map[string]interface{}{
			"msg":    json.RawMessage(tnEncodeMessage(message)),
			"handle": desc,
		})
		tnIpcParent.write('h', payload)
	} else {
		tnIpcParent.write('m', tnEncodeMessage(message))
	}
	if cb != nil {
		TnLoopPost(func() { TnInvoke(cb, nil) })
	}
	return true
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
// SCHED_RR (2): the primary owns the listeners and relays. SCHED_NONE (1):
// each worker binds the port itself and the OS balances the connections
var tnSchedulingPolicy float64 = 2

func tnSetSchedulingPolicy(v interface{}) {
	if n, ok := tnNetNumber(v); ok {
		tnSchedulingPolicy = n
	}
}

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
	if b, ok := TnGetValue(s, "silent").(bool); ok {
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
	cp.TnEventEmitter.on("message", func(msg interface{}, handle interface{}) {
		w.emit("message", msg, handle)
		c.emit("message", w, msg, handle)
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

func tnClusterListen(srv *TnNetServer, network string, address string, exclusive bool) (net.Listener, error) {
	if tnIpcParent == nil || !tnIpcConnected || exclusive || tnSchedulingPolicy == float64(1) {
		// the primary binds directly; so does a worker with an exclusive
		// listener, or one whose cluster runs SCHED_NONE (each worker owns the
		// port and the OS balances — the socket options let several bind).
		// The worker's servers close on disconnect either way
		if tnIpcParent == nil || !tnIpcConnected {
			return net.Listen(network, address)
		}
		tnClusterControlHandlers()
		tnClusterServers = append(tnClusterServers, srv)
		var ln net.Listener
		var err error
		if exclusive {
			ln, err = net.Listen(network, address)
		} else {
			var lc net.ListenConfig
			lc.Control = tnReuseSockControl
			ln, err = lc.Listen(context.Background(), network, address)
		}
		if err == nil {
			// the primary hears 'listening' (and the port) as with a relay
			tnIpcParent.control(map[string]interface{}{"act": "listening", "address": ln.Addr().String()})
		}
		return ln, err
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

// Sockets that several processes may bind (SCHED_NONE workers, reuseAddr
// dgram sockets): SO_REUSEPORT where the OS balances, SO_REUSEADDR on Windows
const reuseSockHelper = (fd: string, opt: string) => `func tnReuseSockControl(network string, address string, c syscall.RawConn) error {
	var serr error
	if ctlErr := c.Control(func(fd uintptr) {
		serr = syscall.SetsockoptInt(${fd}(fd), syscall.SOL_SOCKET, syscall.${opt}, 1)
	}); ctlErr != nil {
		return ctlErr
	}
	return serr
}`;

export function registerCluster(r: NodeRegistry): void {
  defineHelper(r, 'nodeReuseSock@windows', ['syscall'], [], reuseSockHelper('syscall.Handle', 'SO_REUSEADDR'));
  for (const goos of ['linux', 'darwin', 'freebsd', 'netbsd', 'openbsd', 'dragonfly']) {
    defineHelper(r, `nodeReuseSock@${goos}`, ['syscall'], [], reuseSockHelper('int', 'SO_REUSEPORT'));
  }
  defineHelper(r, 'nodeReuseSock@other', ['syscall'], [], 'func tnReuseSockControl(network string, address string, c syscall.RawConn) error { return nil }');
  defineHelper(
    r,
    'nodeIpc',
    ['crypto/rand', 'encoding/binary', 'encoding/hex', 'encoding/json', 'io', 'math', 'net', 'os', 'reflect', 'strconv', 'strings', 'sync', 'time'],
    ['nodeClone', 'nodeChild', 'nodeEvents', 'nodeNet', 'eventLoop', 'nodeInvoke', 'dynamic', 'entryPoints'],
    ipcHelper
  );
  const useIpc = () => r.helper('nodeIpc');

  // child_process.fork and the child's process.send / connected / disconnect
  r.functions['child_process.fork'] = (c: NodeCall) => {
    useIpc();
    // fork('./child.ts'): that file is compiled in as a second entry point
    const entry = r.entryPoint(c.nodes[0]);
    if (entry !== '') return `TnForkAt(${JSON.stringify(entry)}, ${c.args.join(', ')})`;
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
  // process.send?.(…) / process.disconnect?.(): they exist only in a process
  // with an IPC channel (a forked child)
  r.functions['process.send?.'] = (c: NodeCall) => {
    useIpc();
    return `func() { if tnIpcParent != nil { TnProcessSend(${c.args.join(', ')}) } }()`;
  };
  r.functions['process.disconnect?.'] = (_c: NodeCall) => {
    useIpc();
    return 'func() { if tnIpcParent != nil { TnProcessDisconnect() } }()';
  };
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
    ['bufio', 'context', 'errors', 'io', 'net', 'os', 'reflect', 'strconv', 'strings', 'sync', 'syscall', 'time'],
    ['nodeIpc', 'nodeNet', 'nodeReuseSock@os', 'orderedMap'],
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
  value('schedulingPolicy', 'float64', 'tnSchedulingPolicy');
  r.functions['cluster.schedulingPolicy='] = (c: NodeCall) => {
    use();
    return `tnSetSchedulingPolicy(${c.args.join(', ')})`;
  };
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
    if (name === 'message') return ['*TnClusterWorker', 'interface{}', 'interface{}'];
    if (name === 'exit') return ['*TnClusterWorker', 'interface{}', 'interface{}'];
    return ['*TnClusterWorker'];
  };
  r.paramTypers['cluster.on'] = clusterListeners;
  r.paramTypers['cluster.once'] = clusterListeners;
  const workerListeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'listening') return ['*TnClusterAddress'];
    if (name === 'message' || name === 'error') return ['interface{}', 'interface{}'];
    if (name === 'exit') return ['interface{}', 'interface{}'];
    return [];
  };
  r.paramTypers['cluster.Worker#on'] = workerListeners;
  r.paramTypers['cluster.Worker#once'] = workerListeners;
}
