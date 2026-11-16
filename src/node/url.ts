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
	need := false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c < 0x20 || c > 0x7E || strings.IndexByte(set, c) >= 0 {
			need = true
			break
		}
	}
	if !need {
		return s
	}
	var sb strings.Builder
	sb.Grow(len(s) + 8)
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
	if strings.IndexByte(path, '.') < 0 && strings.IndexByte(path, '%') < 0 {
		return path
	}
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
	if !tnPunyIsASCII(host) {
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
	if len(input) > 0 && (input[0] <= 0x20 || input[len(input)-1] <= 0x20) {
		input = strings.TrimFunc(input, func(r rune) bool { return r <= 0x20 })
	}
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

var tnURLBaseCache sync.Map

func tnURLBase(base []interface{}) (*TnURL, bool, string) {
	if len(base) == 0 || base[0] == nil {
		return nil, true, ""
	}
	switch b := base[0].(type) {
	case *TnURL:
		return b, true, ""
	case string:
		if cached, ok := tnURLBaseCache.Load(b); ok {
			return cached.(*TnURL), true, b
		}
		parsed, ok := tnParseURLString(b, nil)
		if ok && len(b) <= 128 {
			tnURLBaseCache.Store(b, parsed)
		}
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

const legacyUrlHelper = `// Legacy url.parse / url.resolve (deprecated in Node, kept for old code):
// a Url object whose missing parts are null
type TnLegacyUrl struct {
	protocol interface{}
	slashes  interface{}
	auth     interface{}
	host     interface{}
	port     interface{}
	hostname interface{}
	hash     interface{}
	search   interface{}
	query    interface{}
	pathname interface{}
	path     interface{}
	href     string
}

var tnSlashedProtocols = map[string]bool{"http:": true, "https:": true, "ftp:": true, "gopher:": true, "file:": true, "ws:": true, "wss:": true}

var tnLegacyProtocol = regexp.MustCompile("^([a-zA-Z0-9.+-]+:)")

func TnUrlParse(input string, parseQueryString bool, slashesDenoteHost bool) *TnLegacyUrl {
	u := &TnLegacyUrl{}
	rest := strings.TrimSpace(input)
	if i := strings.Index(rest, "#"); i >= 0 {
		u.hash = rest[i:]
		rest = rest[:i]
	}
	search := ""
	if i := strings.Index(rest, "?"); i >= 0 {
		search = rest[i:]
		rest = rest[:i]
		u.search = search
		if parseQueryString {
			u.query = TnQueryParse(search[1:])
		} else {
			u.query = search[1:]
		}
	} else if parseQueryString {
		u.search = ""
		u.query = TnQueryParse("")
	}
	proto := ""
	if m := tnLegacyProtocol.FindString(rest); m != "" {
		proto = strings.ToLower(m)
		u.protocol = proto
		rest = rest[len(m):]
	}
	slashed := false
	if strings.HasPrefix(rest, "//") && (proto != "" || slashesDenoteHost) && proto != "javascript:" {
		slashed = true
		u.slashes = true
		rest = rest[2:]
		end := len(rest)
		for _, c := range []string{"/", "?", "#"} {
			if i := strings.Index(rest, c); i >= 0 && i < end {
				end = i
			}
		}
		hostPart := rest[:end]
		rest = rest[end:]
		if i := strings.LastIndex(hostPart, "@"); i >= 0 {
			auth, _ := tnurl.PathUnescape(hostPart[:i])
			u.auth = auth
			hostPart = hostPart[i+1:]
		}
		hostPart = strings.ToLower(hostPart)
		u.host = hostPart
		hostname := hostPart
		if i := strings.LastIndex(hostPart, ":"); i >= 0 && !strings.HasSuffix(hostPart, "]") {
			if port := hostPart[i+1:]; port != "" {
				u.port = port
			}
			hostname = hostPart[:i]
		}
		u.hostname = strings.Trim(hostname, "[]")
	}
	if rest != "" {
		u.pathname = rest
	} else if slashed && tnSlashedProtocols[proto] {
		u.pathname = "/"
	}
	if p, ok := u.pathname.(string); ok {
		u.path = p + search
	} else if search != "" {
		u.path = search
	}
	u.href = TnUrlFormatLegacy(u)
	return u
}

func TnUrlFormatLegacy(u *TnLegacyUrl) string {
	var b strings.Builder
	str := func(v interface{}) string {
		s, _ := v.(string)
		return s
	}
	b.WriteString(str(u.protocol))
	if u.slashes == true || (u.host != nil && tnSlashedProtocols[str(u.protocol)]) {
		b.WriteString("//")
	}
	if a := str(u.auth); a != "" {
		b.WriteString(a + "@")
	}
	b.WriteString(str(u.host))
	b.WriteString(str(u.pathname))
	b.WriteString(str(u.search))
	b.WriteString(str(u.hash))
	return b.String()
}

func (u *TnLegacyUrl) toString() string { return u.href }

// url.resolve(from, to): to resolved against from, as a browser resolves a link
func TnUrlResolve(from string, to string) string {
	base, err := tnurl.Parse(from)
	if err != nil {
		return to
	}
	ref, err := tnurl.Parse(to)
	if err != nil {
		return to
	}
	return base.ResolveReference(ref).String()
}`;

const urlPatternHelper = `// URLPattern (the URL Pattern Standard): pattern components compiled to
// anchored Go regexps; exec fills the groups of each component
type TnURLPatternComponentResult struct {
	input  string
	groups *TnMap[string, *string]
}

type TnURLPatternExecResult struct {
	inputs   []interface{}
	protocol *TnURLPatternComponentResult
	username *TnURLPatternComponentResult
	password *TnURLPatternComponentResult
	hostname *TnURLPatternComponentResult
	port     *TnURLPatternComponentResult
	pathname *TnURLPatternComponentResult
	search   *TnURLPatternComponentResult
	hash     *TnURLPatternComponentResult
}

type TnURLPattern struct {
	protocol        string
	username        string
	password        string
	hostname        string
	port            string
	pathname        string
	search          string
	hash            string
	hasRegExpGroups bool
	ignoreCase      bool
	reProtocol      *regexp.Regexp
	reUsername      *regexp.Regexp
	rePassword      *regexp.Regexp
	reHostname      *regexp.Regexp
	rePort          *regexp.Regexp
	rePathname      *regexp.Regexp
	reSearch        *regexp.Regexp
	reHash          *regexp.Regexp
}

func tnURLPatternError(message string) *TnError {
	return TnNodeError("TypeError", "ERR_INVALID_URL_PATTERN", message)
}

// The regexp source of a pattern component: :name / :name(regexp) / (regexp)
// groups, * wildcards, ? + * modifiers, \\-escaped literals
func tnURLPatternSource(pattern string, component string) (string, bool) {
	var b strings.Builder
	hasRegexp := false
	group := 0
	parts := []string{}
	kinds := []byte{}
	appendLiteral := func(text string) {
		if text == "" {
			return
		}
		if n := len(parts); n > 0 && kinds[n-1] == 'l' {
			parts[n-1] += text
		} else {
			parts = append(parts, text)
			kinds = append(kinds, 'l')
		}
	}
	appendGroup := func(name string, source string, custom bool, mod byte) {
		if custom {
			hasRegexp = true
		}
		prefix := ""
		// (pathname :x? / :x*: the segment separator is optional with the group)
		if component == "pathname" && (mod == '?' || mod == '*') && len(parts) > 0 && kinds[len(parts)-1] == 'l' && strings.HasSuffix(parts[len(parts)-1], "/") {
			parts[len(parts)-1] = strings.TrimSuffix(parts[len(parts)-1], "/")
			if parts[len(parts)-1] == "" {
				parts = parts[:len(parts)-1]
				kinds = kinds[:len(kinds)-1]
			}
			prefix = "/"
		}
		body := source
		if name != "" {
			body = "(?P<" + name + ">" + source + ")"
		} else {
			body = "(" + source + ")"
			group++
		}
		if prefix != "" {
			body = "(?:" + prefix + body + ")"
		}
		if mod != 0 {
			body += string(mod)
		}
		parts = append(parts, body)
		kinds = append(kinds, 'g')
	}
	balanced := func(i int) (string, int, bool) {
		depth := 0
		start := i
		for i < len(pattern) {
			switch pattern[i] {
			case '(':
				depth++
			case ')':
				depth--
				if depth == 0 {
					return pattern[start+1 : i], i + 1, true
				}
			case '\\\\':
				i++
			}
			i++
		}
		return "", i, false
	}
	defaultSource := ".*"
	if component == "pathname" {
		defaultSource = "[^/]+?"
	} else if component == "hostname" {
		defaultSource = "[^.]+?"
	} else {
		defaultSource = ".+?"
	}
	modifierAt := func(i int) (byte, int) {
		if i < len(pattern) && (pattern[i] == '?' || pattern[i] == '+' || pattern[i] == '*') {
			return pattern[i], i + 1
		}
		return 0, i
	}
	i := 0
	for i < len(pattern) {
		c := pattern[i]
		if c == '\\\\' && i+1 < len(pattern) {
			appendLiteral(regexp.QuoteMeta(pattern[i+1 : i+2]))
			i += 2
			continue
		}
		if c == '*' {
			mod, next := modifierAt(i + 1)
			name := strconv.Itoa(group)
			group++
			appendGroup(name, ".*", false, mod)
			i = next
			continue
		}
		if c == ':' {
			start := i + 1
			i = start
			for i < len(pattern) && (pattern[i] == '_' || pattern[i] == '$' || pattern[i] >= 'a' && pattern[i] <= 'z' || pattern[i] >= 'A' && pattern[i] <= 'Z' || pattern[i] >= '0' && pattern[i] <= '9') {
				i++
			}
			if i == start {
				appendLiteral(regexp.QuoteMeta(":"))
				continue
			}
			name := pattern[start:i]
			source := defaultSource
			custom := false
			if i < len(pattern) && pattern[i] == '(' {
				if inner, next, ok := balanced(i); ok {
					source = inner
					custom = true
					i = next
				}
			}
			mod, next := modifierAt(i)
			appendGroup(name, source, custom, mod)
			i = next
			continue
		}
		if c == '(' {
			if inner, next, ok := balanced(i); ok {
				hasRegexp = true
				mod, after := modifierAt(next)
				appendGroup("", inner, false, mod)
				i = after
				continue
			}
		}
		start := i
		for i < len(pattern) && pattern[i] != '*' && pattern[i] != ':' && pattern[i] != '(' && pattern[i] != '\\\\' {
			i++
		}
		appendLiteral(regexp.QuoteMeta(pattern[start:i]))
	}
	for _, part := range parts {
		b.WriteString(part)
	}
	return b.String(), hasRegexp
}

func tnURLPatternCompile(pattern string, component string, ignoreCase bool) (*regexp.Regexp, bool) {
	source, hasRegexp := tnURLPatternSource(pattern, component)
	if ignoreCase {
		source = "(?i)" + source
	}
	re, err := regexp.Compile("^" + source + "$")
	if err != nil {
		panic(tnURLPatternError("Invalid pattern"))
	}
	return re, hasRegexp
}

func tnURLPatternComponent(init interface{}, key string, fallback string) string {
	value := TnGet(init, key)
	if value == nil {
		return fallback
	}
	s, ok := value.(string)
	if !ok {
		return fallback
	}
	return s
}

func tnURLPatternCanonical(value string, component string) string {
	switch component {
	case "protocol":
		return strings.ToLower(strings.TrimSuffix(value, ":"))
	case "search":
		return strings.TrimPrefix(value, "?")
	case "hash":
		return strings.TrimPrefix(value, "#")
	case "hostname":
		return strings.ToLower(value)
	}
	return value
}

func tnURLPatternSet(p *TnURLPattern, component string, value string) {
	switch component {
	case "protocol":
		p.protocol = value
	case "username":
		p.username = value
	case "password":
		p.password = value
	case "hostname":
		p.hostname = value
	case "port":
		p.port = value
	case "pathname":
		p.pathname = value
	case "search":
		p.search = value
	case "hash":
		p.hash = value
	}
}

func (p *TnURLPattern) tnCompile() {
	var hasRegexp bool
	p.reProtocol, hasRegexp = tnURLPatternCompile(p.protocol, "protocol", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.reUsername, hasRegexp = tnURLPatternCompile(p.username, "username", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.rePassword, hasRegexp = tnURLPatternCompile(p.password, "password", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.reHostname, hasRegexp = tnURLPatternCompile(p.hostname, "hostname", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.rePort, hasRegexp = tnURLPatternCompile(p.port, "port", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.rePathname, hasRegexp = tnURLPatternCompile(p.pathname, "pathname", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.reSearch, hasRegexp = tnURLPatternCompile(p.search, "search", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
	p.reHash, hasRegexp = tnURLPatternCompile(p.hash, "hash", p.ignoreCase)
	p.hasRegExpGroups = p.hasRegExpGroups || hasRegexp
}

func TnNewURLPattern(args ...interface{}) *TnURLPattern {
	p := &TnURLPattern{ignoreCase: false}
	components := []string{"protocol", "username", "password", "hostname", "port", "pathname", "search", "hash"}
	for _, component := range components {
		tnURLPatternSet(p, component, "*")
	}
	var input interface{}
	var base interface{}
	var options interface{}
	if len(args) > 0 {
		input = args[0]
	}
	if len(args) > 1 {
		switch args[1].(type) {
		case string, *TnURL:
			base = args[1]
		default:
			options = args[1]
		}
	}
	if len(args) > 2 {
		options = args[2]
	}
	if options != nil {
		if flag, ok := TnGet(options, "ignoreCase").(bool); ok {
			p.ignoreCase = flag
		}
	}
	// (the init object's baseURL, or the second constructor argument)
	baseValue := ""
	if input != nil {
		if s, ok := TnGet(input, "baseURL").(string); ok {
			baseValue = s
		}
	}
	var baseURL *TnURL
	if base != nil {
		baseURL = TnNewURL(base)
	}
	switch value := input.(type) {
	case nil:
		// (all components stay wildcards)
	case string:
		var parsed *TnURL
		var ok bool
		if base != nil {
			parsed = TnNewURL(value, base)
			ok = true
		} else {
			parsed, ok = tnParseURLString(value, nil)
		}
		if !ok || parsed == nil || parsed.protocol == "" {
			panic(tnURLPatternError("Invalid URL pattern"))
		}
		tnURLPatternSet(p, "protocol", strings.TrimSuffix(parsed.protocol, ":"))
		if parsed.username != "" {
			tnURLPatternSet(p, "username", parsed.username)
		}
		if parsed.password != "" {
			tnURLPatternSet(p, "password", parsed.password)
		}
		tnURLPatternSet(p, "hostname", parsed.hostname)
		tnURLPatternSet(p, "port", parsed.port)
		tnURLPatternSet(p, "pathname", parsed.pathname)
		if parsed.search != "" {
			tnURLPatternSet(p, "search", strings.TrimPrefix(parsed.search, "?"))
		}
		if parsed.hash != "" {
			tnURLPatternSet(p, "hash", strings.TrimPrefix(parsed.hash, "#"))
		}
	case *TnURL:
		tnURLPatternSet(p, "protocol", strings.TrimSuffix(value.protocol, ":"))
		if value.username != "" {
			tnURLPatternSet(p, "username", value.username)
		}
		if value.password != "" {
			tnURLPatternSet(p, "password", value.password)
		}
		tnURLPatternSet(p, "hostname", value.hostname)
		tnURLPatternSet(p, "port", value.port)
		tnURLPatternSet(p, "pathname", value.pathname)
		if value.search != "" {
			tnURLPatternSet(p, "search", strings.TrimPrefix(value.search, "?"))
		}
		if value.hash != "" {
			tnURLPatternSet(p, "hash", strings.TrimPrefix(value.hash, "#"))
		}
	default:
		if baseValue != "" && baseURL == nil {
			baseURL = TnNewURL(baseValue)
		}
		bases := map[string]string{"protocol": "*", "username": "*", "password": "*", "hostname": "*", "port": "*", "pathname": "*", "search": "*", "hash": "*"}
		if baseURL != nil {
			bases["protocol"] = strings.TrimSuffix(baseURL.protocol, ":")
			bases["hostname"] = baseURL.hostname
			bases["port"] = baseURL.port
			bases["pathname"] = baseURL.pathname
		}
		for _, component := range components {
			tnURLPatternSet(p, component, tnURLPatternCanonical(tnURLPatternComponent(input, component, bases[component]), component))
		}
	}
	// (canonicalize string and URL inputs too: a pattern's own syntax stays)
	for _, component := range components {
		value := ""
		switch component {
		case "protocol":
			value = p.protocol
		case "username":
			value = p.username
		case "password":
			value = p.password
		case "hostname":
			value = p.hostname
		case "port":
			value = p.port
		case "pathname":
			value = p.pathname
		case "search":
			value = p.search
		case "hash":
			value = p.hash
		}
		if component == "hostname" {
			tnURLPatternSet(p, component, strings.ToLower(value))
		}
	}
	p.tnCompile()
	return p
}

func tnURLPatternGroups(re *regexp.Regexp, input string) *TnMap[string, *string] {
	groups := TnNewMap[string, *string]()
	match := re.FindStringSubmatchIndex(input)
	if match == nil {
		return groups
	}
	names := re.SubexpNames()
	for i := 1; i < len(names); i++ {
		name := names[i]
		if name == "" {
			name = strconv.Itoa(i - 1)
		}
		start, end := match[2*i], match[2*i+1]
		if start < 0 {
			groups.Set(name, nil)
			continue
		}
		value := input[start:end]
		groups.Set(name, &value)
	}
	return groups
}

func (p *TnURLPattern) tnComponent(re *regexp.Regexp, input string) *TnURLPatternComponentResult {
	return &TnURLPatternComponentResult{input: input, groups: tnURLPatternGroups(re, input)}
}

func (p *TnURLPattern) exec(args ...interface{}) *TnURLPatternExecResult {
	if len(args) == 0 || args[0] == nil {
		return nil
	}
	var base interface{}
	if len(args) > 1 {
		base = args[1]
	}
	protocol, username, password := "", "", ""
	hostname, port, pathname, search, hash := "", "", "", "", ""
	switch value := args[0].(type) {
	case string:
		var parsed *TnURL
		if base != nil {
			parsed = TnNewURL(value, base)
		} else if u, ok := tnParseURLString(value, nil); ok {
			parsed = u
		}
		if parsed != nil {
			protocol = strings.TrimSuffix(parsed.protocol, ":")
			username, password = parsed.username, parsed.password
			hostname, port, pathname = parsed.hostname, parsed.port, parsed.pathname
			search, hash = strings.TrimPrefix(parsed.search, "?"), strings.TrimPrefix(parsed.hash, "#")
		} else {
			pathname = value
		}
	case *TnURL:
		protocol = strings.TrimSuffix(value.protocol, ":")
		username, password = value.username, value.password
		hostname, port, pathname = value.hostname, value.port, value.pathname
		search, hash = strings.TrimPrefix(value.search, "?"), strings.TrimPrefix(value.hash, "#")
	default:
		protocol = tnURLPatternComponent(value, "protocol", "")
		username = tnURLPatternComponent(value, "username", "")
		password = tnURLPatternComponent(value, "password", "")
		hostname = tnURLPatternComponent(value, "hostname", "")
		port = tnURLPatternComponent(value, "port", "")
		pathname = tnURLPatternComponent(value, "pathname", "")
		search = tnURLPatternComponent(value, "search", "")
		hash = tnURLPatternComponent(value, "hash", "")
	}
	if !p.reProtocol.MatchString(protocol) || !p.reUsername.MatchString(username) || !p.rePassword.MatchString(password) ||
		!p.reHostname.MatchString(hostname) || !p.rePort.MatchString(port) || !p.rePathname.MatchString(pathname) ||
		!p.reSearch.MatchString(search) || !p.reHash.MatchString(hash) {
		return nil
	}
	return &TnURLPatternExecResult{
		inputs:   []interface{}{args[0]},
		protocol: p.tnComponent(p.reProtocol, protocol),
		username: p.tnComponent(p.reUsername, username),
		password: p.tnComponent(p.rePassword, password),
		hostname: p.tnComponent(p.reHostname, hostname),
		port:     p.tnComponent(p.rePort, port),
		pathname: p.tnComponent(p.rePathname, pathname),
		search:   p.tnComponent(p.reSearch, search),
		hash:     p.tnComponent(p.reHash, hash),
	}
}

func (p *TnURLPattern) test(args ...interface{}) bool {
	return p.exec(args...) != nil
}`;

export function registerUrl(r: NodeRegistry): void {
  defineModule(r, 'url');
  defineHelper(
    r,
    'nodeUrl',
    ['encoding/hex', 'fmt', 'net/url', 'path/filepath', 'reflect', 'runtime', 'sort', 'strconv', 'strings', 'sync', 'unicode/utf16', 'unsafe'],
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

  // URLPattern (a global and a node:url export)
  defineHelper(r, 'nodeURLPattern', ['regexp', 'strconv', 'strings'], ['nodeUrl', 'error', 'dynamic'], urlPatternHelper);
  const patternClass = {
    key: 'url.URLPattern',
    goType: '*TnURLPattern',
    category: 'class',
    methods: { test: 'bool', exec: '*TnURLPatternExecResult' },
    props: {
      protocol: 'string',
      username: 'string',
      password: 'string',
      hostname: 'string',
      port: 'string',
      pathname: 'string',
      search: 'string',
      hash: 'string',
      hasRegExpGroups: 'bool'
    },
    getters: {},
    setters: {}
  };
  r.classes['url.URLPattern'] = patternClass;
  r.classByGoType['*TnURLPattern'] = 'url.URLPattern';
  defineClass(
    r,
    'url.URLPatternResult',
    '*TnURLPatternExecResult',
    'class',
    '',
    'inputs=[]interface{}; protocol=*TnURLPatternComponentResult; username=*TnURLPatternComponentResult; password=*TnURLPatternComponentResult; hostname=*TnURLPatternComponentResult; port=*TnURLPatternComponentResult; pathname=*TnURLPatternComponentResult; search=*TnURLPatternComponentResult; hash=*TnURLPatternComponentResult',
    '',
    ''
  );
  defineClass(
    r,
    'url.URLPatternComponentResult',
    '*TnURLPatternComponentResult',
    'class',
    '',
    'input=string; groups=*TnMap[string, *string]',
    '',
    ''
  );
  r.globals['URLPattern'] = 'url.URLPattern';
  r.globals['URLPatternResult'] = 'url.URLPatternResult';
  r.globals['URLPatternComponentResult'] = 'url.URLPatternComponentResult';
  r.constructors['url.URLPattern'] = (call: NodeCall) => {
    r.helper('nodeURLPattern');
    return `TnNewURLPattern(${call.args.join(', ')})`;
  };
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

  // legacy url.parse / url.resolve
  defineHelper(r, 'nodeUrlLegacy', ['net/url', 'regexp', 'strings'], ['nodeQuerystring'], legacyUrlHelper);
  defineClass(
    r,
    'url.Url',
    '*TnLegacyUrl',
    'class',
    'toString=string',
    'protocol=interface{}; slashes=interface{}; auth=interface{}; host=interface{}; port=interface{}; hostname=interface{}; hash=interface{}; search=interface{}; query=interface{}; pathname=interface{}; path=interface{}; href=string',
    '',
    ''
  );
  r.functions['url.parse'] = (call: NodeCall) => {
    r.helper('nodeUrlLegacy');
    return `TnUrlParse(${call.args[0]}, ${call.args[1] ?? 'false'}, ${call.args[2] ?? 'false'})`;
  };
  r.results['url.parse'] = '*TnLegacyUrl';
  r.functions['url.resolve'] = (call: NodeCall) => {
    r.helper('nodeUrlLegacy');
    return `TnUrlResolve(${call.args[0]}, ${call.args[1]})`;
  };
  r.results['url.resolve'] = 'string';
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
