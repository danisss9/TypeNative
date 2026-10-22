// More of node:util: parseArgs, getSystemErrorName / Map / Message,
// MIMEType, parseEnv (+ process.loadEnvFile), aborted, debuglog.
import { defineClass, defineHelper, setResults } from './registry.js';
const utilExtraHelper = `// node:util extras
type TnParsedArgs struct {
	values      *TnMap[string, interface{}]
	positionals []string
	tokens      []*TnMap[string, interface{}]
}

type tnArgOption struct {
	name     string
	kind     string
	short    string
	multiple bool
	def      interface{}
}

func tnParseArgsError(code string, message string) *TnError {
	return TnNodeError("TypeError", code, message)
}

// parseArgs({ args, options, strict, allowPositionals, allowNegative, tokens })
func TnParseArgs(config ...interface{}) *TnParsedArgs {
	var cfg interface{}
	if len(config) > 0 {
		cfg = config[0]
	}
	args := []string{}
	if a := TnGet(cfg, "args"); a != nil && !TnIsNil(a) {
		rv := reflect.ValueOf(a)
		if rv.Kind() == reflect.Pointer {
			rv = rv.Elem()
		}
		for i := 0; i < rv.Len(); i++ {
			args = append(args, TnJSString(rv.Index(i).Interface()))
		}
	} else if len(os.Args) > 1 {
		args = append(args, os.Args[1:]...)
	}
	strict := true
	if b, ok := TnGet(cfg, "strict").(bool); ok {
		strict = b
	}
	allowPositionals := !strict
	if b, ok := TnGet(cfg, "allowPositionals").(bool); ok {
		allowPositionals = b
	}
	allowNegative, _ := TnGet(cfg, "allowNegative").(bool)
	wantTokens, _ := TnGet(cfg, "tokens").(bool)
	options := []tnArgOption{}
	if opts := TnGet(cfg, "options"); opts != nil {
		for _, e := range tnArgEntries(opts) {
			o := tnArgOption{name: fmt.Sprint(e[0]), kind: "boolean"}
			if k, ok := TnGet(e[1], "type").(string); ok {
				o.kind = k
			}
			o.short, _ = TnGet(e[1], "short").(string)
			o.multiple, _ = TnGet(e[1], "multiple").(bool)
			o.def = TnGet(e[1], "default")
			options = append(options, o)
		}
	}
	find := func(name string) *tnArgOption {
		for i := range options {
			if options[i].name == name {
				return &options[i]
			}
		}
		return nil
	}
	findShort := func(short string) *tnArgOption {
		for i := range options {
			if options[i].short == short {
				return &options[i]
			}
		}
		return nil
	}
	label := func(o *tnArgOption, raw string) string {
		if o == nil {
			return raw
		}
		if o.short != "" {
			return "-" + o.short + ", --" + o.name
		}
		return "--" + o.name
	}
	result := &TnParsedArgs{values: TnNewMap[string, interface{}](), positionals: []string{}}
	tokens := []*TnMap[string, interface{}]{}
	store := func(o *tnArgOption, name string, value interface{}) {
		if o != nil && o.multiple {
			list, _ := result.values.Get(name).([]interface{})
			result.values.Set(name, append(list, value))
			return
		}
		result.values.Set(name, value)
	}
	option := func(index int, raw string, name string, value *string, inline bool) {
		o := find(name)
		negated := false
		if o == nil && allowNegative && strings.HasPrefix(name, "no-") {
			if no := find(strings.TrimPrefix(name, "no-")); no != nil && no.kind == "boolean" {
				o, negated, name = no, true, no.name
			}
		}
		if o == nil && strict {
			panic(tnParseArgsError("ERR_PARSE_ARGS_UNKNOWN_OPTION", "Unknown option '"+raw+"'"))
		}
		kind := "boolean"
		if o != nil {
			kind = o.kind
		} else if value != nil {
			kind = "string"
		}
		token := TnNewMap[string, interface{}]()
		token.Set("kind", "option")
		token.Set("name", name)
		token.Set("rawName", raw)
		token.Set("index", float64(index))
		if kind == "string" {
			if value == nil {
				if strict {
					panic(tnParseArgsError("ERR_PARSE_ARGS_INVALID_OPTION_VALUE", "Option '"+label(o, raw)+" <value>' argument missing"))
				}
				store(o, name, true)
			} else {
				store(o, name, *value)
				token.Set("value", *value)
				token.Set("inlineValue", inline)
			}
		} else {
			if value != nil && strict {
				panic(tnParseArgsError("ERR_PARSE_ARGS_INVALID_OPTION_VALUE", "Option '"+label(o, raw)+"' does not take an argument"))
			}
			store(o, name, !negated)
		}
		tokens = append(tokens, token)
	}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch {
		case arg == "--":
			token := TnNewMap[string, interface{}]()
			token.Set("kind", "option-terminator")
			token.Set("index", float64(i))
			tokens = append(tokens, token)
			for j := i + 1; j < len(args); j++ {
				if !allowPositionals {
					panic(tnParseArgsError("ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL", "Unexpected argument '"+args[j]+"'. This command does not take positional arguments"))
				}
				result.positionals = append(result.positionals, args[j])
				pt := TnNewMap[string, interface{}]()
				pt.Set("kind", "positional")
				pt.Set("index", float64(j))
				pt.Set("value", args[j])
				tokens = append(tokens, pt)
			}
			i = len(args)
		case strings.HasPrefix(arg, "--"):
			name := arg[2:]
			if eq := strings.Index(name, "="); eq >= 0 {
				value := name[eq+1:]
				option(i, "--"+name[:eq], name[:eq], &value, true)
				continue
			}
			o := find(name)
			if o != nil && o.kind == "string" && i+1 < len(args) {
				value := args[i+1]
				option(i, arg, name, &value, false)
				i++
				continue
			}
			option(i, arg, name, nil, false)
		case len(arg) > 1 && arg[0] == '-':
			shorts := arg[1:]
			for k := 0; k < len(shorts); k++ {
				ch := string(shorts[k])
				o := findShort(ch)
				name := ch
				if o != nil {
					name = o.name
				}
				if o != nil && o.kind == "string" {
					if k+1 < len(shorts) {
						value := shorts[k+1:]
						option(i, "-"+ch, name, &value, true)
					} else if i+1 < len(args) {
						value := args[i+1]
						option(i, "-"+ch, name, &value, false)
						i++
					} else {
						option(i, "-"+ch, name, nil, false)
					}
					break
				}
				option(i, "-"+ch, name, nil, false)
			}
		default:
			if !allowPositionals {
				panic(tnParseArgsError("ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL", "Unexpected argument '"+arg+"'. This command does not take positional arguments"))
			}
			result.positionals = append(result.positionals, arg)
			pt := TnNewMap[string, interface{}]()
			pt.Set("kind", "positional")
			pt.Set("index", float64(i))
			pt.Set("value", arg)
			tokens = append(tokens, pt)
		}
	}
	for _, o := range options {
		if o.def != nil && !TnIsNil(o.def) && !result.values.Has(o.name) {
			result.values.Set(o.name, o.def)
		}
	}
	if wantTokens {
		result.tokens = tokens
	}
	return result
}

// Name / value pairs of an options object (records keep their order)
func tnArgEntries(v interface{}) [][2]interface{} {
	out := [][2]interface{}{}
	if withEntries, ok := v.(interface{ Entries() [][]interface{} }); ok {
		for _, e := range withEntries.Entries() {
			out = append(out, [2]interface{}{e[0], e[1]})
		}
		return out
	}
	if m, ok := v.(map[string]interface{}); ok {
		keys := make([]string, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			out = append(out, [2]interface{}{k, m[k]})
		}
		return out
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		sv := rv.Elem()
		for i := 0; i < sv.NumField(); i++ {
			f := sv.Field(i)
			value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
			out = append(out, [2]interface{}{strings.TrimSuffix(sv.Type().Field(i).Name, "_"), value})
		}
	}
	return out
}

// --- system errors ---

func tnSystemErrorEntry(errno float64) (string, string, bool) {
	if errno >= 0 || errno != float64(int64(errno)) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"err\\" is out of range. It must be a negative integer. Received "+TnNumStr(errno)))
	}
	for _, e := range tnUvErrorList {
		if tnUvErrnos[e[0]] == errno {
			return e[0], e[1], true
		}
	}
	return "", "", false
}

func TnGetSystemErrorName(errno float64) string {
	name, _, ok := tnSystemErrorEntry(errno)
	if !ok {
		return "Unknown system error " + TnNumStr(errno)
	}
	return name
}

func TnGetSystemErrorMessage(errno float64) string {
	_, message, ok := tnSystemErrorEntry(errno)
	if !ok {
		return "Unknown system error " + TnNumStr(errno)
	}
	return message
}

func TnGetSystemErrorMap() *TnMap[float64, []string] {
	m := TnNewMap[float64, []string]()
	for _, e := range tnUvErrorList {
		m.Set(tnUvErrnos[e[0]], []string{e[0], e[1]})
	}
	return m
}

// --- MIMEType ---

type TnMIMEParams struct {
	keys   []string
	values map[string]string
}

type TnMIMEType struct {
	type_   string
	subtype string
	params  *TnMIMEParams
}

func tnMIMEToken(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c <= 32 || c >= 127 || strings.ContainsRune("()<>@,;:\\\\\\"/[]?=", c) {
			return false
		}
	}
	return true
}

func TnNewMIMEType(input interface{}) *TnMIMEType {
	raw := strings.TrimSpace(TnJSString(input))
	head, rest, _ := strings.Cut(raw, ";")
	typ, sub, ok := strings.Cut(strings.TrimSpace(head), "/")
	typ, sub = strings.ToLower(strings.TrimSpace(typ)), strings.ToLower(strings.TrimSpace(sub))
	if !ok || !tnMIMEToken(typ) || !tnMIMEToken(sub) {
		panic(TnNodeError("TypeError", "ERR_INVALID_MIME_SYNTAX", "The MIME syntax for a type in \\""+raw+"\\" is invalid"))
	}
	m := &TnMIMEType{type_: typ, subtype: sub, params: &TnMIMEParams{values: map[string]string{}}}
	for rest != "" {
		var part string
		part, rest = tnMIMENextParam(rest)
		name, value, found := strings.Cut(part, "=")
		name = strings.ToLower(strings.TrimSpace(name))
		if !found || !tnMIMEToken(name) {
			continue
		}
		value = strings.TrimSpace(value)
		if strings.HasPrefix(value, "\\"") {
			value = strings.TrimSuffix(strings.TrimPrefix(value, "\\""), "\\"")
			value = strings.ReplaceAll(value, "\\\\", "")
		}
		if _, exists := m.params.values[name]; !exists {
			m.params.set(name, value)
		}
	}
	return m
}

// The next ;-separated parameter (quoted values may contain ;)
func tnMIMENextParam(s string) (string, string) {
	quoted := false
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '"':
			quoted = !quoted
		case ';':
			if !quoted {
				return s[:i], s[i+1:]
			}
		}
	}
	return s, ""
}

func (m *TnMIMEType) Get_type_() string         { return m.type_ }
func (m *TnMIMEType) Set_type_(v string)        { m.type_ = strings.ToLower(v) }
func (m *TnMIMEType) Get_subtype() string       { return m.subtype }
func (m *TnMIMEType) Set_subtype(v string)      { m.subtype = strings.ToLower(v) }
func (m *TnMIMEType) Get_essence() string       { return m.type_ + "/" + m.subtype }
func (m *TnMIMEType) Get_params() *TnMIMEParams { return m.params }
func (m *TnMIMEType) toString() string          { return m.Get_essence() + m.params.serialize() }
func (m *TnMIMEType) toJSON() string            { return m.toString() }

func (p *TnMIMEParams) get(name string) *string {
	v, ok := p.values[strings.ToLower(name)]
	if !ok {
		return nil
	}
	return &v
}

func (p *TnMIMEParams) has(name string) bool {
	_, ok := p.values[strings.ToLower(name)]
	return ok
}

func (p *TnMIMEParams) set(name string, value string) {
	name = strings.ToLower(name)
	if _, ok := p.values[name]; !ok {
		p.keys = append(p.keys, name)
	}
	p.values[name] = value
}

func (p *TnMIMEParams) delete(name string) {
	name = strings.ToLower(name)
	delete(p.values, name)
	kept := []string{}
	for _, k := range p.keys {
		if k != name {
			kept = append(kept, k)
		}
	}
	p.keys = kept
}

func (p *TnMIMEParams) keysList() []string { return append([]string{}, p.keys...) }

func (p *TnMIMEParams) valuesList() []string {
	out := []string{}
	for _, k := range p.keys {
		out = append(out, p.values[k])
	}
	return out
}

func (p *TnMIMEParams) entries() [][]string {
	out := [][]string{}
	for _, k := range p.keys {
		out = append(out, []string{k, p.values[k]})
	}
	return out
}

func (p *TnMIMEParams) serialize() string {
	var b strings.Builder
	for _, k := range p.keys {
		v := p.values[k]
		if v == "" || !tnMIMEToken(v) {
			v = "\\"" + strings.NewReplacer("\\\\", "\\\\\\\\", "\\"", "\\\\\\"").Replace(v) + "\\""
		}
		b.WriteString(";" + k + "=" + v)
	}
	return b.String()
}

func (p *TnMIMEParams) toString() string { return strings.TrimPrefix(p.serialize(), ";") }

// --- .env files ---

// parseEnv(content): KEY=value lines, # comments, export prefixes, quoted values
// (double quotes expand \\n; they and backticks may span lines)
func TnParseEnv(content string) *TnMap[string, string] {
	out := TnNewMap[string, string]()
	lines := strings.Split(strings.ReplaceAll(content, "\\r\\n", "\\n"), "\\n")
	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if value != "" && strings.ContainsRune("\\"'\`", rune(value[0])) {
			q := value[0]
			body := value[1:]
			for strings.IndexByte(body, q) < 0 && i+1 < len(lines) {
				i++
				body += "\\n" + lines[i]
			}
			if end := strings.IndexByte(body, q); end >= 0 {
				body = body[:end]
			}
			if q == '"' {
				body = strings.ReplaceAll(body, "\\\\n", "\\n")
			}
			value = body
		} else if hash := strings.Index(value, " #"); hash >= 0 {
			value = strings.TrimSpace(value[:hash])
		}
		out.Set(key, value)
	}
	return out
}

// process.loadEnvFile(path = '.env'): variables already set win
func TnLoadEnvFile(path ...string) {
	file := ".env"
	if len(path) > 0 && path[0] != "" {
		file = path[0]
	}
	data, err := os.ReadFile(file)
	if err != nil {
		panic(TnSysError(err, "open", file))
	}
	for k, v := range TnParseEnv(string(data)).All() {
		if _, set := os.LookupEnv(k); !set {
			os.Setenv(k, v)
		}
	}
}

// aborted(signal, resource): resolves once the signal aborts
func TnUtilAborted(signal *TnAbortSignal, resource interface{}) chan struct{} {
	ch := make(chan struct{})
	if signal.aborted {
		close(ch)
		return ch
	}
	TnLoopRef()
	signal.addEventListener("abort", func(ev *TnEvent) {
		TnLoopUnref()
		close(ch)
	}, map[string]interface{}{"once": true})
	return ch
}

// debuglog(section): logs "SECTION pid: message" to stderr when NODE_DEBUG names the section
func tnDebugEnabled(section string) bool {
	for _, name := range strings.Split(os.Getenv("NODE_DEBUG"), ",") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		pattern := "^" + strings.ReplaceAll(regexp.QuoteMeta(name), "\\\\*", ".*") + "$"
		if ok, _ := regexp.MatchString("(?i)"+pattern, section); ok {
			return true
		}
	}
	return false
}

func TnDebuglog(section string, cb ...interface{}) func(args ...interface{}) {
	enabled := tnDebugEnabled(section)
	prefix := strings.ToUpper(section) + " " + strconv.Itoa(os.Getpid()) + ": "
	return func(args ...interface{}) {
		if enabled {
			fmt.Fprintln(os.Stderr, prefix+TnUtilFormat(args...))
		}
	}
}

func TnDebuglogEnabled(section string) bool { return tnDebugEnabled(section) }

// toUSVString: invalid sequences become U+FFFD
func TnToUSVString(s string) string { return strings.ToValidUTF8(s, "\uFFFD") }`;
export function registerUtilExtra(r) {
    defineHelper(r, 'nodeUtilExtra', ['fmt', 'os', 'reflect', 'regexp', 'sort', 'strconv', 'strings', 'unsafe'], ['nodeUtil', 'dynamic', 'orderedMap', 'error', 'eventLoop', 'nodeEvents', 'fsErrors', 'uvErrno'], utilExtraHelper);
    const use = () => r.helper('nodeUtilExtra');
    const fn = (key, result, emit) => {
        r.functions[key] = (c) => {
            use();
            return emit(c);
        };
        if (result)
            r.results[key] = result;
    };
    defineClass(r, 'util.ParsedArgs', '*TnParsedArgs', 'class', '', 'values=*TnMap[string, interface{}]; positionals=[]string; tokens=[]*TnMap[string, interface{}]', '', '');
    fn('util.parseArgs', '*TnParsedArgs', (c) => `TnParseArgs(${c.args.join(', ')})`);
    fn('util.getSystemErrorName', 'string', (c) => `TnGetSystemErrorName(${c.args[0]})`);
    fn('util.getSystemErrorMessage', 'string', (c) => `TnGetSystemErrorMessage(${c.args[0]})`);
    fn('util.getSystemErrorMap', '*TnMap[float64, []string]', (_c) => 'TnGetSystemErrorMap()');
    fn('util.parseEnv', '*TnMap[string, string]', (c) => `TnParseEnv(${c.args[0]})`);
    fn('process.loadEnvFile', '', (c) => `TnLoadEnvFile(${c.args.join(', ')})`);
    fn('util.aborted', 'chan struct{}', (c) => `TnUtilAborted(${c.args[0]}, ${c.args[1] ?? 'nil'})`);
    fn('util.debuglog', 'func(...interface{})', (c) => `TnDebuglog(${c.args.join(', ')})`);
    fn('util.debug', 'func(...interface{})', (c) => `TnDebuglog(${c.args.join(', ')})`);
    fn('util.toUSVString', 'string', (c) => `TnToUSVString(${c.args[0]})`);
    defineClass(r, 'util.MIMEType', '*TnMIMEType', 'class', 'toString=string; toJSON=string', '', 'type=string; subtype=string; essence=string; params=*TnMIMEParams', 'type; subtype');
    defineClass(r, 'util.MIMEParams', '*TnMIMEParams', 'class', 'get=*string; has=bool; set=; delete=; toString=string', '', '', '');
    r.methods['util.MIMEParams#keys'] = (c) => `${c.recv}.keysList()`;
    r.results['util.MIMEParams#keys'] = '[]string';
    r.methods['util.MIMEParams#values'] = (c) => `${c.recv}.valuesList()`;
    r.results['util.MIMEParams#values'] = '[]string';
    r.methods['util.MIMEParams#entries'] = (c) => `${c.recv}.entries()`;
    r.results['util.MIMEParams#entries'] = '[][]string';
    r.iterators['*TnMIMEParams'] = 'entries';
    r.classes['util.MIMEParams'].methods['entries'] = '[][]string';
    r.constructors['util.MIMEType'] = (c) => {
        use();
        return `TnNewMIMEType(${c.args[0]})`;
    };
    setResults(r, 'util', '');
}
