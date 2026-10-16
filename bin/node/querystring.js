// node:querystring — parse / stringify / escape / unescape (decode / encode aliases)
import { defineHelper, defineModule, setResults } from './registry.js';
const querystringHelper = `// node:querystring
func TnQueryUnescape(s string) string {
	if decoded, err := tnurl.PathUnescape(s); err == nil {
		return decoded
	}
	return tnFormDecode(strings.ReplaceAll(s, "+", "%2B"))
}

// parse(str, sep = "&", eq = "="): repeated keys collect into arrays
func TnQueryParse(s string, seps ...string) *TnMap[string, interface{}] {
	sep, eq := "&", "="
	if len(seps) > 0 && seps[0] != "" {
		sep = seps[0]
	}
	if len(seps) > 1 && seps[1] != "" {
		eq = seps[1]
	}
	out := TnNewMap[string, interface{}]()
	if s == "" {
		return out
	}
	for _, part := range strings.Split(s, sep) {
		if part == "" {
			continue
		}
		key, value := part, ""
		if i := strings.Index(part, eq); i >= 0 {
			key, value = part[:i], part[i+len(eq):]
		}
		key = TnQueryUnescape(strings.ReplaceAll(key, "+", " "))
		value = TnQueryUnescape(strings.ReplaceAll(value, "+", " "))
		if existing, ok := out.Lookup(key); ok {
			switch e := existing.(type) {
			case []string:
				out.Set(key, append(e, value))
			case string:
				out.Set(key, []string{e, value})
			}
			continue
		}
		out.Set(key, value)
	}
	return out
}

func tnQueryValue(v interface{}) string {
	switch x := v.(type) {
	case string:
		return x
	case float64:
		if math.IsInf(x, 0) || math.IsNaN(x) {
			return ""
		}
		return TnNumStr(x)
	case bool:
		if x {
			return "true"
		}
		return "false"
	case *tnbig.Int:
		return x.String()
	}
	return ""
}

// stringify(obj, sep = "&", eq = "="): arrays repeat the key
func TnQueryStringify(obj interface{}, seps ...string) string {
	sep, eq := "&", "="
	if len(seps) > 0 && seps[0] != "" {
		sep = seps[0]
	}
	if len(seps) > 1 && seps[1] != "" {
		eq = seps[1]
	}
	parts := []string{}
	add := func(key string, value interface{}) {
		k := TnEncodeURIComponent(key)
		rv := reflect.ValueOf(value)
		if value != nil && (rv.Kind() == reflect.Slice || (rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Slice)) {
			if rv.Kind() == reflect.Pointer {
				rv = rv.Elem()
			}
			for i := 0; i < rv.Len(); i++ {
				parts = append(parts, k+eq+TnEncodeURIComponent(tnQueryValue(rv.Index(i).Interface())))
			}
			return
		}
		parts = append(parts, k+eq+TnEncodeURIComponent(tnQueryValue(value)))
	}
	if withEntries, ok := obj.(interface{ Entries() [][]interface{} }); ok {
		for _, e := range withEntries.Entries() {
			add(fmt.Sprint(e[0]), e[1])
		}
	} else if m, ok := obj.(map[string]interface{}); ok {
		keys := make([]string, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			add(k, m[k])
		}
	} else {
		rv := reflect.ValueOf(obj)
		if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
			sv := rv.Elem()
			for i := 0; i < sv.NumField(); i++ {
				f := sv.Field(i)
				value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
				add(strings.TrimSuffix(sv.Type().Field(i).Name, "_"), value)
			}
		}
	}
	return strings.Join(parts, sep)
}`;
export function registerQuerystring(r) {
    defineModule(r, 'querystring');
    defineHelper(r, 'nodeQuerystring', ['fmt', 'math', 'math/big', 'net/url', 'reflect', 'sort', 'strings', 'unsafe'], ['nodeUrl', 'uri', 'orderedMap', 'dynamic'], querystringHelper);
    const use = () => r.helper('nodeQuerystring');
    for (const name of ['parse', 'decode']) {
        r.functions[`querystring.${name}`] = (call) => {
            use();
            return `TnQueryParse(${call.args.slice(0, 3).join(', ')})`;
        };
    }
    for (const name of ['stringify', 'encode']) {
        r.functions[`querystring.${name}`] = (call) => {
            use();
            return `TnQueryStringify(${call.args.slice(0, 3).join(', ')})`;
        };
    }
    r.functions['querystring.escape'] = (call) => {
        r.helper('uri');
        return `TnEncodeURIComponent(${call.args[0]})`;
    };
    r.functions['querystring.unescape'] = (call) => {
        use();
        return `TnQueryUnescape(${call.args[0]})`;
    };
    setResults(r, 'querystring', 'parse=*TnMap[string, interface{}]; decode=*TnMap[string, interface{}]; stringify=string; encode=string; escape=string; unescape=string');
}
