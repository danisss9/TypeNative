// node:dgram — UDP sockets on Go's net.UDPConn. A bound socket reads on a
// goroutine and emits 'message' on the event loop; it keeps the process alive
// until close() (or unref()).

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const dgramHelper = `// node:dgram
type TnRemoteInfo struct {
	address string
	family  string
	port    float64
	size    float64
}

type TnDgramSocket struct {
	TnEventEmitter
	asyncCtx  TnAsyncContext
	network   string
	conn      *net.UDPConn
	bound     bool
	closed    bool
	refd      bool
	reuseAddr bool
	remote    *net.UDPAddr
}

func TnCreateDgramSocket(kind interface{}, listener ...interface{}) *TnDgramSocket {
	s := &TnDgramSocket{network: "udp4", asyncCtx: TnAsyncSnapshot()}
	switch k := kind.(type) {
	case string:
		if k == "udp6" {
			s.network = "udp6"
		}
	default:
		if kind != nil {
			if t := tnNetString(TnGet(kind, "type")); t == "udp6" {
				s.network = "udp6"
			}
			s.reuseAddr, _ = TnGet(kind, "reuseAddr").(bool)
		}
	}
	if len(listener) > 0 && tnIsFunc(listener[0]) {
		s.on("message", listener[0])
	}
	return s
}

// bind(port?, address?, cb?) / bind({ port, address }, cb?)
func (s *TnDgramSocket) bind(args ...interface{}) *TnDgramSocket {
	port := float64(0)
	address := ""
	for i, a := range args {
		if tnIsFunc(a) {
			s.TnEventEmitter.once("listening", a)
			continue
		}
		if n, ok := tnNetNumber(a); ok && i == 0 {
			port = n
			continue
		}
		if str, ok := a.(string); ok {
			address = str
			continue
		}
		if a != nil && i == 0 {
			if n, ok := tnNetNumber(TnGet(a, "port")); ok {
				port = n
			}
			address = tnNetString(TnGet(a, "address"))
		}
	}
	if err := s.listen(address, port); err != nil {
		e := err
		TnLoopPost(func() { s.emit("error", e) })
		return s
	}
	TnLoopPost(func() { s.emit("listening") })
	return s
}

func (s *TnDgramSocket) listen(address string, port float64) *TnError {
	if s.bound {
		return TnNodeError("Error", "ERR_SOCKET_ALREADY_BOUND", "Socket is already bound")
	}
	if address == "" {
		if s.network == "udp6" {
			address = "::"
		} else {
			address = "0.0.0.0"
		}
	}
	addr, err := net.ResolveUDPAddr(s.network, net.JoinHostPort(address, strconv.FormatFloat(port, 'f', -1, 64)))
	if err != nil {
		return TnNetError(err, "bind", address, port)
	}
	conn, err := net.ListenUDP(s.network, addr)
	if err != nil {
		return TnNetError(err, "bind", address, port)
	}
	s.conn = conn
	s.bound = true
	s.refd = true
	TnLoopRef()
	go func() {
		buf := make([]byte, 65536)
		for {
			n, from, err := conn.ReadFromUDP(buf)
			if err != nil {
				return
			}
			msg := append([]byte{}, buf[:n]...)
			info := &TnRemoteInfo{port: float64(from.Port), size: float64(n)}
			ip := from.IP
			if ip4 := ip.To4(); ip4 != nil && s.network == "udp4" {
				ip = ip4
			}
			info.address = ip.String()
			info.family = tnFamily(info.address)
			TnLoopPost(func() {
				if !s.closed {
					TnAsyncRun(s.asyncCtx, func() { s.emit("message", msg, info) })
				}
			})
		}
	}()
	return nil
}

func tnDgramBytes(msg interface{}) []byte {
	switch m := msg.(type) {
	case []byte:
		return m
	case string:
		return []byte(m)
	case []interface{}:
		out := []byte{}
		for _, part := range m {
			out = append(out, tnDgramBytes(part)...)
		}
		return out
	case [][]byte:
		out := []byte{}
		for _, part := range m {
			out = append(out, part...)
		}
		return out
	case []string:
		return []byte(strings.Join(m, ""))
	}
	return []byte(TnJSString(msg))
}

// send(msg, [offset, length,] [port, address,] cb?)
func (s *TnDgramSocket) send(msg interface{}, args ...interface{}) {
	data := tnDgramBytes(msg)
	nums := []float64{}
	address := ""
	var cb interface{}
	for _, a := range args {
		if tnIsFunc(a) {
			cb = a
		} else if n, ok := tnNetNumber(a); ok {
			nums = append(nums, n)
		} else if str, ok := a.(string); ok {
			address = str
		}
	}
	port := float64(-1)
	switch len(nums) {
	case 1:
		port = nums[0]
	case 2:
		data = data[int(nums[0]):]
	case 3:
		data = data[int(nums[0]) : int(nums[0])+int(nums[1])]
		port = nums[2]
	}
	if len(nums) == 2 {
		data = data[:int(nums[1])]
	}
	fail := func(e *TnError) {
		TnLoopPost(func() {
			if cb != nil {
				TnInvoke(cb, e)
			} else {
				s.emit("error", e)
			}
		})
	}
	if s.closed {
		fail(TnNodeError("Error", "ERR_SOCKET_DGRAM_NOT_RUNNING", "Not running"))
		return
	}
	if !s.bound {
		if err := s.listen("", 0); err != nil {
			fail(err)
			return
		}
		TnLoopPost(func() { s.emit("listening") })
	}
	var target *net.UDPAddr
	if port < 0 {
		target = s.remote
		if target == nil {
			fail(TnNodeError("Error", "ERR_SOCKET_BAD_PORT", "Port should be > 0 and < 65536"))
			return
		}
	} else {
		if address == "" {
			address = "127.0.0.1"
			if s.network == "udp6" {
				address = "::1"
			}
		}
		addr, err := net.ResolveUDPAddr(s.network, net.JoinHostPort(address, strconv.FormatFloat(port, 'f', -1, 64)))
		if err != nil {
			fail(tnDnsLookupErrorUDP(err, address))
			return
		}
		target = addr
	}
	conn := s.conn
	size := float64(len(data))
	TnLoopRef()
	go func() {
		_, err := conn.WriteToUDP(data, target)
		TnLoopPost(func() {
			defer TnLoopUnref()
			if err != nil {
				e := TnNetError(err, "send", target.IP.String(), float64(target.Port))
				if cb != nil {
					TnInvoke(cb, e)
				} else {
					s.emit("error", e)
				}
				return
			}
			if cb != nil {
				TnInvoke(cb, nil, size)
			}
		})
	}()
}

func tnDnsLookupErrorUDP(err error, hostname string) *TnError {
	e := TnNodeError("Error", "ENOTFOUND", "getaddrinfo ENOTFOUND "+hostname)
	e.props["errno"] = tnNetErrnos["ENOTFOUND"]
	e.props["syscall"] = "getaddrinfo"
	e.props["hostname"] = hostname
	return e
}

// connect(port, address?, cb?): the default destination of send()
func (s *TnDgramSocket) connect(port float64, args ...interface{}) {
	address := "127.0.0.1"
	if s.network == "udp6" {
		address = "::1"
	}
	var cb interface{}
	for _, a := range args {
		if tnIsFunc(a) {
			cb = a
		} else if str, ok := a.(string); ok {
			address = str
		}
	}
	if s.remote != nil {
		panic(TnNodeError("Error", "ERR_SOCKET_DGRAM_IS_CONNECTED", "Already connected"))
	}
	addr, err := net.ResolveUDPAddr(s.network, net.JoinHostPort(address, strconv.FormatFloat(port, 'f', -1, 64)))
	if err != nil {
		e := tnDnsLookupErrorUDP(err, address)
		TnLoopPost(func() { s.emit("error", e) })
		return
	}
	if !s.bound {
		if lerr := s.listen("", 0); lerr != nil {
			TnLoopPost(func() { s.emit("error", lerr) })
			return
		}
		TnLoopPost(func() { s.emit("listening") })
	}
	s.remote = addr
	if cb != nil {
		s.TnEventEmitter.once("connect", cb)
	}
	TnLoopPost(func() { s.emit("connect") })
}

func (s *TnDgramSocket) disconnect() {
	if s.remote == nil {
		panic(TnNodeError("Error", "ERR_SOCKET_DGRAM_NOT_CONNECTED", "Not connected"))
	}
	s.remote = nil
}

func (s *TnDgramSocket) remoteAddress() *TnAddressInfo {
	if s.remote == nil {
		panic(TnNodeError("Error", "ERR_SOCKET_DGRAM_NOT_CONNECTED", "Not connected"))
	}
	return tnAddrInfo(s.remote)
}

func (s *TnDgramSocket) address() *TnAddressInfo {
	if s.conn == nil {
		panic(TnNodeError("Error", "ERR_SOCKET_DGRAM_NOT_RUNNING", "Not running"))
	}
	info := tnAddrInfo(s.conn.LocalAddr())
	if info.address == "::" && s.network == "udp4" {
		info.address, info.family = "0.0.0.0", "IPv4"
	}
	return info
}

func (s *TnDgramSocket) close(cb ...interface{}) *TnDgramSocket {
	if s.closed {
		return s
	}
	s.closed = true
	if len(cb) > 0 && tnIsFunc(cb[0]) {
		s.TnEventEmitter.once("close", cb[0])
	}
	if s.conn != nil {
		s.conn.Close()
	}
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	TnLoopPost(func() { s.emit("close") })
	return s
}

func (s *TnDgramSocket) ref() *TnDgramSocket {
	if !s.refd && s.bound && !s.closed {
		s.refd = true
		TnLoopRef()
	}
	return s
}

func (s *TnDgramSocket) unref() *TnDgramSocket {
	if s.refd {
		s.refd = false
		TnLoopUnref()
	}
	return s
}

func (s *TnDgramSocket) setBroadcast(flag bool) {}
func (s *TnDgramSocket) setTTL(ttl float64) float64 { return ttl }
func (s *TnDgramSocket) setMulticastTTL(ttl float64) float64 { return ttl }
func (s *TnDgramSocket) setMulticastLoopback(flag bool) bool { return flag }

func (s *TnDgramSocket) setRecvBufferSize(size float64) {
	if s.conn != nil {
		s.conn.SetReadBuffer(int(size))
	}
}

func (s *TnDgramSocket) setSendBufferSize(size float64) {
	if s.conn != nil {
		s.conn.SetWriteBuffer(int(size))
	}
}`;

export function registerDgram(r: NodeRegistry): void {
  defineModule(r, 'dgram');
  defineHelper(r, 'nodeDgram', ['net', 'strconv', 'strings'], ['nodeNet', 'netErrors', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic'], dgramHelper);
  const use = () => r.helper('nodeDgram');
  defineClass(
    r,
    'dgram.Socket',
    '*TnDgramSocket',
    'class',
    'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64; bind=*TnDgramSocket; send=; connect=; disconnect=; remoteAddress=*TnAddressInfo; address=*TnAddressInfo; close=*TnDgramSocket; ref=*TnDgramSocket; unref=*TnDgramSocket; setBroadcast=; setTTL=float64; setMulticastTTL=float64; setMulticastLoopback=bool; setRecvBufferSize=; setSendBufferSize=',
    '',
    '',
    ''
  );
  defineClass(r, 'dgram.RemoteInfo', '*TnRemoteInfo', 'class', '', 'address=string; family=string; port=float64; size=float64', '', '');
  const listeners = (nodes: any[]): string[] => {
    const event = nodes[0];
    const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
    if (name === 'message') return ['[]byte', '*TnRemoteInfo'];
    if (name === 'error') return ['interface{}'];
    return [];
  };
  r.paramTypers['dgram.Socket#on'] = listeners;
  r.paramTypers['dgram.Socket#once'] = listeners;
  r.paramTypers['dgram.Socket#send'] = (_n: any[]) => ['*TnError', 'float64'];
  r.functions['dgram.createSocket'] = (c: NodeCall) => {
    use();
    return `TnCreateDgramSocket(${c.args.join(', ')})`;
  };
  r.paramTypers['dgram.createSocket'] = (_n: any[]) => ['[]byte', '*TnRemoteInfo'];
  setResults(r, 'dgram', 'createSocket=*TnDgramSocket');
}
