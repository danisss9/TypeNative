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
}`;
const RESOLVERS = {
    resolve4: '[]string',
    resolve6: '[]string',
    resolveCname: '[]string',
    resolveMx: '[]*TnMxRecord',
    resolveTxt: '[][]string',
    resolveNs: '[]string',
    resolveSrv: '[]*TnSrvRecord',
    reverse: '[]string'
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
    PTR: 'reverse'
};
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
    defineHelper(r, 'nodeDns', ['context', 'net', 'net/netip', 'os', 'strconv', 'strings', 'sync', 'sync/atomic', 'time'], ['nodeNet', 'netErrors', 'eventLoop', 'promise', 'nodeInvoke', 'dynamic'], dnsHelper);
    const use = () => r.helper('nodeDns');
    defineClass(r, 'dns.LookupAddress', '*TnLookupAddress', 'class', '', 'address=string; family=float64', '', '');
    defineClass(r, 'dns.MxRecord', '*TnMxRecord', 'class', '', 'exchange=string; priority=float64', '', '');
    defineClass(r, 'dns.SrvRecord', '*TnSrvRecord', 'class', '', 'name=string; port=float64; priority=float64; weight=float64', '', '');
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
            const target = fn === 'resolve' ? rrtypeOf(c.nodes) : fn;
            return `TnDnsResolveCb(${recv || c.recv}.${target}, ${c.args[0]}, ${c.args[c.args.length - 1]})`;
        };
        const promise = (recv) => (c) => {
            use();
            const target = fn === 'resolve' ? rrtypeOf(c.nodes) : fn;
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
    for (const fn of Object.keys(RESOLVERS))
        resolver(fn, (_n) => fn);
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
