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

// Socket options: EBADF before bind(), as in Node (libuv opens the socket there)
func tnDgramOptError(name string, err error) *TnError {
	code := "EBADF"
	switch {
	case err == nil:
	case errors.Is(err, syscall.EINVAL):
		code = "EINVAL"
	case errors.Is(err, syscall.ENODEV):
		code = "ENODEV"
	case errors.Is(err, syscall.EBADF):
		code = "EBADF"
	default:
		code = tnNetCode(err)
	}
	e := TnNodeError("Error", code, name+" "+code)
	e.props["errno"] = tnNetErrnos[code]
	e.props["syscall"] = name
	return e
}

func (s *TnDgramSocket) setOpt(name string, opt string, value int) {
	if s.conn == nil {
		panic(tnDgramOptError(name, nil))
	}
	if err := tnDgramSetOpt(s.conn, s.network == "udp6", opt, value); err != nil {
		panic(tnDgramOptError(name, err))
	}
}

func tnDgramBool(flag bool) int {
	if flag {
		return 1
	}
	return 0
}

func tnDgramTTL(name string, ttl float64) int {
	if math.IsNaN(ttl) || ttl != math.Trunc(ttl) {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The \\"ttl\\" argument must be of type number. Received "+TnJSString(ttl)))
	}
	return int(ttl)
}

func (s *TnDgramSocket) setBroadcast(flag bool) {
	s.setOpt("setBroadcast", "broadcast", tnDgramBool(flag))
}

func (s *TnDgramSocket) setTTL(ttl float64) float64 {
	s.setOpt("setTTL", "ttl", tnDgramTTL("setTTL", ttl))
	return ttl
}

func (s *TnDgramSocket) setMulticastTTL(ttl float64) float64 {
	s.setOpt("setMulticastTTL", "multicastTTL", tnDgramTTL("setMulticastTTL", ttl))
	return ttl
}

func (s *TnDgramSocket) setMulticastLoopback(flag bool) bool {
	s.setOpt("setMulticastLoopback", "multicastLoopback", tnDgramBool(flag))
	return flag
}

// The interface for a multicastInterface argument: an IPv4 address, or an
// IPv6 scope ("::%eth0") or address
func (s *TnDgramSocket) multicastIface(iface string) (net.IP, int) {
	if iface == "" {
		return nil, 0
	}
	if i := strings.IndexByte(iface, '%'); i >= 0 {
		if ifi, err := net.InterfaceByName(iface[i+1:]); err == nil {
			return nil, ifi.Index
		}
		if n, err := strconv.Atoi(iface[i+1:]); err == nil {
			return nil, n
		}
		iface = iface[:i]
	}
	ip := net.ParseIP(iface)
	if ip == nil {
		panic(tnDgramOptError("setMulticastInterface", syscall.EINVAL))
	}
	if ip.To4() == nil {
		if ifaces, err := net.Interfaces(); err == nil {
			for _, ifi := range ifaces {
				addrs, _ := ifi.Addrs()
				for _, a := range addrs {
					if n, ok := a.(*net.IPNet); ok && n.IP.Equal(ip) {
						return ip, ifi.Index
					}
				}
			}
		}
	}
	return ip, 0
}

// setMulticastInterface(iface)
func (s *TnDgramSocket) setMulticastInterface(iface string) {
	if s.conn == nil {
		panic(tnDgramOptError("setMulticastInterface", nil))
	}
	ip, index := s.multicastIface(iface)
	if err := tnDgramMulticastIF(s.conn, s.network == "udp6", ip, index); err != nil {
		panic(tnDgramOptError("setMulticastInterface", err))
	}
}

// addMembership(group, iface?) / dropMembership: an unbound socket binds first
func (s *TnDgramSocket) membership(name string, join bool, group string, iface []string) {
	ip := net.ParseIP(group)
	if ip == nil || !ip.IsMulticast() {
		panic(tnDgramOptError(name, syscall.EINVAL))
	}
	if s.conn == nil {
		if err := s.listen("", 0); err != nil {
			panic(err)
		}
		TnLoopPost(func() { s.emit("listening") })
	}
	ifaceIP, index := s.multicastIface(strings.Join(iface, ""))
	if err := tnDgramMembership(s.conn, join, ip, ifaceIP, index); err != nil {
		panic(tnDgramOptError(name, err))
	}
}

func (s *TnDgramSocket) addMembership(group string, iface ...string) {
	s.membership("addMembership", true, group, iface)
}

func (s *TnDgramSocket) dropMembership(group string, iface ...string) {
	s.membership("dropMembership", false, group, iface)
}

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

// Socket options through the raw descriptor, one variant per target OS
// (nodeDgramOS@os); BSDs take a byte for the IPv4 multicast TTL / loopback
function dgramOSHelper(fd: string, mcast4: string): string {
  return `func tnDgramSockopt(conn *net.UDPConn, set func(fd ${fd}) error) error {
	raw, err := conn.SyscallConn()
	if err != nil {
		return err
	}
	var serr error
	if err := raw.Control(func(fd uintptr) { serr = set(${fd}(fd)) }); err != nil {
		return err
	}
	return serr
}

func tnDgramSetOpt(conn *net.UDPConn, v6 bool, opt string, value int) error {
	return tnDgramSockopt(conn, func(fd ${fd}) error {
		switch opt {
		case "broadcast":
			return syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_BROADCAST, value)
		case "ttl":
			if v6 {
				return syscall.SetsockoptInt(fd, syscall.IPPROTO_IPV6, syscall.IPV6_UNICAST_HOPS, value)
			}
			return syscall.SetsockoptInt(fd, syscall.IPPROTO_IP, syscall.IP_TTL, value)
		case "multicastTTL":
			if v6 {
				return syscall.SetsockoptInt(fd, syscall.IPPROTO_IPV6, syscall.IPV6_MULTICAST_HOPS, value)
			}
			return ${mcast4.replace('OPT', 'syscall.IP_MULTICAST_TTL')}
		case "multicastLoopback":
			if v6 {
				return syscall.SetsockoptInt(fd, syscall.IPPROTO_IPV6, syscall.IPV6_MULTICAST_LOOP, value)
			}
			return ${mcast4.replace('OPT', 'syscall.IP_MULTICAST_LOOP')}
		}
		return nil
	})
}

func tnDgramMulticastIF(conn *net.UDPConn, v6 bool, ip net.IP, index int) error {
	return tnDgramSockopt(conn, func(fd ${fd}) error {
		if v6 {
			return syscall.SetsockoptInt(fd, syscall.IPPROTO_IPV6, syscall.IPV6_MULTICAST_IF, index)
		}
		var addr [4]byte
		if ip4 := ip.To4(); ip4 != nil {
			copy(addr[:], ip4)
		}
		return syscall.SetsockoptInet4Addr(fd, syscall.IPPROTO_IP, syscall.IP_MULTICAST_IF, addr)
	})
}

func tnDgramMembership(conn *net.UDPConn, join bool, group net.IP, iface net.IP, index int) error {
	return tnDgramSockopt(conn, func(fd ${fd}) error {
		if g4 := group.To4(); g4 != nil {
			mreq := &syscall.IPMreq{}
			copy(mreq.Multiaddr[:], g4)
			if i4 := iface.To4(); i4 != nil {
				copy(mreq.Interface[:], i4)
			}
			opt := syscall.IP_ADD_MEMBERSHIP
			if !join {
				opt = syscall.IP_DROP_MEMBERSHIP
			}
			return syscall.SetsockoptIPMreq(fd, syscall.IPPROTO_IP, opt, mreq)
		}
		mreq := &syscall.IPv6Mreq{Interface: uint32(index)}
		copy(mreq.Multiaddr[:], group.To16())
		opt := syscall.IPV6_JOIN_GROUP
		if !join {
			opt = syscall.IPV6_LEAVE_GROUP
		}
		return syscall.SetsockoptIPv6Mreq(fd, syscall.IPPROTO_IPV6, opt, mreq)
	})
}`;
}

const otherDgramOSHelper = `func tnDgramSetOpt(conn *net.UDPConn, v6 bool, opt string, value int) error {
	return errors.ErrUnsupported
}

func tnDgramMulticastIF(conn *net.UDPConn, v6 bool, ip net.IP, index int) error {
	return errors.ErrUnsupported
}

func tnDgramMembership(conn *net.UDPConn, join bool, group net.IP, iface net.IP, index int) error {
	return errors.ErrUnsupported
}`;

export function registerDgram(r: NodeRegistry): void {
  defineModule(r, 'dgram');
  const intOpt = 'syscall.SetsockoptInt(fd, syscall.IPPROTO_IP, OPT, value)';
  const byteOpt = 'syscall.SetsockoptByte(fd, syscall.IPPROTO_IP, OPT, byte(value))';
  defineHelper(r, 'nodeDgramOS@linux', ['net', 'syscall'], [], dgramOSHelper('int', intOpt));
  for (const goos of ['darwin', 'freebsd', 'openbsd', 'netbsd', 'dragonfly']) {
    defineHelper(r, `nodeDgramOS@${goos}`, ['net', 'syscall'], [], dgramOSHelper('int', byteOpt));
  }
  defineHelper(r, 'nodeDgramOS@windows', ['net', 'syscall'], [], dgramOSHelper('syscall.Handle', intOpt));
  defineHelper(r, 'nodeDgramOS@other', ['errors', 'net'], [], otherDgramOSHelper);
  defineHelper(r, 'nodeDgram', ['errors', 'math', 'net', 'strconv', 'strings', 'syscall'], ['nodeNet', 'netErrors', 'nodeEvents', 'eventLoop', 'nodeInvoke', 'dynamic', 'nodeDgramOS@os'], dgramHelper);
  const use = () => r.helper('nodeDgram');
  defineClass(
    r,
    'dgram.Socket',
    '*TnDgramSocket',
    'class',
    'on=*TnEventEmitter; once=*TnEventEmitter; addListener=*TnEventEmitter; off=*TnEventEmitter; removeListener=*TnEventEmitter; removeAllListeners=*TnEventEmitter; emit=bool; listenerCount=float64; bind=*TnDgramSocket; send=; connect=; disconnect=; remoteAddress=*TnAddressInfo; address=*TnAddressInfo; close=*TnDgramSocket; ref=*TnDgramSocket; unref=*TnDgramSocket; setBroadcast=; setTTL=float64; setMulticastTTL=float64; setMulticastLoopback=bool; setMulticastInterface=; addMembership=; dropMembership=; setRecvBufferSize=; setSendBufferSize=',
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
