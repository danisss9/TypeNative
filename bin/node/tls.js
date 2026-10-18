// node:tls — TLS servers and clients: net sockets over crypto/tls. Handshakes
// run on the dial / accept goroutines; certificates are verified like Node
// (rejectUnauthorized, ca, Node's error codes: DEPTH_ZERO_SELF_SIGNED_CERT,
// ERR_TLS_CERT_ALTNAME_INVALID …). Also used by https.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { SOCKET_METHODS, SOCKET_GETTERS, SERVER_METHODS, socketListenerTypes } from './net.js';
const tlsConfigHelper = `// TLS configuration from Node options (key / cert / ca as PEM strings or Buffers)
func tnPemValue(v interface{}) interface{} {
	switch x := v.(type) {
	case []byte:
		return string(x)
	case []interface{}:
		out := []string{}
		for _, item := range x {
			if b, ok := item.([]byte); ok {
				out = append(out, string(b))
			} else {
				out = append(out, TnJSString(item))
			}
		}
		return out
	case [][]byte:
		out := []string{}
		for _, b := range x {
			out = append(out, string(b))
		}
		return out
	}
	return v
}

func tnPemStrings(v interface{}) []string {
	switch x := tnPemValue(v).(type) {
	case string:
		if x == "" {
			return nil
		}
		return []string{x}
	case []string:
		return x
	}
	return nil
}

func tnPemString(v interface{}) string {
	return strings.Join(tnPemStrings(v), "\\n")
}

func tnCertPool(pems []string) *x509.CertPool {
	if len(pems) == 0 {
		return nil
	}
	pool := x509.NewCertPool()
	for _, pem := range pems {
		pool.AppendCertsFromPEM([]byte(pem))
	}
	return pool
}

func tnKeyPair(options interface{}) ([]tls.Certificate, error) {
	key, cert := tnPemString(TnGet(options, "key")), tnPemString(TnGet(options, "cert"))
	if key == "" && cert == "" {
		return nil, nil
	}
	pair, err := tls.X509KeyPair([]byte(cert), []byte(key))
	if err != nil {
		return nil, TnNodeError("Error", "ERR_OSSL_PEM_NO_START_LINE", err.Error())
	}
	return []tls.Certificate{pair}, nil
}

func tnTLSVersion(name string) uint16 {
	switch name {
	case "TLSv1":
		return tls.VersionTLS10
	case "TLSv1.1":
		return tls.VersionTLS11
	case "TLSv1.2":
		return tls.VersionTLS12
	case "TLSv1.3":
		return tls.VersionTLS13
	}
	return 0
}

func tnTLSVersionName(v uint16) string {
	switch v {
	case tls.VersionTLS10:
		return "TLSv1"
	case tls.VersionTLS11:
		return "TLSv1.1"
	case tls.VersionTLS12:
		return "TLSv1.2"
	case tls.VersionTLS13:
		return "TLSv1.3"
	}
	return "unknown"
}

func tnALPN(options interface{}) []string {
	return tnHeaderStringsTLS(TnGet(options, "ALPNProtocols"))
}

func tnHeaderStringsTLS(v interface{}) []string {
	switch x := v.(type) {
	case nil:
		return nil
	case string:
		return []string{x}
	case []string:
		return x
	case []interface{}:
		out := []string{}
		for _, item := range x {
			out = append(out, TnJSString(item))
		}
		return out
	}
	return nil
}

// Server options: key / cert / ca / requestCert / rejectUnauthorized / ALPNProtocols / min/maxVersion
func tnTLSServerConfig(options interface{}) (*tls.Config, error) {
	cfg := &tls.Config{}
	if options == nil {
		return cfg, nil
	}
	certs, err := tnKeyPair(options)
	if err != nil {
		return nil, err
	}
	cfg.Certificates = certs
	cfg.ClientCAs = tnCertPool(tnPemStrings(TnGet(options, "ca")))
	if b, ok := TnGet(options, "requestCert").(bool); ok && b {
		cfg.ClientAuth = tls.RequestClientCert
		if r, ok := TnGet(options, "rejectUnauthorized").(bool); (!ok || r) && cfg.ClientCAs != nil {
			cfg.ClientAuth = tls.RequireAndVerifyClientCert
		}
	}
	cfg.NextProtos = tnALPN(options)
	if v := tnTLSVersion(tnNetString(TnGet(options, "minVersion"))); v != 0 {
		cfg.MinVersion = v
	}
	if v := tnTLSVersion(tnNetString(TnGet(options, "maxVersion"))); v != 0 {
		cfg.MaxVersion = v
	}
	return cfg, nil
}

// Node's verification result for a peer chain: nil when authorized
func tnVerifyPeer(certs []*x509.Certificate, roots *x509.CertPool, host string) *TnError {
	if len(certs) == 0 {
		return TnNodeError("Error", "UNABLE_TO_GET_ISSUER_CERT", "unable to get issuer certificate")
	}
	leaf := certs[0]
	intermediates := x509.NewCertPool()
	for _, c := range certs[1:] {
		intermediates.AddCert(c)
	}
	_, err := leaf.Verify(x509.VerifyOptions{Roots: roots, Intermediates: intermediates})
	if err != nil {
		var unknown x509.UnknownAuthorityError
		var invalid x509.CertificateInvalidError
		switch {
		case errors.As(err, &invalid) && invalid.Reason == x509.Expired:
			if time.Now().Before(leaf.NotBefore) {
				return TnNodeError("Error", "CERT_NOT_YET_VALID", "certificate is not yet valid")
			}
			return TnNodeError("Error", "CERT_HAS_EXPIRED", "certificate has expired")
		// macOS's platform verifier (nil roots) reports an untrusted chain as a
		// plain error, not UnknownAuthorityError
		case errors.As(err, &unknown) || roots == nil:
			if len(certs) == 1 && bytes.Equal(leaf.RawIssuer, leaf.RawSubject) {
				return TnNodeError("Error", "DEPTH_ZERO_SELF_SIGNED_CERT", "self-signed certificate")
			}
			if bytes.Equal(certs[len(certs)-1].RawIssuer, certs[len(certs)-1].RawSubject) {
				return TnNodeError("Error", "SELF_SIGNED_CERT_IN_CHAIN", "self-signed certificate in certificate chain")
			}
			return TnNodeError("Error", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "unable to get local issuer certificate")
		}
		return TnNodeError("Error", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "unable to verify the first certificate")
	}
	if host != "" {
		if err := leaf.VerifyHostname(host); err != nil {
			names := []string{}
			for _, d := range leaf.DNSNames {
				names = append(names, "DNS:"+d)
			}
			for _, ip := range leaf.IPAddresses {
				names = append(names, "IP Address:"+ip.String())
			}
			reason := "Host: " + host + ". is not in the cert's altnames: " + strings.Join(names, ", ")
			if net.ParseIP(host) != nil {
				reason = "IP: " + host + " is not in the cert's list: " + strings.Join(names, ", ")
			}
			e := TnNodeError("Error", "ERR_TLS_CERT_ALTNAME_INVALID", "Hostname/IP does not match certificate's altnames: "+reason)
			e.props["reason"] = reason
			e.props["host"] = host
			return e
		}
	}
	return nil
}

// Certificate details (getPeerCertificate)
type TnPeerCertificate struct {
	subject        *TnMap[string, string]
	issuer         *TnMap[string, string]
	subjectaltname string
	valid_from     string
	valid_to       string
	fingerprint    string
	fingerprint256 string
	fingerprint512 string
	serialNumber   string
	ca             bool
	raw            []byte
}


func tnCertName(name pkix.Name) *TnMap[string, string] {
	m := TnNewMap[string, string]()
	add := func(key string, values []string) {
		if len(values) > 0 {
			m.Set(key, strings.Join(values, "\\n"))
		}
	}
	add("C", name.Country)
	add("ST", name.Province)
	add("L", name.Locality)
	add("O", name.Organization)
	add("OU", name.OrganizationalUnit)
	if name.CommonName != "" {
		m.Set("CN", name.CommonName)
	}
	return m
}

func tnFingerprint(sum []byte) string {
	parts := make([]string, len(sum))
	for i, b := range sum {
		parts[i] = fmt.Sprintf("%02X", b)
	}
	return strings.Join(parts, ":")
}

// OpenSSL's date format: Oct 17 18:51:57 2026 GMT
func tnCertDate(t time.Time) string {
	return t.UTC().Format("Jan _2 15:04:05 2006 GMT")
}

func tnPeerCertificate(c *x509.Certificate) *TnPeerCertificate {
	if c == nil {
		return &TnPeerCertificate{subject: TnNewMap[string, string](), issuer: TnNewMap[string, string]()}
	}
	alt := []string{}
	for _, d := range c.DNSNames {
		alt = append(alt, "DNS:"+d)
	}
	for _, ip := range c.IPAddresses {
		alt = append(alt, "IP Address:"+ip.String())
	}
	sha1sum := sha1.Sum(c.Raw)
	sha256sum := sha256.Sum256(c.Raw)
	sha512sum := sha512.Sum512(c.Raw)
	return &TnPeerCertificate{
		subject:        tnCertName(c.Subject),
		issuer:         tnCertName(c.Issuer),
		subjectaltname: strings.Join(alt, ", "),
		valid_from:     tnCertDate(c.NotBefore),
		valid_to:       tnCertDate(c.NotAfter),
		fingerprint:    tnFingerprint(sha1sum[:]),
		fingerprint256: tnFingerprint(sha256sum[:]),
		fingerprint512: tnFingerprint(sha512sum[:]),
		serialNumber:   strings.ToUpper(c.SerialNumber.Text(16)),
		ca:             c.IsCA,
		raw:            c.Raw,
	}
}

// tls.checkServerIdentity(hostname, cert): Node's matching of DNS / IP altnames
// (one leftmost wildcard label) and, without DNS altnames, the subject CN
func tnHostParts(host string) []string {
	return strings.Split(strings.ToLower(host), ".")
}

func tnHostMatches(hostParts []string, pattern string) bool {
	if pattern == "" {
		return false
	}
	patternParts := tnHostParts(pattern)
	if len(hostParts) != len(patternParts) {
		return false
	}
	for _, part := range patternParts {
		if part == "" {
			return false
		}
		for _, r := range part {
			if r < 0x21 || r > 0x7f {
				return false
			}
		}
	}
	for i := len(hostParts) - 1; i > 0; i-- {
		if hostParts[i] != patternParts[i] {
			return false
		}
	}
	host, pat := hostParts[0], patternParts[0]
	pieces := strings.SplitN(pat, "*", 3)
	if len(pieces) == 1 || strings.Contains(pat, "xn--") {
		return host == pat
	}
	if len(pieces) > 2 || len(patternParts) <= 2 {
		return false
	}
	prefix, suffix := pieces[0], pieces[1]
	return len(prefix)+len(suffix) <= len(host) && strings.HasPrefix(host, prefix) && strings.HasSuffix(host, suffix)
}

func tnCanonicalIP(s string) string {
	if ip := net.ParseIP(strings.TrimSpace(s)); ip != nil {
		return ip.String()
	}
	return s
}

func TnCheckServerIdentity(hostname string, cert interface{}) *TnError {
	var altNames string
	var cns []string
	if pc, ok := cert.(*TnPeerCertificate); ok {
		altNames = pc.subjectaltname
		if pc.subject != nil && pc.subject.Has("CN") {
			cns = []string{pc.subject.Get("CN")}
		}
	} else {
		altNames = tnNetString(TnGet(cert, "subjectaltname"))
		subject := TnGet(cert, "subject")
		switch cn := TnGet(subject, "CN").(type) {
		case string:
			cns = []string{cn}
		case []interface{}:
			for _, c := range cn {
				cns = append(cns, tnNetString(c))
			}
		case []string:
			cns = cn
		}
	}
	dnsNames := []string{}
	ips := []string{}
	if altNames != "" {
		for _, name := range strings.Split(altNames, ", ") {
			if strings.HasPrefix(name, "DNS:") {
				dnsNames = append(dnsNames, name[4:])
			} else if strings.HasPrefix(name, "IP Address:") {
				ips = append(ips, tnCanonicalIP(name[11:]))
			}
		}
	}
	host := strings.TrimSuffix(hostname, ".")
	valid := false
	reason := "Unknown reason"
	if net.ParseIP(host) != nil {
		for _, ip := range ips {
			if ip == tnCanonicalIP(host) {
				valid = true
			}
		}
		if !valid {
			reason = "IP: " + host + " is not in the cert's list: " + strings.Join(ips, ", ")
		}
	} else if len(dnsNames) > 0 || len(cns) > 0 {
		parts := tnHostParts(host)
		if len(dnsNames) > 0 {
			for _, name := range dnsNames {
				if tnHostMatches(parts, name) {
					valid = true
				}
			}
			if !valid {
				reason = "Host: " + host + ". is not in the cert's altnames: " + altNames
			}
		} else {
			for _, cn := range cns {
				if tnHostMatches(parts, cn) {
					valid = true
				}
			}
			if !valid {
				reason = "Host: " + host + ". is not cert's CN: " + strings.Join(cns, ",")
			}
		}
	} else {
		reason = "Cert does not contain a DNS name"
	}
	if valid {
		return nil
	}
	e := TnNodeError("Error", "ERR_TLS_CERT_ALTNAME_INVALID", "Hostname/IP does not match certificate's altnames: "+reason)
	e.props["reason"] = reason
	e.props["host"] = host
	e.props["cert"] = cert
	return e
}

// Client options: servername / rejectUnauthorized / ca / key / cert / ALPNProtocols / min/maxVersion.
// verified receives the result of Node's verification ('' when authorized)
func tnTLSClientConfig(options interface{}, host string, verified func(err *TnError)) (*tls.Config, error) {
	cfg := &tls.Config{InsecureSkipVerify: true}
	reject := true
	servername := host
	var roots *x509.CertPool
	if options != nil {
		certs, err := tnKeyPair(options)
		if err != nil {
			return nil, err
		}
		cfg.Certificates = certs
		roots = tnCertPool(tnPemStrings(TnGet(options, "ca")))
		if b, ok := TnGet(options, "rejectUnauthorized").(bool); ok {
			reject = b
		}
		if sn := tnNetString(TnGet(options, "servername")); sn != "" {
			servername = sn
		}
		cfg.NextProtos = tnALPN(options)
		if v := tnTLSVersion(tnNetString(TnGet(options, "minVersion"))); v != 0 {
			cfg.MinVersion = v
		}
		if v := tnTLSVersion(tnNetString(TnGet(options, "maxVersion"))); v != 0 {
			cfg.MaxVersion = v
		}
	}
	if net.ParseIP(servername) == nil {
		cfg.ServerName = servername
	}
	// options.checkServerIdentity(servername, cert) replaces the hostname check; it runs on the loop
	check := TnGet(options, "checkServerIdentity")
	cfg.VerifyConnection = func(state tls.ConnectionState) error {
		var err *TnError
		if check == nil || TnIsNil(check) {
			err = tnVerifyPeer(state.PeerCertificates, roots, servername)
		} else if err = tnVerifyPeer(state.PeerCertificates, roots, ""); err == nil {
			cert := tnPeerCertificate(state.PeerCertificates[0])
			TnLoopCall(func() {
				if e, ok := TnInvoke(check, servername, cert).(*TnError); ok && e != nil {
					err = e
				}
			})
		}
		if verified != nil {
			verified(err)
		}
		if err != nil && reject {
			return err
		}
		return nil
	}
	return cfg, nil
}

// The *TnError inside a wrapped Go error (verification failures through net/http)
func tnUnwrapTnError(err error) *TnError {
	var te *TnError
	if errors.As(err, &te) {
		return te
	}
	return nil
}`;
const tlsHelper = `// node:tls
type TnCipherInfo struct {
	name         string
	standardName string
	version      string
}

func (s *TnSocket) tlsConnState() *tls.ConnectionState {
	if tc, ok := s.conn.(*tls.Conn); ok {
		state := tc.ConnectionState()
		return &state
	}
	return nil
}

func (s *TnSocket) getPeerCertificate(detailed ...bool) *TnPeerCertificate {
	state := s.tlsConnState()
	if state == nil || len(state.PeerCertificates) == 0 {
		return tnPeerCertificate(nil)
	}
	return tnPeerCertificate(state.PeerCertificates[0])
}

func (s *TnSocket) getCertificate() *TnPeerCertificate {
	state := s.tlsConnState()
	if tc, ok := s.conn.(*tls.Conn); ok && state != nil {
		_ = tc
	}
	if s.tlsState != nil {
		if cert, ok := s.tlsState.(*x509.Certificate); ok {
			return tnPeerCertificate(cert)
		}
	}
	return tnPeerCertificate(nil)
}

func (s *TnSocket) getProtocol() interface{} {
	if state := s.tlsConnState(); state != nil {
		return tnTLSVersionName(state.Version)
	}
	return nil
}

func (s *TnSocket) getCipher() *TnCipherInfo {
	state := s.tlsConnState()
	if state == nil {
		return &TnCipherInfo{}
	}
	name := tls.CipherSuiteName(state.CipherSuite)
	return &TnCipherInfo{name: name, standardName: name, version: tnTLSVersionName(state.Version)}
}

func (s *TnSocket) Get_alpnProtocol() interface{} { return s.alpnProtocol }
func (s *TnSocket) Get_servername() interface{}   { return s.servername }

func tnTLSAfterHandshake(s *TnSocket) {
	s.encrypted = true
	if state := s.tlsConnState(); state != nil {
		s.alpnProtocol = false
		if state.NegotiatedProtocol != "" {
			s.alpnProtocol = state.NegotiatedProtocol
		}
		if state.ServerName != "" {
			s.servername = state.ServerName
		}
	}
}

// tls.connect(port, host?, options?, cb?) / connect(options, cb?)
func TnTLSConnect(args ...interface{}) *TnSocket {
	var options interface{}
	host := "localhost"
	var cb interface{}
	rest := []interface{}{}
	for i, a := range args {
		if tnIsFunc(a) {
			cb = a
			continue
		}
		if tnIsOptions(a) {
			if options == nil {
				options = a
			}
			if i == 0 {
				rest = append(rest, a)
			}
			continue
		}
		if s, ok := a.(string); ok && i > 0 {
			host = s
		}
		rest = append(rest, a)
	}
	if options != nil {
		if h := tnNetString(TnGet(options, "host")); h != "" {
			host = h
		}
	}
	s := TnNewSocket(options)
	var verifyErr *TnError
	cfg, err := tnTLSClientConfig(options, host, func(e *TnError) { verifyErr = e })
	if err != nil {
		e := err
		TnLoopPost(func() { s.destroy(e) })
		return s
	}
	s.dialWrap = func(conn net.Conn) (net.Conn, error) {
		tc := tls.Client(conn, cfg)
		if err := tc.HandshakeContext(context.Background()); err != nil {
			if te := tnUnwrapTnError(err); te != nil {
				return nil, te
			}
			return nil, TnNodeError("Error", "ECONNRESET", "Client network socket disconnected before secure TLS connection was established")
		}
		return tc, nil
	}
	s.afterConnect = func(s *TnSocket) {
		tnTLSAfterHandshake(s)
		s.authorized = verifyErr == nil
		if verifyErr != nil {
			s.authorizationError = verifyErr.code
		}
		s.emit("secureConnect")
	}
	if cb != nil {
		s.TnEventEmitter.once("secureConnect", cb)
	}
	return s.connect(rest...)
}

// tls.createServer(options, secureConnectionListener)
func TnTLSCreateServer(args ...interface{}) *TnNetServer {
	var options interface{}
	srv := TnNewNetServer()
	srv.connectionEvent = "secureConnection"
	for _, a := range args {
		if tnIsFunc(a) {
			srv.on("secureConnection", a)
		} else if a != nil {
			options = a
		}
	}
	cfg, err := tnTLSServerConfig(options)
	if err != nil {
		panic(err)
	}
	requestCert := false
	if options != nil {
		requestCert, _ = TnGet(options, "requestCert").(bool)
	}
	srv.wrapConn = func(conn net.Conn) (net.Conn, error) {
		tc := tls.Server(conn, cfg)
		ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
		defer cancel()
		if err := tc.HandshakeContext(ctx); err != nil {
			return nil, TnNodeError("Error", "ECONNRESET", err.Error())
		}
		return tc, nil
	}
	srv.onSocket = func(s *TnSocket) {
		tnTLSAfterHandshake(s)
		if state := s.tlsConnState(); state != nil && requestCert {
			if len(state.PeerCertificates) > 0 {
				err := tnVerifyPeer(state.PeerCertificates, cfg.ClientCAs, "")
				s.authorized = err == nil
				if err != nil {
					s.authorizationError = err.code
				}
			} else {
				s.authorizationError = "UNABLE_TO_GET_ISSUER_CERT"
			}
		}
	}
	return srv
}

type TnSecureContext struct {
	options interface{}
}

func TnCreateSecureContext(options ...interface{}) *TnSecureContext {
	ctx := &TnSecureContext{}
	if len(options) > 0 {
		ctx.options = options[0]
		if _, err := tnKeyPair(options[0]); err != nil {
			panic(err)
		}
	}
	return ctx
}

func TnTLSGetCiphers() []string {
	out := []string{}
	for _, c := range tls.CipherSuites() {
		out = append(out, strings.ToLower(c.Name))
	}
	return out
}`;
export function registerTls(r) {
    defineModule(r, 'tls');
    defineHelper(r, 'tlsConfig', ['bytes', 'crypto/sha1', 'crypto/sha256', 'crypto/sha512', 'crypto/tls', 'crypto/x509', 'crypto/x509/pkix', 'errors', 'fmt', 'net', 'strings', 'time'], ['dynamic', 'nodeNet', 'netErrors', 'orderedMap', 'eventLoop', 'nodeInvoke'], tlsConfigHelper);
    defineHelper(r, 'nodeTls', ['context', 'crypto/tls', 'crypto/x509', 'net', 'strings', 'time'], ['tlsConfig', 'nodeNet', 'orderedMap'], tlsHelper);
    const use = () => r.helper('nodeTls');
    defineClass(r, 'tls.TLSSocket', '*TnSocket', 'class', SOCKET_METHODS + '; getPeerCertificate=*TnPeerCertificate; getCertificate=*TnPeerCertificate; getProtocol=interface{}; getCipher=*TnCipherInfo', '', SOCKET_GETTERS + '; alpnProtocol=interface{}; servername=interface{}', '');
    // net.Socket instances share the Go type; TLS methods are available on both
    const netSocket = r.classes['net.Socket'];
    if (netSocket) {
        r.classes['net.Socket'] = r.classes['tls.TLSSocket'];
        r.classByGoType['*TnSocket'] = 'net.Socket';
    }
    defineClass(r, 'tls.Server', '*TnNetServer', 'class', SERVER_METHODS, '', 'listening=bool; maxConnections=float64', 'maxConnections');
    r.classByGoType['*TnNetServer'] = 'net.Server';
    defineClass(r, 'tls.PeerCertificate', '*TnPeerCertificate', 'class', '', 'subject=*TnMap[string, string]; issuer=*TnMap[string, string]; subjectaltname=string; valid_from=string; valid_to=string; fingerprint=string; fingerprint256=string; fingerprint512=string; serialNumber=string; ca=bool; raw=[]byte', '', '');
    defineClass(r, 'tls.CipherNameAndProtocol', '*TnCipherInfo', 'class', '', 'name=string; standardName=string; version=string', '', '');
    defineClass(r, 'tls.SecureContext', '*TnSecureContext', 'class', '', 'options=interface{}', '', '');
    r.paramTypers['tls.TLSSocket#on'] = socketListenerTypes;
    r.paramTypers['tls.TLSSocket#once'] = socketListenerTypes;
    r.paramTypers['tls.Server#on'] = r.paramTypers['net.Server#on'];
    r.paramTypers['tls.Server#once'] = r.paramTypers['net.Server#once'];
    r.functions['tls.connect'] = (c) => {
        use();
        return `TnTLSConnect(${c.args.join(', ')})`;
    };
    r.paramTypers['tls.connect'] = (_n) => [];
    r.functions['tls.createServer'] = (c) => {
        use();
        return `TnTLSCreateServer(${c.args.join(', ')})`;
    };
    r.paramTypers['tls.createServer'] = (_n) => ['*TnSocket'];
    r.functions['tls.createSecureContext'] = (c) => {
        use();
        return `TnCreateSecureContext(${c.args.join(', ')})`;
    };
    r.functions['tls.checkServerIdentity'] = (c) => {
        use();
        return `TnCheckServerIdentity(${c.args.join(', ')})`;
    };
    r.results['tls.checkServerIdentity'] = '*TnError';
    r.functions['tls.getCiphers'] = (_c) => {
        use();
        return 'TnTLSGetCiphers()';
    };
    setResults(r, 'tls', 'connect=*TnSocket; createServer=*TnNetServer; createSecureContext=*TnSecureContext; getCiphers=[]string');
    r.values['tls.DEFAULT_MIN_VERSION'] = (_c) => '"TLSv1.2"';
    r.values['tls.DEFAULT_MAX_VERSION'] = (_c) => '"TLSv1.3"';
    r.values['tls.DEFAULT_ECDH_CURVE'] = (_c) => '"auto"';
    r.valueTypes['tls.DEFAULT_MIN_VERSION'] = 'string';
    r.valueTypes['tls.DEFAULT_MAX_VERSION'] = 'string';
    r.valueTypes['tls.DEFAULT_ECDH_CURVE'] = 'string';
}
