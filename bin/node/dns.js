// node:dns (+ dns/promises, dns.promises) — lookups on Go's resolver. Each
// query runs on a goroutine; callbacks run on the event loop, promise forms
// resolve when the answer arrives. Errors carry Node's codes (ENOTFOUND …).
import { defineClass, defineHelper, defineModule, getOption } from './registry.js';
const dnsHelper = `// node:dns
type TnLookupAddress struct {
	address string
	family  float64
}

type TnMxRecord struct {
	exchange string
	priority float64
}

type TnSrvRecord struct {
	name     string
	port     float64
	priority float64
	weight   float64
}

func tnDnsError(err error, syscallName string, hostname string) *TnError {
	code := tnNetCode(err)
	if code != "EAI_AGAIN" {
		code = "ENOTFOUND"
	}
	e := TnNodeError("Error", code, syscallName+" "+code+" "+hostname)
	e.props["errno"] = tnNetErrnos[code]
	e.props["syscall"] = syscallName
	e.props["hostname"] = hostname
	return e
}

// lookup options: a family number or { family, all }
func tnLookupOptions(options interface{}) (float64, bool) {
	if n, ok := tnNetNumber(options); ok {
		return n, false
	}
	if options == nil {
		return 0, false
	}
	family := float64(0)
	if n, ok := tnNetNumber(TnGet(options, "family")); ok {
		family = n
	}
	if s, ok := TnGet(options, "family").(string); ok {
		if s == "IPv4" {
			family = 4
		} else if s == "IPv6" {
			family = 6
		}
	}
	all, _ := TnGet(options, "all").(bool)
	return family, all
}

func tnLookupAll(hostname string, family float64) ([]*TnLookupAddress, error) {
	if ip := net.ParseIP(hostname); ip != nil {
		return []*TnLookupAddress{{address: hostname, family: TnIsIP(hostname)}}, nil
	}
	network := "ip"
	if family == 4 {
		network = "ip4"
	} else if family == 6 {
		network = "ip6"
	}
	ips, err := net.DefaultResolver.LookupIP(context.Background(), network, hostname)
	if err != nil {
		return nil, tnDnsError(err, "getaddrinfo", hostname)
	}
	out := []*TnLookupAddress{}
	for _, ip := range ips {
		f := float64(6)
		if ip.To4() != nil {
			f = 4
		}
		out = append(out, &TnLookupAddress{address: ip.String(), family: f})
	}
	if len(out) == 0 {
		return nil, tnDnsError(&net.DNSError{Err: "no such host", Name: hostname, IsNotFound: true}, "getaddrinfo", hostname)
	}
	return out, nil
}

// Runs a query on a goroutine, then the callback on the loop
func tnDnsCall(cb interface{}, work func() ([]interface{}, error)) {
	TnLoopRef()
	ctx := TnAsyncSnapshot()
	go func() {
		values, err := work()
		TnLoopPost(func() {
			defer TnLoopUnref()
			if cb == nil {
				return
			}
			TnAsyncRun(ctx, func() {
				if err != nil {
					TnInvoke(cb, err)
					return
				}
				TnInvoke(cb, append([]interface{}{nil}, values...)...)
			})
		})
	}()
}

func tnDnsPromise[T any](work func() (T, error)) chan T {
	ch := make(chan T, 1)
	go func() {
		v, err := work()
		if err != nil {
			TnReject(ch, err)
			return
		}
		TnAsyncSend(ch, v)
	}()
	return ch
}

func tnDnsArgs(args []interface{}) (interface{}, interface{}) {
	var options, cb interface{}
	for _, a := range args {
		if tnIsFunc(a) {
			cb = a
		} else if a != nil {
			options = a
		}
	}
	return options, cb
}

// dns.lookup(hostname, [options], cb(err, address, family)) / { all: true } → cb(err, addresses)
func TnDnsLookup(hostname string, args ...interface{}) {
	options, cb := tnDnsArgs(args)
	family, all := tnLookupOptions(options)
	tnDnsCall(cb, func() ([]interface{}, error) {
		addrs, err := tnLookupAll(hostname, family)
		if err != nil {
			return nil, err
		}
		if all {
			return []interface{}{addrs}, nil
		}
		return []interface{}{addrs[0].address, addrs[0].family}, nil
	})
}

func TnDnsLookupPromise(hostname string, options ...interface{}) chan *TnLookupAddress {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	family, _ := tnLookupOptions(opts)
	return tnDnsPromise(func() (*TnLookupAddress, error) {
		addrs, err := tnLookupAll(hostname, family)
		if err != nil {
			return nil, err
		}
		return addrs[0], nil
	})
}

func TnDnsLookupAllPromise(hostname string, options ...interface{}) chan []*TnLookupAddress {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	family, _ := tnLookupOptions(opts)
	return tnDnsPromise(func() ([]*TnLookupAddress, error) { return tnLookupAll(hostname, family) })
}

// dns.Resolver: its own servers (round-robin, with failover), timeout, local address
// and cancel(); the module-level resolve functions use the default one
type TnDnsResolver struct {
	mu      sync.Mutex
	servers []string
	timeout time.Duration
	tries   int
	local4  net.IP
	local6  net.IP
	next    uint32
	ctx     context.Context
	stop    context.CancelFunc
}

// dns/promises.Resolver: the same resolver, with promise methods
type TnDnsPromiseResolver struct {
	*TnDnsResolver
}

var tnDefaultDns = &TnDnsResolver{}

func TnNewDnsResolver(options ...interface{}) *TnDnsResolver {
	r := &TnDnsResolver{}
	if len(options) > 0 && options[0] != nil {
		if ms, ok := tnNetNumber(TnGet(options[0], "timeout")); ok && ms > 0 {
			r.timeout = time.Duration(ms) * time.Millisecond
		}
		if n, ok := tnNetNumber(TnGet(options[0], "tries")); ok && n > 0 {
			r.tries = int(n)
		}
	}
	return r
}

func TnNewDnsPromiseResolver(options ...interface{}) *TnDnsPromiseResolver {
	return &TnDnsPromiseResolver{TnNewDnsResolver(options...)}
}

// A query's resolver and context (cancel() and the timeout end it)
func (r *TnDnsResolver) query() (*net.Resolver, context.Context, context.CancelFunc) {
	r.mu.Lock()
	if r.ctx == nil {
		r.ctx, r.stop = context.WithCancel(context.Background())
	}
	parent := r.ctx
	servers := append([]string{}, r.servers...)
	local4, local6 := r.local4, r.local6
	r.mu.Unlock()
	ctx, done := parent, context.CancelFunc(func() {})
	if r.timeout > 0 {
		ctx, done = context.WithTimeout(parent, r.timeout)
	}
	if len(servers) == 0 && local4 == nil && local6 == nil {
		return net.DefaultResolver, ctx, done
	}
	res := &net.Resolver{PreferGo: true, Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
		if len(servers) > 0 {
			i := atomic.AddUint32(&r.next, 1)
			address = servers[int(i-1)%len(servers)]
		}
		d := net.Dialer{}
		host, _, _ := net.SplitHostPort(address)
		local := local4
		if ip := net.ParseIP(host); ip != nil && ip.To4() == nil {
			local = local6
		}
		if local != nil {
			if strings.HasPrefix(network, "udp") {
				d.LocalAddr = &net.UDPAddr{IP: local}
			} else {
				d.LocalAddr = &net.TCPAddr{IP: local}
			}
		}
		return d.DialContext(ctx, network, address)
	}}
	return res, ctx, done
}

func (r *TnDnsResolver) fail(ctx context.Context, err error, syscallName string, hostname string) *TnError {
	code := ""
	if ctx.Err() == context.Canceled {
		code = "ECANCELLED"
	} else if ctx.Err() == context.DeadlineExceeded {
		code = "ETIMEOUT"
	}
	if code == "" {
		return tnDnsError(err, syscallName, hostname)
	}
	e := TnNodeError("Error", code, syscallName+" "+code+" "+hostname)
	e.props["syscall"] = syscallName
	e.props["hostname"] = hostname
	return e
}

// resolver.cancel(): outstanding queries fail with ECANCELLED
func (r *TnDnsResolver) cancel() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.stop != nil {
		r.stop()
	}
	r.ctx, r.stop = nil, nil
}

func (r *TnDnsResolver) setLocalAddress(addrs ...interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.local4, r.local6 = nil, nil
	for _, a := range addrs {
		s, _ := a.(string)
		ip := net.ParseIP(s)
		if ip == nil {
			if s != "" {
				panic(TnNodeError("TypeError", "ERR_INVALID_IP_ADDRESS", "Invalid IP address: "+s))
			}
			continue
		}
		if ip.To4() != nil {
			r.local4 = ip
		} else {
			r.local6 = ip
		}
	}
}

// setServers(['1.2.3.4', '1.2.3.4:5353', '::1', '[::1]:5353'])
func (r *TnDnsResolver) setServers(servers []string) {
	parsed := []string{}
	for _, s := range servers {
		if addr, err := netip.ParseAddr(strings.Trim(s, "[]")); err == nil {
			parsed = append(parsed, netip.AddrPortFrom(addr, 53).String())
		} else if ap, err := netip.ParseAddrPort(s); err == nil {
			parsed = append(parsed, ap.String())
		} else {
			panic(TnNodeError("TypeError", "ERR_INVALID_IP_ADDRESS", "Invalid IP address: "+s))
		}
	}
	r.mu.Lock()
	r.servers = parsed
	r.mu.Unlock()
}

func (r *TnDnsResolver) getServers() []string {
	r.mu.Lock()
	servers := append([]string{}, r.servers...)
	r.mu.Unlock()
	if len(servers) == 0 {
		return TnDnsGetServers()
	}
	out := []string{}
	for _, s := range servers {
		ap := netip.MustParseAddrPort(s)
		switch {
		case ap.Port() == 53:
			out = append(out, ap.Addr().String())
		default:
			out = append(out, s)
		}
	}
	return out
}

// dns.lookupService(address, port, cb(err, hostname, service))
func tnServiceName(port int) string {
	if data, err := os.ReadFile("/etc/services"); err == nil {
		for _, line := range strings.Split(string(data), "\\n") {
			fields := strings.Fields(line)
			if len(fields) >= 2 && !strings.HasPrefix(fields[0], "#") && fields[1] == strconv.Itoa(port)+"/tcp" {
				return fields[0]
			}
		}
	}
	known := map[int]string{20: "ftp-data", 21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "domain", 80: "http", 110: "pop3", 143: "imap2", 443: "https", 465: "submissions", 587: "submission", 993: "imaps", 995: "pop3s"}
	if name, ok := known[port]; ok {
		return name
	}
	return strconv.Itoa(port)
}

func tnLookupServiceCheck(address string, port float64) {
	if net.ParseIP(address) == nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'address' is invalid. Received '"+address+"'"))
	}
	if port < 0 || port > 65535 || port != float64(int(port)) {
		panic(TnNodeError("RangeError", "ERR_SOCKET_BAD_PORT", "Port should be >= 0 and < 65536. Received type number ("+TnNumStr(port)+")."))
	}
}

func tnLookupService(address string, port float64) (string, string, error) {
	host := address
	if names, err := net.DefaultResolver.LookupAddr(context.Background(), address); err == nil && len(names) > 0 {
		host = strings.TrimSuffix(names[0], ".")
	}
	return host, tnServiceName(int(port)), nil
}

func TnDnsLookupService(address string, port float64, cb interface{}) {
	tnLookupServiceCheck(address, port)
	tnDnsCall(cb, func() ([]interface{}, error) {
		host, service, err := tnLookupService(address, port)
		return []interface{}{host, service}, err
	})
}

type TnLookupService struct {
	hostname string
	service  string
}

func TnDnsLookupServicePromise(address string, port float64) chan *TnLookupService {
	tnLookupServiceCheck(address, port)
	return tnDnsPromise(func() (*TnLookupService, error) {
		host, service, err := tnLookupService(address, port)
		return &TnLookupService{hostname: host, service: service}, err
	})
}


func (r *TnDnsResolver) resolveIPs(hostname string, family int) ([]string, error) {
	res, ctx, done := r.query()
	defer done()
	network := "ip4"
	syscallName := "queryA"
	if family == 6 {
		network, syscallName = "ip6", "queryAaaa"
	}
	ips, err := res.LookupIP(ctx, network, hostname)
	if err != nil {
		return nil, r.fail(ctx, err, syscallName, hostname)
	}
	out := []string{}
	for _, ip := range ips {
		out = append(out, ip.String())
	}
	return out, nil
}

func (r *TnDnsResolver) resolve4(hostname string) ([]string, error) { return r.resolveIPs(hostname, 4) }
func (r *TnDnsResolver) resolve6(hostname string) ([]string, error) { return r.resolveIPs(hostname, 6) }

func (r *TnDnsResolver) resolveCname(hostname string) ([]string, error) {
	res, ctx, done := r.query()
	defer done()
	cname, err := res.LookupCNAME(ctx, hostname)
	if err != nil {
		return nil, r.fail(ctx, err, "queryCname", hostname)
	}
	return []string{strings.TrimSuffix(cname, ".")}, nil
}

func (r *TnDnsResolver) resolveMx(hostname string) ([]*TnMxRecord, error) {
	res, ctx, done := r.query()
	defer done()
	mxs, err := res.LookupMX(ctx, hostname)
	if err != nil {
		return nil, r.fail(ctx, err, "queryMx", hostname)
	}
	out := []*TnMxRecord{}
	for _, mx := range mxs {
		out = append(out, &TnMxRecord{exchange: strings.TrimSuffix(mx.Host, "."), priority: float64(mx.Pref)})
	}
	return out, nil
}

func (r *TnDnsResolver) resolveTxt(hostname string) ([][]string, error) {
	res, ctx, done := r.query()
	defer done()
	txts, err := res.LookupTXT(ctx, hostname)
	if err != nil {
		return nil, r.fail(ctx, err, "queryTxt", hostname)
	}
	out := [][]string{}
	for _, t := range txts {
		out = append(out, []string{t})
	}
	return out, nil
}

func (r *TnDnsResolver) resolveNs(hostname string) ([]string, error) {
	res, ctx, done := r.query()
	defer done()
	nss, err := res.LookupNS(ctx, hostname)
	if err != nil {
		return nil, r.fail(ctx, err, "queryNs", hostname)
	}
	out := []string{}
	for _, ns := range nss {
		out = append(out, strings.TrimSuffix(ns.Host, "."))
	}
	return out, nil
}

func (r *TnDnsResolver) resolveSrv(hostname string) ([]*TnSrvRecord, error) {
	res, ctx, done := r.query()
	defer done()
	_, srvs, err := res.LookupSRV(ctx, "", "", hostname)
	if err != nil {
		return nil, r.fail(ctx, err, "querySrv", hostname)
	}
	out := []*TnSrvRecord{}
	for _, srv := range srvs {
		out = append(out, &TnSrvRecord{name: strings.TrimSuffix(srv.Target, "."), port: float64(srv.Port), priority: float64(srv.Priority), weight: float64(srv.Weight)})
	}
	return out, nil
}

func (r *TnDnsResolver) reverse(ip string) ([]string, error) {
	res, ctx, done := r.query()
	defer done()
	names, err := res.LookupAddr(ctx, ip)
	if err != nil {
		return nil, r.fail(ctx, err, "getHostByAddr", ip)
	}
	out := []string{}
	for _, n := range names {
		out = append(out, strings.TrimSuffix(n, "."))
	}
	return out, nil
}

// Callback form of a resolve function: cb(err, records)
func TnDnsResolveCb[T any](fn func(string) (T, error), hostname string, cb interface{}) {
	tnDnsCall(cb, func() ([]interface{}, error) {
		v, err := fn(hostname)
		if err != nil {
			return nil, err
		}
		return []interface{}{v}, nil
	})
}

func TnDnsResolvePromise[T any](fn func(string) (T, error), hostname string) chan T {
	return tnDnsPromise(func() (T, error) { return fn(hostname) })
}

// dns.getServers(): the nameservers of /etc/resolv.conf
func TnDnsGetServers() []string {
	out := []string{}
	data, err := os.ReadFile("/etc/resolv.conf")
	if err != nil {
		return out
	}
	for _, line := range strings.Split(string(data), "\\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[0] == "nameserver" {
			out = append(out, fields[1])
		}
	}
	return out
}

// Raw DNS queries (golang.org/x/net/dns/dnsmessage, copied from GOROOT) for
// what Go's resolver hides: TTLs, ANY / CAA / NAPTR / PTR / SOA records
type TnRecordWithTtl struct {
	address string
	ttl     float64
}

type TnSoaRecord struct {
	nsname     string
	hostmaster string
	serial     float64
	refresh    float64
	retry      float64
	expire     float64
	minttl     float64
}

type TnNaptrRecord struct {
	flags       string
	service     string
	regexp      string
	replacement string
	order       float64
	preference  float64
}

func (r *TnDnsResolver) queryError(code string, syscallName string, hostname string) *TnError {
	e := TnNodeError("Error", code, syscallName+" "+code+" "+hostname)
	e.props["syscall"] = syscallName
	e.props["hostname"] = hostname
	return e
}

// One exchange with a server: UDP, then TCP when the answer is truncated
func tnDnsExchange(ctx context.Context, server string, local net.IP, query []byte, id uint16) (*dnsmessage.Message, error) {
	for _, network := range []string{"udp", "tcp"} {
		d := net.Dialer{}
		if local != nil {
			if network == "udp" {
				d.LocalAddr = &net.UDPAddr{IP: local}
			} else {
				d.LocalAddr = &net.TCPAddr{IP: local}
			}
		}
		conn, err := d.DialContext(ctx, network, server)
		if err != nil {
			return nil, err
		}
		stop := context.AfterFunc(ctx, func() { conn.SetDeadline(time.Now()) })
		var answer []byte
		if network == "udp" {
			_, err = conn.Write(query)
			buf := make([]byte, 65535)
			for err == nil {
				var n int
				n, err = conn.Read(buf)
				// skip stray answers to other queries
				if err == nil && n >= 2 && uint16(buf[0])<<8|uint16(buf[1]) == id {
					answer = buf[:n]
					break
				}
			}
		} else {
			framed := append([]byte{byte(len(query) >> 8), byte(len(query))}, query...)
			if _, err = conn.Write(framed); err == nil {
				header := make([]byte, 2)
				if _, err = io.ReadFull(conn, header); err == nil {
					answer = make([]byte, int(header[0])<<8|int(header[1]))
					_, err = io.ReadFull(conn, answer)
				}
			}
		}
		stop()
		conn.Close()
		if err != nil {
			return nil, err
		}
		var msg dnsmessage.Message
		if err := msg.Unpack(answer); err != nil {
			return nil, err
		}
		if msg.Truncated && network == "udp" {
			continue
		}
		return &msg, nil
	}
	return nil, errors.New("truncated")
}

// rawQuery(name, type): the answers of that type (all of them for ANY), trying
// each server in turn, tries times (Node's c-ares defaults: 5 s, 4 tries)
func (r *TnDnsResolver) rawQuery(hostname string, qtype dnsmessage.Type, syscallName string) ([]dnsmessage.Resource, error) {
	r.mu.Lock()
	if r.ctx == nil {
		r.ctx, r.stop = context.WithCancel(context.Background())
	}
	parent := r.ctx
	servers := append([]string{}, r.servers...)
	local4, local6 := r.local4, r.local6
	timeout, tries := r.timeout, r.tries
	r.mu.Unlock()
	if len(servers) == 0 {
		for _, s := range TnDnsGetServers() {
			if addr, err := netip.ParseAddr(s); err == nil {
				servers = append(servers, netip.AddrPortFrom(addr, 53).String())
			}
		}
	}
	if len(servers) == 0 {
		servers = []string{"127.0.0.1:53"}
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	if tries <= 0 {
		tries = 4
	}
	fqdn := hostname
	if !strings.HasSuffix(fqdn, ".") {
		fqdn += "."
	}
	name, err := dnsmessage.NewName(fqdn)
	if err != nil {
		return nil, r.queryError("EBADNAME", syscallName, hostname)
	}
	id := uint16(time.Now().UnixNano())
	b := dnsmessage.NewBuilder(nil, dnsmessage.Header{ID: id, RecursionDesired: true})
	b.EnableCompression()
	b.StartQuestions()
	b.Question(dnsmessage.Question{Name: name, Type: qtype, Class: dnsmessage.ClassINET})
	b.StartAdditionals()
	var opt dnsmessage.ResourceHeader
	opt.SetEDNS0(1232, dnsmessage.RCodeSuccess, false)
	b.OPTResource(opt, dnsmessage.OPTResource{})
	query, err := b.Finish()
	if err != nil {
		return nil, r.queryError("EBADQUERY", syscallName, hostname)
	}
	code := "ECONNREFUSED"
	for try := 0; try < tries; try++ {
		for _, server := range servers {
			if parent.Err() != nil {
				return nil, r.queryError("ECANCELLED", syscallName, hostname)
			}
			local := local4
			if ap, err := netip.ParseAddrPort(server); err == nil && ap.Addr().Is6() {
				local = local6
			}
			ctx, done := context.WithTimeout(parent, timeout)
			msg, err := tnDnsExchange(ctx, server, local, query, id)
			timedOut := ctx.Err() == context.DeadlineExceeded
			done()
			if err != nil {
				if parent.Err() != nil {
					return nil, r.queryError("ECANCELLED", syscallName, hostname)
				}
				if timedOut {
					code = "ETIMEOUT"
				}
				continue
			}
			switch msg.RCode {
			case dnsmessage.RCodeSuccess:
			case dnsmessage.RCodeNameError:
				return nil, r.queryError("ENOTFOUND", syscallName, hostname)
			case dnsmessage.RCodeServerFailure:
				code = "ESERVFAIL"
				continue
			case dnsmessage.RCodeRefused:
				code = "EREFUSED"
				continue
			case dnsmessage.RCodeNotImplemented:
				return nil, r.queryError("ENOTIMP", syscallName, hostname)
			default:
				return nil, r.queryError("EFORMERR", syscallName, hostname)
			}
			answers := []dnsmessage.Resource{}
			for _, a := range msg.Answers {
				if qtype == dnsmessage.TypeALL || a.Header.Type == qtype {
					answers = append(answers, a)
				}
			}
			if len(answers) == 0 {
				return nil, r.queryError("ENODATA", syscallName, hostname)
			}
			return answers, nil
		}
	}
	return nil, r.queryError(code, syscallName, hostname)
}

func tnDnsName(n dnsmessage.Name) string {
	return strings.TrimSuffix(n.String(), ".")
}

// <character-string>s and an uncompressed name, for NAPTR and CAA
func tnDnsCharString(data []byte, i *int) string {
	if *i >= len(data) {
		return ""
	}
	n := int(data[*i])
	end := *i + 1 + n
	if end > len(data) {
		end = len(data)
	}
	s := string(data[*i+1 : end])
	*i = end
	return s
}

func tnDnsWireName(data []byte, i int) string {
	labels := []string{}
	for i < len(data) && data[i] != 0 {
		n := int(data[i])
		if i+1+n > len(data) {
			break
		}
		labels = append(labels, string(data[i+1:i+1+n]))
		i += 1 + n
	}
	return strings.Join(labels, ".")
}

func tnNaptrRecord(data []byte) *TnNaptrRecord {
	rec := &TnNaptrRecord{}
	if len(data) < 4 {
		return rec
	}
	rec.order = float64(int(data[0])<<8 | int(data[1]))
	rec.preference = float64(int(data[2])<<8 | int(data[3]))
	i := 4
	rec.flags = tnDnsCharString(data, &i)
	rec.service = tnDnsCharString(data, &i)
	rec.regexp = tnDnsCharString(data, &i)
	rec.replacement = tnDnsWireName(data, i)
	return rec
}

// CAA: { critical, <tag>: value }
func tnCaaRecord(data []byte) *TnMap[string, interface{}] {
	m := TnNewMap[string, interface{}]()
	if len(data) < 2 {
		return m
	}
	m.Set("critical", float64(data[0]))
	n := int(data[1])
	if 2+n > len(data) {
		return m
	}
	m.Set(string(data[2:2+n]), string(data[2+n:]))
	return m
}

func tnSoaRecord(b *dnsmessage.SOAResource) *TnSoaRecord {
	return &TnSoaRecord{
		nsname: tnDnsName(b.NS), hostmaster: tnDnsName(b.MBox), serial: float64(b.Serial),
		refresh: float64(b.Refresh), retry: float64(b.Retry), expire: float64(b.Expire), minttl: float64(b.MinTTL),
	}
}

// resolveAny: each record with its type, in Node's shape
func tnAnyRecord(rr dnsmessage.Resource) interface{} {
	m := TnNewMap[string, interface{}]()
	ttl := float64(rr.Header.TTL)
	switch b := rr.Body.(type) {
	case *dnsmessage.AResource:
		m.Set("address", net.IP(b.A[:]).String())
		m.Set("ttl", ttl)
		m.Set("type", "A")
	case *dnsmessage.AAAAResource:
		m.Set("address", net.IP(b.AAAA[:]).String())
		m.Set("ttl", ttl)
		m.Set("type", "AAAA")
	case *dnsmessage.CNAMEResource:
		m.Set("value", tnDnsName(b.CNAME))
		m.Set("type", "CNAME")
	case *dnsmessage.MXResource:
		m.Set("exchange", tnDnsName(b.MX))
		m.Set("priority", float64(b.Pref))
		m.Set("type", "MX")
	case *dnsmessage.NSResource:
		m.Set("value", tnDnsName(b.NS))
		m.Set("type", "NS")
	case *dnsmessage.PTRResource:
		m.Set("value", tnDnsName(b.PTR))
		m.Set("type", "PTR")
	case *dnsmessage.SOAResource:
		s := tnSoaRecord(b)
		m.Set("nsname", s.nsname)
		m.Set("hostmaster", s.hostmaster)
		m.Set("serial", s.serial)
		m.Set("refresh", s.refresh)
		m.Set("retry", s.retry)
		m.Set("expire", s.expire)
		m.Set("minttl", s.minttl)
		m.Set("type", "SOA")
	case *dnsmessage.TXTResource:
		m.Set("entries", append([]string{}, b.TXT...))
		m.Set("type", "TXT")
	case *dnsmessage.SRVResource:
		m.Set("priority", float64(b.Priority))
		m.Set("weight", float64(b.Weight))
		m.Set("port", float64(b.Port))
		m.Set("name", tnDnsName(b.Target))
		m.Set("type", "SRV")
	case *dnsmessage.UnknownResource:
		switch rr.Header.Type {
		case 35:
			n := tnNaptrRecord(b.Data)
			m.Set("flags", n.flags)
			m.Set("service", n.service)
			m.Set("regexp", n.regexp)
			m.Set("replacement", n.replacement)
			m.Set("order", n.order)
			m.Set("preference", n.preference)
			m.Set("type", "NAPTR")
		case 257:
			caa := tnCaaRecord(b.Data)
			caa.Set("type", "CAA")
			return caa
		default:
			return nil
		}
	default:
		return nil
	}
	return m
}

func (r *TnDnsResolver) resolveAny(hostname string) ([]interface{}, error) {
	answers, err := r.rawQuery(hostname, dnsmessage.TypeALL, "queryAny")
	if err != nil {
		return nil, err
	}
	// grouped by type in Node's order
	out := []interface{}{}
	for _, t := range []dnsmessage.Type{dnsmessage.TypeA, dnsmessage.TypeCNAME, dnsmessage.TypeAAAA, dnsmessage.TypeMX, dnsmessage.TypeNS, dnsmessage.TypeTXT, dnsmessage.TypeSRV, dnsmessage.TypePTR, 35, dnsmessage.TypeSOA, 257} {
		for _, a := range answers {
			if a.Header.Type != t {
				continue
			}
			if rec := tnAnyRecord(a); rec != nil {
				out = append(out, rec)
			}
		}
	}
	return out, nil
}

func (r *TnDnsResolver) resolveCaa(hostname string) ([]interface{}, error) {
	answers, err := r.rawQuery(hostname, dnsmessage.Type(257), "queryCaa")
	if err != nil {
		return nil, err
	}
	out := []interface{}{}
	for _, a := range answers {
		if u, ok := a.Body.(*dnsmessage.UnknownResource); ok {
			out = append(out, tnCaaRecord(u.Data))
		}
	}
	return out, nil
}

func (r *TnDnsResolver) resolveNaptr(hostname string) ([]*TnNaptrRecord, error) {
	answers, err := r.rawQuery(hostname, dnsmessage.Type(35), "queryNaptr")
	if err != nil {
		return nil, err
	}
	out := []*TnNaptrRecord{}
	for _, a := range answers {
		if u, ok := a.Body.(*dnsmessage.UnknownResource); ok {
			out = append(out, tnNaptrRecord(u.Data))
		}
	}
	return out, nil
}

func (r *TnDnsResolver) resolvePtr(hostname string) ([]string, error) {
	answers, err := r.rawQuery(hostname, dnsmessage.TypePTR, "queryPtr")
	if err != nil {
		return nil, err
	}
	out := []string{}
	for _, a := range answers {
		if b, ok := a.Body.(*dnsmessage.PTRResource); ok {
			out = append(out, tnDnsName(b.PTR))
		}
	}
	return out, nil
}

func (r *TnDnsResolver) resolveSoa(hostname string) (*TnSoaRecord, error) {
	answers, err := r.rawQuery(hostname, dnsmessage.TypeSOA, "querySoa")
	if err != nil {
		return nil, err
	}
	for _, a := range answers {
		if b, ok := a.Body.(*dnsmessage.SOAResource); ok {
			return tnSoaRecord(b), nil
		}
	}
	return nil, r.queryError("ENODATA", "querySoa", hostname)
}

// resolve4 / resolve6 with { ttl: true }
func (r *TnDnsResolver) resolveTtl(hostname string, family int) ([]*TnRecordWithTtl, error) {
	qtype, syscallName := dnsmessage.TypeA, "queryA"
	if family == 6 {
		qtype, syscallName = dnsmessage.TypeAAAA, "queryAaaa"
	}
	answers, err := r.rawQuery(hostname, qtype, syscallName)
	if err != nil {
		return nil, err
	}
	out := []*TnRecordWithTtl{}
	for _, a := range answers {
		switch b := a.Body.(type) {
		case *dnsmessage.AResource:
			out = append(out, &TnRecordWithTtl{address: net.IP(b.A[:]).String(), ttl: float64(a.Header.TTL)})
		case *dnsmessage.AAAAResource:
			out = append(out, &TnRecordWithTtl{address: net.IP(b.AAAA[:]).String(), ttl: float64(a.Header.TTL)})
		}
	}
	return out, nil
}

func (r *TnDnsResolver) resolve4Ttl(hostname string) ([]*TnRecordWithTtl, error) {
	return r.resolveTtl(hostname, 4)
}

func (r *TnDnsResolver) resolve6Ttl(hostname string) ([]*TnRecordWithTtl, error) {
	return r.resolveTtl(hostname, 6)
}`;
const RESOLVERS = {
    resolve4: '[]string',
    resolve6: '[]string',
    resolveCname: '[]string',
    resolveMx: '[]*TnMxRecord',
    resolveTxt: '[][]string',
    resolveNs: '[]string',
    resolveSrv: '[]*TnSrvRecord',
    reverse: '[]string',
    resolveAny: '[]interface{}',
    resolveCaa: '[]interface{}',
    resolveNaptr: '[]*TnNaptrRecord',
    resolvePtr: '[]string',
    resolveSoa: '*TnSoaRecord',
    resolve4Ttl: '[]*TnRecordWithTtl',
    resolve6Ttl: '[]*TnRecordWithTtl'
};
// dns.resolve(hostname, rrtype) → the resolve function for the record type
const RRTYPES = {
    A: 'resolve4',
    AAAA: 'resolve6',
    CNAME: 'resolveCname',
    MX: 'resolveMx',
    TXT: 'resolveTxt',
    NS: 'resolveNs',
    SRV: 'resolveSrv',
    PTR: 'resolvePtr',
    ANY: 'resolveAny',
    CAA: 'resolveCaa',
    NAPTR: 'resolveNaptr',
    SOA: 'resolveSoa'
};
// resolve4 / resolve6 with { ttl: true } return { address, ttl } records
function withTtl(fn, nodes) {
    const options = nodes[1];
    if (!options || options.kind !== 'ObjectLiteralExpression')
        return fn;
    const ttl = getOption(options, 'ttl');
    return ttl && ttl.kind === 'TrueKeyword' ? `${fn}Ttl` : fn;
}
function lookupAll(nodes) {
    const options = nodes[1];
    if (!options || options.kind !== 'ObjectLiteralExpression')
        return false;
    const all = getOption(options, 'all');
    return !!all && all.kind === 'TrueKeyword';
}
function rrtypeOf(nodes) {
    const node = nodes[1];
    if (node && node.kind === 'StringLiteral' && RRTYPES[String(node.text)])
        return RRTYPES[String(node.text)];
    return 'resolve4';
}
export function registerDns(r) {
    defineModule(r, 'dns');
    defineModule(r, 'dns/promises');
    r.namespaces['dns.promises'] = 'dns/promises';
    defineHelper(r, 'nodeDns', ['context', 'errors', 'golang.org/x/net/dns/dnsmessage', 'io', 'net', 'net/netip', 'os', 'strconv', 'strings', 'sync', 'sync/atomic', 'time'], ['nodeNet', 'netErrors', 'eventLoop', 'promise', 'nodeInvoke', 'dynamic'], dnsHelper);
    const use = () => r.helper('nodeDns');
    defineClass(r, 'dns.LookupAddress', '*TnLookupAddress', 'class', '', 'address=string; family=float64', '', '');
    defineClass(r, 'dns.MxRecord', '*TnMxRecord', 'class', '', 'exchange=string; priority=float64', '', '');
    defineClass(r, 'dns.SrvRecord', '*TnSrvRecord', 'class', '', 'name=string; port=float64; priority=float64; weight=float64', '', '');
    defineClass(r, 'dns.RecordWithTtl', '*TnRecordWithTtl', 'class', '', 'address=string; ttl=float64', '', '');
    defineClass(r, 'dns.SoaRecord', '*TnSoaRecord', 'class', '', 'nsname=string; hostmaster=string; serial=float64; refresh=float64; retry=float64; expire=float64; minttl=float64', '', '');
    defineClass(r, 'dns.NaptrRecord', '*TnNaptrRecord', 'class', '', 'flags=string; service=string; regexp=string; replacement=string; order=float64; preference=float64', '', '');
    r.functions['dns.lookup'] = (c) => {
        use();
        return `TnDnsLookup(${c.args.join(', ')})`;
    };
    r.paramTypers['dns.lookup'] = (nodes) => (lookupAll(nodes) ? ['*TnError', '[]*TnLookupAddress'] : ['*TnError', 'string', 'float64']);
    r.functions['dns/promises.lookup'] = (c) => {
        use();
        return lookupAll(c.nodes) ? `TnDnsLookupAllPromise(${c.args.join(', ')})` : `TnDnsLookupPromise(${c.args.join(', ')})`;
    };
    r.typers['dns/promises.lookup'] = (c) => (lookupAll(c.nodes) ? 'chan []*TnLookupAddress' : 'chan *TnLookupAddress');
    defineClass(r, 'dns.Resolver', '*TnDnsResolver', 'class', 'cancel=; setLocalAddress=; setServers=; getServers=[]string', '', '', '');
    defineClass(r, 'dns/promises.Resolver', '*TnDnsPromiseResolver', 'class', 'cancel=; setLocalAddress=; setServers=; getServers=[]string', '', '', '');
    r.constructors['dns.Resolver'] = (c) => {
        use();
        return `TnNewDnsResolver(${c.args.join(', ')})`;
    };
    r.constructors['dns/promises.Resolver'] = (c) => {
        use();
        return `TnNewDnsPromiseResolver(${c.args.join(', ')})`;
    };
    // resolveX(hostname, cb) / promises.resolveX(hostname), on the default resolver or a Resolver
    const resolver = (fn, typeFn) => {
        const callback = (recv) => (c) => {
            use();
            const target = typeFn(c.nodes);
            return `TnDnsResolveCb(${recv || c.recv}.${target}, ${c.args[0]}, ${c.args[c.args.length - 1]})`;
        };
        const promise = (recv) => (c) => {
            use();
            const target = typeFn(c.nodes);
            return `TnDnsResolvePromise(${recv || c.recv}.${target}, ${c.args[0]})`;
        };
        const cbTypes = (nodes) => ['*TnError', RESOLVERS[typeFn(nodes)]];
        const promiseType = (c) => `chan ${RESOLVERS[typeFn(c.nodes)]}`;
        r.functions[`dns.${fn}`] = callback('tnDefaultDns');
        r.paramTypers[`dns.${fn}`] = cbTypes;
        r.methods[`dns.Resolver#${fn}`] = callback('');
        r.typers[`dns.Resolver#${fn}`] = (_c) => '';
        r.paramTypers[`dns.Resolver#${fn}`] = cbTypes;
        r.functions[`dns/promises.${fn}`] = promise('tnDefaultDns');
        r.typers[`dns/promises.${fn}`] = promiseType;
        r.methods[`dns/promises.Resolver#${fn}`] = promise('');
        r.typers[`dns/promises.Resolver#${fn}`] = promiseType;
    };
    for (const fn of Object.keys(RESOLVERS)) {
        if (fn.endsWith('Ttl'))
            continue;
        resolver(fn, fn === 'resolve4' || fn === 'resolve6' ? (nodes) => withTtl(fn, nodes) : (_n) => fn);
    }
    resolver('resolve', rrtypeOf);
    defineClass(r, 'dns.LookupServiceResult', '*TnLookupService', 'class', '', 'hostname=string; service=string', '', '');
    r.functions['dns.lookupService'] = (c) => {
        use();
        return `TnDnsLookupService(${c.args.join(', ')})`;
    };
    r.paramTypers['dns.lookupService'] = (_n) => ['*TnError', 'string', 'string'];
    r.functions['dns/promises.lookupService'] = (c) => {
        use();
        return `TnDnsLookupServicePromise(${c.args.join(', ')})`;
    };
    r.results['dns/promises.lookupService'] = 'chan *TnLookupService';
    for (const mod of ['dns', 'dns/promises']) {
        r.functions[`${mod}.getServers`] = (_c) => {
            use();
            return 'tnDefaultDns.getServers()';
        };
        r.results[`${mod}.getServers`] = '[]string';
        r.functions[`${mod}.setServers`] = (c) => {
            use();
            return `tnDefaultDns.setServers(${c.args[0]})`;
        };
        r.results[`${mod}.setServers`] = '';
        r.functions[`${mod}.setDefaultResultOrder`] = (_c) => '_ = 0';
        r.functions[`${mod}.getDefaultResultOrder`] = (_c) => '"verbatim"';
        r.results[`${mod}.getDefaultResultOrder`] = 'string';
    }
}
