// node:url + globals URL / URLSearchParams: a WHATWG URL parser (special
// schemes, relative resolution, dot segments, default ports, percent-encode
// sets, IDN hosts via punycode), live searchParams, file URL helpers.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const urlHelper = `// WHATWG URL
type TnURL struct {
	protocol  string // "https:"
	username  string
	password  string
	hostname  string
	port      string
	pathname  string
	search    string // "" or "?…"
	hash      string // "" or "#…"
	authority bool   // has //host
	params    *TnURLSearchParams
}

var tnSpecialSchemes = map[string]string{"http:": "80", "https:": "443", "ws:": "80", "wss:": "443", "ftp:": "21", "file:": ""}

// The leading "scheme:" of s (/^[A-Za-z][A-Za-z0-9+.-]*:/), "" when there is none
func tnURLScheme(s string) string {
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z':
		case i > 0 && (c >= '0' && c <= '9' || c == '+' || c == '.' || c == '-'):
		case i > 0 && c == ':':
			return s[:i+1]
		default:
			return ""
		}
	}
	return ""
}

var tnURLStrip = strings.NewReplacer("\\t", "", "\\n", "", "\\r", "")

func tnInvalidURL(input string) *TnError {
	e := TnNodeError("TypeError", "ERR_INVALID_URL", "Invalid URL")
	e.props["input"] = input
	return e
}

// Percent-encodes the bytes of s that are in the set (C0 controls and non-ASCII always)
func tnPercentEncode(s string, set string) string {
	var sb strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c < 0x20 || c > 0x7E || strings.IndexByte(set, c) >= 0 {
			fmt.Fprintf(&sb, "%%%02X", c)
		} else {
			sb.WriteByte(c)
		}
	}
	return sb.String()
}

const tnFragmentSet = " \\"<>\`"
const tnQuerySet = " \\"#<>"
const tnSpecialQuerySet = " \\"#<>'"
const tnPathSet = " \\"#<>?\`{}"
const tnUserinfoSet = " \\"#<>?\`{}/:;=@[\\\\]^|"

func (u *TnURL) special() bool {
	_, ok := tnSpecialSchemes[u.protocol]
	return ok
}

// RFC 3986 remove_dot_segments on a "/"-separated path
func tnRemoveDotSegments(path string) string {
	segments := strings.Split(path, "/")
	out := []string{}
	for i, seg := range segments {
		last := i == len(segments)-1
		switch strings.ToLower(seg) {
		case ".", "%2e":
			if last {
				out = append(out, "")
			}
		case "..", ".%2e", "%2e.", "%2e%2e":
			if len(out) > 1 {
				out = out[:len(out)-1]
			}
			if last {
				out = append(out, "")
			}
		default:
			out = append(out, seg)
		}
	}
	result := strings.Join(out, "/")
	if strings.HasPrefix(path, "/") && !strings.HasPrefix(result, "/") {
		result = "/" + result
	}
	return result
}

func tnParseHost(host string, special bool) (string, bool) {
	if host == "" {
		return "", !special
	}
	if strings.HasPrefix(host, "[") {
		if !strings.HasSuffix(host, "]") {
			return "", false
		}
		return strings.ToLower(host), true
	}
	if !special {
		return tnPercentEncode(host, ""), true
	}
	if decoded, err := tnurl.PathUnescape(host); err == nil {
		host = decoded
	}
	host = strings.ToLower(host)
	if !tnIsASCII(host) {
		host = TnPunycodeToASCII(host)
	}
	if strings.ContainsAny(host, " #%/:<>?@[\\\\]^|") {
		return "", false
	}
	return host, true
}

func (u *TnURL) setPath(path string) {
	if u.special() {
		path = strings.ReplaceAll(path, "\\\\", "/")
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
	}
	if u.authority || u.special() {
		path = tnRemoveDotSegments(path)
	}
	u.pathname = tnPercentEncode(path, tnPathSet)
}

func (u *TnURL) setSearch(query string, updateParams bool) {
	query = strings.TrimPrefix(query, "?")
	set := tnQuerySet
	if u.special() {
		set = tnSpecialQuerySet
	}
	if query == "" {
		u.search = ""
	} else {
		u.search = "?" + tnPercentEncode(query, set)
	}
	if updateParams && u.params != nil {
		u.params.list = tnParseQuery(strings.TrimPrefix(u.search, "?"))
	}
}

func (u *TnURL) setHash(fragment string) {
	fragment = strings.TrimPrefix(fragment, "#")
	if fragment == "" {
		u.hash = ""
	} else {
		u.hash = "#" + tnPercentEncode(fragment, tnFragmentSet)
	}
}

// Splits "host:port" (IPv6 hosts are bracketed)
func tnSplitHostPort(hostport string) (string, string) {
	if strings.HasPrefix(hostport, "[") {
		if i := strings.Index(hostport, "]"); i >= 0 {
			rest := hostport[i+1:]
			return hostport[:i+1], strings.TrimPrefix(rest, ":")
		}
		return hostport, ""
	}
	if i := strings.LastIndex(hostport, ":"); i >= 0 {
		return hostport[:i], hostport[i+1:]
	}
	return hostport, ""
}

func (u *TnURL) setPort(port string) bool {
	if port == "" {
		u.port = ""
		return true
	}
	for _, c := range port {
		if c < '0' || c > '9' {
			return false
		}
	}
	n, err := strconv.Atoi(port)
	if err != nil || n > 65535 {
		return false
	}
	port = strconv.Itoa(n)
	if def, ok := tnSpecialSchemes[u.protocol]; ok && def == port {
		port = ""
	}
	u.port = port
	return true
}

func (u *TnURL) setAuthority(auth string) bool {
	u.username, u.password = "", ""
	if at := strings.LastIndex(auth, "@"); at >= 0 {
		userinfo := auth[:at]
		auth = auth[at+1:]
		if colon := strings.Index(userinfo, ":"); colon >= 0 {
			u.username = tnPercentEncode(userinfo[:colon], tnUserinfoSet)
			u.password = tnPercentEncode(userinfo[colon+1:], tnUserinfoSet)
		} else {
			u.username = tnPercentEncode(userinfo, tnUserinfoSet)
		}
	}
	host, port := tnSplitHostPort(auth)
	parsed, ok := tnParseHost(host, u.special() && u.protocol != "file:")
	if !ok || !u.setPort(port) {
		return false
	}
	u.hostname = parsed
	if u.protocol == "file:" && u.hostname == "localhost" {
		u.hostname = ""
	}
	return true
}

func tnCopyURL(b *TnURL) *TnURL {
	c := *b
	c.params = nil
	return &c
}

func tnParseURLString(input string, base *TnURL) (*TnURL, bool) {
	input = strings.TrimFunc(input, func(r rune) bool { return r <= 0x20 })
	if strings.ContainsAny(input, "\\t\\n\\r") {
		input = tnURLStrip.Replace(input)
	}
	fragment, hasFragment := "", false
	if i := strings.Index(input, "#"); i >= 0 {
		fragment, hasFragment = input[i+1:], true
		input = input[:i]
	}
	query, hasQuery := "", false
	if i := strings.Index(input, "?"); i >= 0 {
		query, hasQuery = input[i+1:], true
		input = input[:i]
	}
	u := &TnURL{}
	if scheme := tnURLScheme(input); scheme != "" {
		u.protocol = strings.ToLower(scheme)
		rest := input[len(scheme):]
		if u.special() {
			rest = strings.ReplaceAll(rest, "\\\\", "/")
		}
		if base != nil && u.special() && base.protocol == u.protocol && !strings.HasPrefix(rest, "/") {
			// "http:foo" relative to an http: base
			return tnResolveRelative(rest, query, hasQuery, fragment, hasFragment, base)
		}
		if strings.HasPrefix(rest, "//") || (u.special() && u.protocol != "file:") {
			if u.protocol == "file:" || !u.special() {
				rest = rest[2:]
			} else {
				rest = strings.TrimLeft(rest, "/")
			}
			if u.protocol == "file:" || strings.HasPrefix(input[len(scheme):], "//") || u.special() {
				u.authority = true
				end := strings.IndexAny(rest, "/")
				auth := rest
				if end >= 0 {
					auth, rest = rest[:end], rest[end:]
				} else {
					rest = ""
				}
				if u.protocol == "file:" && len(auth) == 2 && auth[1] == ':' {
					// file://C:/x — the drive letter is part of the path
					rest = "/" + auth + rest
					auth = ""
				}
				if !u.setAuthority(auth) {
					return nil, false
				}
				if u.special() && u.protocol != "file:" && u.hostname == "" {
					return nil, false
				}
			}
		} else if u.protocol == "file:" {
			u.authority = true
		}
		u.setPath(rest)
	} else {
		if base == nil {
			return nil, false
		}
		return tnResolveRelative(input, query, hasQuery, fragment, hasFragment, base)
	}
	if hasQuery {
		u.setSearch(query, false)
	}
	if hasFragment {
		u.setHash(fragment)
	}
	return u, true
}

func tnResolveRelative(input string, query string, hasQuery bool, fragment string, hasFragment bool, base *TnURL) (*TnURL, bool) {
	u := tnCopyURL(base)
	if u.special() {
		input = strings.ReplaceAll(input, "\\\\", "/")
	}
	switch {
	case strings.HasPrefix(input, "//"):
		rest := input[2:]
		end := strings.Index(rest, "/")
		auth := rest
		if end >= 0 {
			auth, rest = rest[:end], rest[end:]
		} else {
			rest = "/"
		}
		u.authority = true
		if !u.setAuthority(auth) {
			return nil, false
		}
		u.setPath(rest)
		u.search, u.hash = "", ""
	case strings.HasPrefix(input, "/"):
		u.setPath(input)
		u.search, u.hash = "", ""
	case input == "":
		u.hash = ""
		if hasQuery {
			u.search = ""
		}
	default:
		dir := u.pathname
		if i := strings.LastIndex(dir, "/"); i >= 0 {
			dir = dir[:i+1]
		} else {
			dir = "/"
		}
		u.setPath(dir + input)
		u.search, u.hash = "", ""
	}
	if hasQuery {
		u.setSearch(query, false)
	}
	if hasFragment {
		u.setHash(fragment)
	}
	return u, true
}

func tnURLBase(base []interface{}) (*TnURL, bool, string) {
	if len(base) == 0 || base[0] == nil {
		return nil, true, ""
	}
	switch b := base[0].(type) {
	case *TnURL:
		return b, true, ""
	case string:
		parsed, ok := tnParseURLString(b, nil)
		return parsed, ok, b
	}
	s := fmt.Sprint(base[0])
	parsed, ok := tnParseURLString(s, nil)
	return parsed, ok, s
}

func tnURLInput(input interface{}) string {
	if u, ok := input.(*TnURL); ok {
		return u.Get_href()
	}
	if s, ok := input.(string); ok {
		return s
	}
	return fmt.Sprint(input)
}

// new URL(input, base?)
func TnNewURL(input interface{}, base ...interface{}) *TnURL {
	text := tnURLInput(input)
	b, ok, baseText := tnURLBase(base)
	if !ok {
		panic(tnInvalidURL(baseText))
	}
	u, ok := tnParseURLString(text, b)
	if !ok {
		panic(tnInvalidURL(text))
	}
	return u
}

// URL.parse(input, base?): null instead of throwing
func TnParseURL(input interface{}, base ...interface{}) *TnURL {
	b, ok, _ := tnURLBase(base)
	if !ok {
		return nil
	}
	u, ok := tnParseURLString(tnURLInput(input), b)
	if !ok {
		return nil
	}
	return u
}

func TnCanParseURL(input interface{}, base ...interface{}) bool {
	return TnParseURL(input, base...) != nil
}

func (u *TnURL) Get_protocol() string { return u.protocol }
func (u *TnURL) Get_username() string { return u.username }
func (u *TnURL) Get_password() string { return u.password }
func (u *TnURL) Get_hostname() string { return u.hostname }
func (u *TnURL) Get_port() string     { return u.port }
func (u *TnURL) Get_pathname() string { return u.pathname }
func (u *TnURL) Get_search() string   { return u.search }
func (u *TnURL) Get_hash() string     { return u.hash }

func (u *TnURL) Get_host() string {
	if u.port != "" {
		return u.hostname + ":" + u.port
	}
	return u.hostname
}

func (u *TnURL) Get_origin() string {
	if u.special() && u.protocol != "file:" {
		return u.protocol + "//" + u.Get_host()
	}
	return "null"
}

func (u *TnURL) Get_href() string {
	var sb strings.Builder
	sb.WriteString(u.protocol)
	if u.authority {
		sb.WriteString("//")
		if u.username != "" || u.password != "" {
			sb.WriteString(u.username)
			if u.password != "" {
				sb.WriteString(":" + u.password)
			}
			sb.WriteString("@")
		}
		sb.WriteString(u.Get_host())
	}
	sb.WriteString(u.pathname)
	sb.WriteString(u.search)
	sb.WriteString(u.hash)
	return sb.String()
}

func (u *TnURL) Get_searchParams() *TnURLSearchParams {
	if u.params == nil {
		u.params = &TnURLSearchParams{list: tnParseQuery(strings.TrimPrefix(u.search, "?")), url: u}
	}
	return u.params
}

func (u *TnURL) Set_href(v string) {
	parsed, ok := tnParseURLString(v, nil)
	if !ok {
		panic(tnInvalidURL(v))
	}
	params := u.params
	*u = *parsed
	u.params = params
	if params != nil {
		params.list = tnParseQuery(strings.TrimPrefix(u.search, "?"))
	}
}

func (u *TnURL) Set_protocol(v string) {
	v = strings.ToLower(strings.TrimSuffix(v, ":")) + ":"
	if tnURLScheme(v) == "" {
		return
	}
	_, toSpecial := tnSpecialSchemes[v]
	if toSpecial != u.special() {
		return
	}
	u.protocol = v
	if def, ok := tnSpecialSchemes[v]; ok && def == u.port {
		u.port = ""
	}
}

func (u *TnURL) Set_username(v string) { u.username = tnPercentEncode(v, tnUserinfoSet) }
func (u *TnURL) Set_password(v string) { u.password = tnPercentEncode(v, tnUserinfoSet) }

func (u *TnURL) Set_host(v string) {
	host, port := tnSplitHostPort(v)
	if parsed, ok := tnParseHost(host, u.special() && u.protocol != "file:"); ok && parsed != "" {
		u.hostname = parsed
		if port != "" {
			u.setPort(port)
		}
	}
}

func (u *TnURL) Set_hostname(v string) {
	if parsed, ok := tnParseHost(v, u.special() && u.protocol != "file:"); ok && parsed != "" {
		u.hostname = parsed
	}
}

func (u *TnURL) Set_port(v string) {
	digits := v
	end := 0
	for end < len(digits) && digits[end] >= '0' && digits[end] <= '9' {
		end++
	}
	if v == "" || end > 0 {
		u.setPort(digits[:end])
	}
}

func (u *TnURL) Set_pathname(v string) { u.setPath(v) }
func (u *TnURL) Set_search(v string)   { u.setSearch(v, true) }
func (u *TnURL) Set_hash(v string)     { u.setHash(v) }

func (u *TnURL) toString() string { return u.Get_href() }
func (u *TnURL) toJSON() string   { return u.Get_href() }
func (u *TnURL) String() string   { return u.Get_href() }

// URLSearchParams: ordered name/value pairs; when owned by a URL, changes
// rewrite its search
type TnURLSearchParams struct {
	list [][2]string
	url  *TnURL
}

// application/x-www-form-urlencoded decoding: + is a space, bad escapes stay
func tnFormDecode(s string) string {
	s = strings.ReplaceAll(s, "+", " ")
	if !strings.Contains(s, "%") {
		return s
	}
	var out []byte
	for i := 0; i < len(s); i++ {
		if s[i] == '%' && i+2 < len(s) {
			if b, err := hex.DecodeString(s[i+1 : i+3]); err == nil {
				out = append(out, b[0])
				i += 2
				continue
			}
		}
		out = append(out, s[i])
	}
	return string(out)
}

func tnFormEncode(s string) string {
	var sb strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c == ' ':
			sb.WriteByte('+')
		case (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '*' || c == '-' || c == '.' || c == '_':
			sb.WriteByte(c)
		default:
			fmt.Fprintf(&sb, "%%%02X", c)
		}
	}
	return sb.String()
}

func tnParseQuery(query string) [][2]string {
	list := [][2]string{}
	for _, part := range strings.Split(query, "&") {
		if part == "" {
			continue
		}
		name, value := part, ""
		if i := strings.Index(part, "="); i >= 0 {
			name, value = part[:i], part[i+1:]
		}
		list = append(list, [2]string{tnFormDecode(name), tnFormDecode(value)})
	}
	return list
}

func tnStringOfValue(v interface{}) string {
	switch x := v.(type) {
	case string:
		return x
	case float64:
		return TnNumStr(x)
	case nil:
		return "undefined"
	}
	return fmt.Sprint(v)
}

// new URLSearchParams(init): a query string, a record / object, pairs or another instance
func TnNewURLSearchParams(init ...interface{}) *TnURLSearchParams {
	p := &TnURLSearchParams{list: [][2]string{}}
	if len(init) == 0 || init[0] == nil {
		return p
	}
	switch x := init[0].(type) {
	case string:
		p.list = tnParseQuery(strings.TrimPrefix(x, "?"))
		return p
	case *TnURLSearchParams:
		p.list = append([][2]string{}, x.list...)
		return p
	case [][]string:
		for _, pair := range x {
			if len(pair) != 2 {
				panic(TnNodeError("TypeError", "ERR_INVALID_TUPLE", "Each query pair must be an iterable [name, value] tuple"))
			}
			p.list = append(p.list, [2]string{pair[0], pair[1]})
		}
		return p
	case map[string]interface{}:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			p.list = append(p.list, [2]string{k, tnStringOfValue(x[k])})
		}
		return p
	}
	if withEntries, ok := init[0].(interface{ Entries() [][]interface{} }); ok {
		for _, e := range withEntries.Entries() {
			p.list = append(p.list, [2]string{tnStringOfValue(e[0]), tnStringOfValue(e[1])})
		}
		return p
	}
	rv := reflect.ValueOf(init[0])
	if rv.Kind() == reflect.Slice {
		for i := 0; i < rv.Len(); i++ {
			pair := reflect.ValueOf(rv.Index(i).Interface())
			if pair.Kind() == reflect.Slice && pair.Len() == 2 {
				p.list = append(p.list, [2]string{tnStringOfValue(pair.Index(0).Interface()), tnStringOfValue(pair.Index(1).Interface())})
			}
		}
		return p
	}
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		sv := rv.Elem()
		for i := 0; i < sv.NumField(); i++ {
			f := sv.Field(i)
			value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
			p.list = append(p.list, [2]string{strings.TrimSuffix(sv.Type().Field(i).Name, "_"), tnStringOfValue(value)})
		}
	}
	return p
}

func (p *TnURLSearchParams) update() {
	if p.url != nil {
		s := p.toString()
		if s == "" {
			p.url.search = ""
		} else {
			p.url.search = "?" + s
		}
	}
}

func (p *TnURLSearchParams) append(name string, value interface{}) {
	p.list = append(p.list, [2]string{name, tnStringOfValue(value)})
	p.update()
}

func (p *TnURLSearchParams) set(name string, value interface{}) {
	v := tnStringOfValue(value)
	out := [][2]string{}
	found := false
	for _, pair := range p.list {
		if pair[0] == name {
			if !found {
				out = append(out, [2]string{name, v})
				found = true
			}
			continue
		}
		out = append(out, pair)
	}
	if !found {
		out = append(out, [2]string{name, v})
	}
	p.list = out
	p.update()
}

func (p *TnURLSearchParams) delete(name string, value ...interface{}) {
	out := [][2]string{}
	for _, pair := range p.list {
		if pair[0] == name && (len(value) == 0 || value[0] == nil || tnStringOfValue(value[0]) == pair[1]) {
			continue
		}
		out = append(out, pair)
	}
	p.list = out
	p.update()
}

func (p *TnURLSearchParams) get(name string) *string {
	for _, pair := range p.list {
		if pair[0] == name {
			v := pair[1]
			return &v
		}
	}
	return nil
}

func (p *TnURLSearchParams) getAll(name string) []string {
	out := []string{}
	for _, pair := range p.list {
		if pair[0] == name {
			out = append(out, pair[1])
		}
	}
	return out
}

func (p *TnURLSearchParams) has(name string, value ...interface{}) bool {
	for _, pair := range p.list {
		if pair[0] == name && (len(value) == 0 || value[0] == nil || tnStringOfValue(value[0]) == pair[1]) {
			return true
		}
	}
	return false
}

func (p *TnURLSearchParams) sort() {
	sort.SliceStable(p.list, func(i, j int) bool {
		return utf16Less(p.list[i][0], p.list[j][0])
	})
	p.update()
}

// Code-unit order, as JS sorts strings
func utf16Less(a string, b string) bool {
	ua, ub := utf16.Encode([]rune(a)), utf16.Encode([]rune(b))
	for i := 0; i < len(ua) && i < len(ub); i++ {
		if ua[i] != ub[i] {
			return ua[i] < ub[i]
		}
	}
	return len(ua) < len(ub)
}

func (p *TnURLSearchParams) toString() string {
	parts := make([]string, len(p.list))
	for i, pair := range p.list {
		parts[i] = tnFormEncode(pair[0]) + "=" + tnFormEncode(pair[1])
	}
	return strings.Join(parts, "&")
}

func (p *TnURLSearchParams) String() string { return p.toString() }

func (p *TnURLSearchParams) Get_size() float64 { return float64(len(p.list)) }

func (p *TnURLSearchParams) keys() []string {
	out := make([]string, len(p.list))
	for i, pair := range p.list {
		out[i] = pair[0]
	}
	return out
}

func (p *TnURLSearchParams) values() []string {
	out := make([]string, len(p.list))
	for i, pair := range p.list {
		out[i] = pair[1]
	}
	return out
}

func (p *TnURLSearchParams) entries() [][]string {
	out := make([][]string, len(p.list))
	for i, pair := range p.list {
		out[i] = []string{pair[0], pair[1]}
	}
	return out
}

// forEach((value, key, params) => …)
func (p *TnURLSearchParams) forEach(fn interface{}) {
	for _, pair := range append([][2]string{}, p.list...) {
		TnInvoke(fn, pair[1], pair[0], p)
	}
}

// url.fileURLToPath(string | URL)
func TnFileURLToPath(input interface{}) string {
	u, ok := tnParseURLString(tnURLInput(input), nil)
	if !ok || u.protocol != "file:" {
		panic(TnNodeError("TypeError", "ERR_INVALID_URL_SCHEME", "The URL must be of scheme file"))
	}
	path, err := tnurl.PathUnescape(u.pathname)
	if err != nil {
		path = u.pathname
	}
	if runtime.GOOS == "windows" {
		if len(path) >= 3 && path[0] == '/' && path[2] == ':' {
			path = path[1:]
		} else if u.hostname != "" {
			path = "//" + u.hostname + path
		}
		return filepath.FromSlash(path)
	}
	return path
}

func TnPathToFileURLObject(path string) *TnURL {
	u, _ := tnParseURLString(TnPathToFileURL(path), nil)
	return u
}

func TnDomainToASCII(domain string) string {
	host, ok := tnParseHost(domain, true)
	if !ok {
		return ""
	}
	return host
}

func TnDomainToUnicode(domain string) string {
	return TnPunycodeToUnicode(strings.ToLower(domain))
}`;

export function registerUrl(r: NodeRegistry): void {
  defineModule(r, 'url');
  defineHelper(
    r,
    'nodeUrl',
    ['encoding/hex', 'fmt', 'net/url', 'path/filepath', 'reflect', 'runtime', 'sort', 'strconv', 'strings', 'unicode/utf16', 'unsafe'],
    ['error', 'dynamic', 'punycode', 'pathToFileURL', 'nodeInvoke'],
    urlHelper
  );
  defineClass(
    r,
    'url.URL',
    '*TnURL',
    'class',
    'toString=string; toJSON=string',
    '',
    'href=string; protocol=string; username=string; password=string; host=string; hostname=string; port=string; pathname=string; search=string; hash=string; origin=string; searchParams=*TnURLSearchParams',
    'href; protocol; username; password; host; hostname; port; pathname; search; hash'
  );
  defineClass(
    r,
    'url.URLSearchParams',
    '*TnURLSearchParams',
    'class',
    'append=; set=; delete=; get=*string; getAll=[]string; has=bool; sort=; toString=string; keys=[]string; values=[]string; entries=[][]string; forEach=',
    '',
    'size=float64',
    ''
  );
  r.iterators['*TnURLSearchParams'] = 'entries';
  r.paramTypers['url.URLSearchParams#forEach'] = (_n: any[]) => ['string', 'string', '*TnURLSearchParams'];
  r.globals['URL'] = 'url.URL';
  r.globals['URLSearchParams'] = 'url.URLSearchParams';
  const use = () => r.helper('nodeUrl');
  r.constructors['url.URL'] = (call: NodeCall) => {
    use();
    return `TnNewURL(${call.args.join(', ')})`;
  };
  r.constructors['url.URLSearchParams'] = (call: NodeCall) => {
    use();
    return `TnNewURLSearchParams(${call.args.join(', ')})`;
  };
  r.functions['url.URL.canParse'] = (call: NodeCall) => {
    use();
    return `TnCanParseURL(${call.args.join(', ')})`;
  };
  r.functions['url.URL.parse'] = (call: NodeCall) => {
    use();
    return `TnParseURL(${call.args.join(', ')})`;
  };
  r.results['url.URL.canParse'] = 'bool';
  r.results['url.URL.parse'] = '*TnURL';

  r.functions['url.fileURLToPath'] = (call: NodeCall) => {
    use();
    return `TnFileURLToPath(${call.args[0]})`;
  };
  r.functions['url.pathToFileURL'] = (call: NodeCall) => {
    use();
    return `TnPathToFileURLObject(${call.args[0]})`;
  };
  r.functions['url.format'] = (call: NodeCall) => {
    use();
    if (call.types[0] === '*TnURL') return `${call.args[0]}.Get_href()`;
    return `tnURLInput(${call.args[0]})`;
  };
  r.functions['url.domainToASCII'] = (call: NodeCall) => {
    use();
    return `TnDomainToASCII(${call.args[0]})`;
  };
  r.functions['url.domainToUnicode'] = (call: NodeCall) => {
    use();
    return `TnDomainToUnicode(${call.args[0]})`;
  };
  setResults(r, 'url', 'fileURLToPath=string; pathToFileURL=*TnURL; format=string; domainToASCII=string; domainToUnicode=string');
}
