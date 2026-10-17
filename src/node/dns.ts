// node:dns (+ dns/promises, dns.promises) — lookups on Go's resolver. Each
// query runs on a goroutine; callbacks run on the event loop, promise forms
// resolve when the answer arrives. Errors carry Node's codes (ENOTFOUND …).

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, getOption } from './registry.js';

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
		ch <- v
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

var tnResolver = net.DefaultResolver

func tnResolveIPs(hostname string, family int) ([]string, error) {
	network := "ip4"
	syscallName := "queryA"
	if family == 6 {
		network, syscallName = "ip6", "queryAaaa"
	}
	ips, err := tnResolver.LookupIP(context.Background(), network, hostname)
	if err != nil {
		return nil, tnDnsError(err, syscallName, hostname)
	}
	out := []string{}
	for _, ip := range ips {
		out = append(out, ip.String())
	}
	return out, nil
}

func TnDnsResolve4(hostname string) ([]string, error) { return tnResolveIPs(hostname, 4) }
func TnDnsResolve6(hostname string) ([]string, error) { return tnResolveIPs(hostname, 6) }

func TnDnsResolveCname(hostname string) ([]string, error) {
	cname, err := tnResolver.LookupCNAME(context.Background(), hostname)
	if err != nil {
		return nil, tnDnsError(err, "queryCname", hostname)
	}
	return []string{strings.TrimSuffix(cname, ".")}, nil
}

func TnDnsResolveMx(hostname string) ([]*TnMxRecord, error) {
	mxs, err := tnResolver.LookupMX(context.Background(), hostname)
	if err != nil {
		return nil, tnDnsError(err, "queryMx", hostname)
	}
	out := []*TnMxRecord{}
	for _, mx := range mxs {
		out = append(out, &TnMxRecord{exchange: strings.TrimSuffix(mx.Host, "."), priority: float64(mx.Pref)})
	}
	return out, nil
}

func TnDnsResolveTxt(hostname string) ([][]string, error) {
	txts, err := tnResolver.LookupTXT(context.Background(), hostname)
	if err != nil {
		return nil, tnDnsError(err, "queryTxt", hostname)
	}
	out := [][]string{}
	for _, t := range txts {
		out = append(out, []string{t})
	}
	return out, nil
}

func TnDnsResolveNs(hostname string) ([]string, error) {
	nss, err := tnResolver.LookupNS(context.Background(), hostname)
	if err != nil {
		return nil, tnDnsError(err, "queryNs", hostname)
	}
	out := []string{}
	for _, ns := range nss {
		out = append(out, strings.TrimSuffix(ns.Host, "."))
	}
	return out, nil
}

func TnDnsResolveSrv(hostname string) ([]*TnSrvRecord, error) {
	_, srvs, err := tnResolver.LookupSRV(context.Background(), "", "", hostname)
	if err != nil {
		return nil, tnDnsError(err, "querySrv", hostname)
	}
	out := []*TnSrvRecord{}
	for _, srv := range srvs {
		out = append(out, &TnSrvRecord{name: strings.TrimSuffix(srv.Target, "."), port: float64(srv.Port), priority: float64(srv.Priority), weight: float64(srv.Weight)})
	}
	return out, nil
}

func TnDnsReverse(ip string) ([]string, error) {
	names, err := tnResolver.LookupAddr(context.Background(), ip)
	if err != nil {
		return nil, tnDnsError(err, "getHostByAddr", ip)
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

const RESOLVERS: Record<string, string> = {
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
const RRTYPES: Record<string, string> = {
  A: 'resolve4',
  AAAA: 'resolve6',
  CNAME: 'resolveCname',
  MX: 'resolveMx',
  TXT: 'resolveTxt',
  NS: 'resolveNs',
  SRV: 'resolveSrv',
  PTR: 'reverse'
};

function goName(fn: string): string {
  return 'TnDns' + fn.charAt(0).toUpperCase() + fn.substring(1);
}

function lookupAll(nodes: any[]): boolean {
  const options = nodes[1];
  if (!options || options.kind !== 'ObjectLiteralExpression') return false;
  const all = getOption(options, 'all');
  return !!all && all.kind === 'TrueKeyword';
}

function rrtypeOf(nodes: any[]): string {
  const node = nodes[1];
  if (node && node.kind === 'StringLiteral' && RRTYPES[String(node.text)]) return RRTYPES[String(node.text)];
  return 'resolve4';
}

export function registerDns(r: NodeRegistry): void {
  defineModule(r, 'dns');
  defineModule(r, 'dns/promises');
  r.namespaces['dns.promises'] = 'dns/promises';
  defineHelper(r, 'nodeDns', ['context', 'net', 'os', 'strings'], ['nodeNet', 'netErrors', 'eventLoop', 'promise', 'nodeInvoke', 'dynamic'], dnsHelper);
  const use = () => r.helper('nodeDns');
  defineClass(r, 'dns.LookupAddress', '*TnLookupAddress', 'class', '', 'address=string; family=float64', '', '');
  defineClass(r, 'dns.MxRecord', '*TnMxRecord', 'class', '', 'exchange=string; priority=float64', '', '');
  defineClass(r, 'dns.SrvRecord', '*TnSrvRecord', 'class', '', 'name=string; port=float64; priority=float64; weight=float64', '', '');

  r.functions['dns.lookup'] = (c: NodeCall) => {
    use();
    return `TnDnsLookup(${c.args.join(', ')})`;
  };
  r.paramTypers['dns.lookup'] = (nodes: any[]) => (lookupAll(nodes) ? ['*TnError', '[]*TnLookupAddress'] : ['*TnError', 'string', 'float64']);
  r.functions['dns/promises.lookup'] = (c: NodeCall) => {
    use();
    return lookupAll(c.nodes) ? `TnDnsLookupAllPromise(${c.args.join(', ')})` : `TnDnsLookupPromise(${c.args.join(', ')})`;
  };
  r.typers['dns/promises.lookup'] = (c: NodeCall) => (lookupAll(c.nodes) ? 'chan []*TnLookupAddress' : 'chan *TnLookupAddress');

  const resolver = (fn: string, typeFn: (nodes: any[]) => string) => {
    const name = fn === 'resolve' ? 'resolve' : fn;
    r.functions[`dns.${name}`] = (c: NodeCall) => {
      use();
      const target = fn === 'resolve' ? rrtypeOf(c.nodes) : fn;
      return `TnDnsResolveCb(${goName(target)}, ${c.args[0]}, ${c.args[c.args.length - 1]})`;
    };
    r.paramTypers[`dns.${name}`] = (nodes: any[]) => ['*TnError', RESOLVERS[typeFn(nodes)]];
    r.functions[`dns/promises.${name}`] = (c: NodeCall) => {
      use();
      const target = fn === 'resolve' ? rrtypeOf(c.nodes) : fn;
      return `TnDnsResolvePromise(${goName(target)}, ${c.args[0]})`;
    };
    r.typers[`dns/promises.${name}`] = (c: NodeCall) => `chan ${RESOLVERS[typeFn(c.nodes)]}`;
  };
  for (const fn of Object.keys(RESOLVERS)) resolver(fn, (_n: any[]) => fn);
  resolver('resolve', rrtypeOf);

  for (const mod of ['dns', 'dns/promises']) {
    r.functions[`${mod}.getServers`] = (_c: NodeCall) => {
      use();
      return 'TnDnsGetServers()';
    };
    r.results[`${mod}.getServers`] = '[]string';
    r.functions[`${mod}.setDefaultResultOrder`] = (_c: NodeCall) => '_ = 0';
    r.functions[`${mod}.getDefaultResultOrder`] = (_c: NodeCall) => '"verbatim"';
    r.results[`${mod}.getDefaultResultOrder`] = 'string';
  }
}
