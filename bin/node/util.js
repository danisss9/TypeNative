// node:util (+ node:util/types, node:sys): inspect / format (Node's layout
// rules, ported), isDeepStrictEqual, types.*, deprecate, styleText,
// stripVTControlCharacters. console.log formats non-string arguments with it.
import { defineHelper, defineModule, setResults } from './registry.js';
const utilHelper = `// node:util — inspect / format over TypeNative values (Node's layout rules)
type tnInspector struct {
	depth          float64
	breakLength    int
	compact        int
	indentationLvl int
	currentDepth   int
	seen           []uintptr
	circular       map[uintptr]int
	topIsMap       bool
}

func tnNewInspector(options ...interface{}) *tnInspector {
	ins := &tnInspector{depth: 2, breakLength: 80, compact: 3, circular: map[uintptr]int{}}
	if len(options) > 0 && options[0] != nil {
		opts := options[0]
		if d, ok := TnGet(opts, "depth").(float64); ok {
			ins.depth = d
		} else if TnHas(opts, "depth") && TnGet(opts, "depth") == nil {
			ins.depth = math.Inf(1)
		}
		if b, ok := TnGet(opts, "breakLength").(float64); ok {
			if math.IsInf(b, 1) {
				ins.breakLength = math.MaxInt32
			} else {
				ins.breakLength = int(b)
			}
		}
		if c, ok := TnGet(opts, "compact").(float64); ok {
			ins.compact = int(c)
		} else if c, ok := TnGet(opts, "compact").(bool); ok && !c {
			ins.compact = 0
		}
	}
	return ins
}

// util.inspect(value, options?)
func TnInspect(v interface{}, options ...interface{}) string {
	return tnNewInspector(options...).format(v, 0)
}

// util.inspect of a Map<K, V> variable (Records and Maps share TnMap)
func TnInspectMap(v interface{}, options ...interface{}) string {
	ins := tnNewInspector(options...)
	ins.topIsMap = true
	return ins.format(v, 0)
}

var tnIdentifierKey = regexp.MustCompile("^[A-Za-z_$][A-Za-z0-9_$]*$")

// Node's strEscape: single quotes unless the string contains them
func tnQuoteJS(s string) string {
	quote := byte('\\'')
	if strings.Contains(s, "'") {
		if !strings.Contains(s, "\\"") {
			quote = '"'
		} else if !strings.Contains(s, "\`") && !strings.Contains(s, "\${") {
			quote = '\`'
		}
	}
	var sb strings.Builder
	sb.WriteByte(quote)
	for _, r := range s {
		switch {
		case r == rune(quote) || r == '\\\\':
			sb.WriteByte('\\\\')
			sb.WriteRune(r)
		case r == '\\n':
			sb.WriteString("\\\\n")
		case r == '\\t':
			sb.WriteString("\\\\t")
		case r == '\\r':
			sb.WriteString("\\\\r")
		case r == '\\b':
			sb.WriteString("\\\\b")
		case r == '\\f':
			sb.WriteString("\\\\f")
		case r == '\\v':
			sb.WriteString("\\\\v")
		case r < 0x20 || r == 0x7f:
			sb.WriteString(fmt.Sprintf("\\\\x%02X", r))
		default:
			sb.WriteRune(r)
		}
	}
	sb.WriteByte(quote)
	return sb.String()
}

func tnInspectNumber(f float64) string {
	if f == 0 && math.Signbit(f) {
		return "-0"
	}
	return TnNumStr(f)
}

func tnInspectKey(k string) string {
	if tnIdentifierKey.MatchString(k) {
		return k
	}
	return tnQuoteJS(k)
}

// A struct field read through a pointer (unexported fields too)
func tnFieldValue(rv reflect.Value, i int) interface{} {
	f := rv.Field(i)
	if f.CanAddr() {
		return reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
	}
	return nil
}

type tnField struct {
	name  string
	value interface{}
}

// Fields of a struct, embedded structs flattened (class inheritance embeds the parent)
func tnStructFields(rv reflect.Value) ([]tnField, *TnError) {
	if !rv.CanAddr() {
		tmp := reflect.New(rv.Type()).Elem()
		tmp.Set(rv)
		rv = tmp
	}
	fields := []tnField{}
	var embeddedError *TnError
	t := rv.Type()
	for i := 0; i < t.NumField(); i++ {
		sf := t.Field(i)
		if sf.Anonymous {
			if sf.Type == reflect.TypeOf(TnError{}) {
				e := tnFieldValue(rv, i).(TnError)
				embeddedError = &e
				continue
			}
			if sf.Type.Kind() == reflect.Struct {
				inner, innerErr := tnStructFields(rv.Field(i))
				if innerErr != nil {
					embeddedError = innerErr
				}
				fields = append(fields, inner...)
				continue
			}
		}
		if strings.HasPrefix(sf.Name, "__") {
			continue
		}
		name := strings.TrimSuffix(sf.Name, "_")
		fields = append(fields, tnField{name: name, value: tnFieldValue(rv, i)})
	}
	return fields, embeddedError
}

func tnFunctionName(rv reflect.Value) string {
	fn := runtime.FuncForPC(rv.Pointer())
	if fn != nil {
		name := fn.Name()
		if strings.HasPrefix(name, "main.") {
			name = name[5:]
			if !strings.Contains(name, ".") && !strings.HasPrefix(name, "Tn") {
				return "[Function: " + name + "]"
			}
		}
	}
	return "[Function (anonymous)]"
}

func (ins *tnInspector) format(v interface{}, depth int) string {
	switch x := v.(type) {
	case nil:
		return "undefined"
	case interface{ TnIsNullValue() }:
		return "null"
	case string:
		return tnQuoteJS(x)
	case float64:
		return tnInspectNumber(x)
	case bool:
		if x {
			return "true"
		}
		return "false"
	case int:
		return strconv.Itoa(x)
	case *tnbig.Int:
		if x == nil {
			return "null"
		}
		return x.String() + "n"
	case []byte:
		return TnBufferInspect(x)
	case interface{ TnTypedInspect() (string, []float64) }:
		name, values := x.TnTypedInspect()
		return name + " " + ins.format(values, depth)
	case time.Time:
		if x.IsZero() {
			return "Invalid Date"
		}
		return x.UTC().Format("2006-01-02T15:04:05.000Z07:00")
	case *regexp.Regexp:
		if x == nil {
			return "null"
		}
		return "/" + x.String() + "/"
	case *TnError:
		if x == nil {
			return "null"
		}
		return ins.formatError(x, x.Get_name(), nil, depth)
	}
	if reflect.TypeOf(v).String() == "*main.TnSymbol" {
		return fmt.Sprintf("Symbol(%v)", TnGet(v, "description"))
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Func:
		if rv.IsNil() {
			return "null"
		}
		return tnFunctionName(rv)
	case reflect.Chan:
		return "Promise { <pending> }"
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(rv.Int(), 10)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return strconv.FormatUint(rv.Uint(), 10)
	case reflect.Float32:
		return tnInspectNumber(rv.Float())
	case reflect.String:
		return tnQuoteJS(rv.String())
	case reflect.Interface:
		if rv.IsNil() {
			return "undefined"
		}
		return ins.format(rv.Elem().Interface(), depth)
	case reflect.Slice, reflect.Array:
		if rv.Kind() == reflect.Slice && rv.IsNil() {
			return "[]"
		}
		return ins.formatCompound(v, rv, depth)
	case reflect.Map:
		if rv.IsNil() {
			return "{}"
		}
		return ins.formatCompound(v, rv, depth)
	case reflect.Pointer:
		if rv.IsNil() {
			return "null"
		}
		if rv.Elem().Kind() == reflect.Slice {
			return ins.format(rv.Elem().Interface(), depth)
		}
		if rv.Elem().Kind() == reflect.Struct {
			return ins.formatCompound(v, rv, depth)
		}
		return ins.format(rv.Elem().Interface(), depth)
	case reflect.Struct:
		return ins.formatCompound(v, rv, depth)
	}
	if e, ok := v.(error); ok {
		return e.Error()
	}
	return fmt.Sprint(v)
}

func (ins *tnInspector) formatError(e *TnError, name string, fields []tnField, depth int) string {
	// an Error subclass's own name / message fields (set after super()) are
	// the ones its stack shows, as in Node
	message := e.message
	own := fields[:0:0]
	for _, f := range fields {
		switch f.name {
		case "name":
			if s, ok := f.value.(string); ok {
				name = s
			}
			continue
		case "message":
			if s, ok := f.value.(string); ok {
				message = s
			}
			continue
		case "stack":
			continue
		}
		own = append(own, f)
	}
	fields = own
	base := name + ": " + message
	if message == "" {
		base = name
	}
	out := []string{}
	if e.code != "" {
		out = append(out, "code: "+tnQuoteJS(e.code))
	}
	for _, key := range []string{"syscall", "path", "errno"} {
		if val := e.prop(key); val != nil {
			out = append(out, key+": "+ins.format(val, depth+1))
		}
	}
	for _, f := range fields {
		out = append(out, tnInspectKey(f.name)+": "+ins.format(f.value, depth+1))
	}
	if len(out) == 0 {
		return base
	}
	return base + " {\\n  " + strings.Join(out, ",\\n  ") + "\\n}"
}

func tnInspectSetLike(rv reflect.Value) bool {
	t := rv.Type()
	if t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	if t.Kind() != reflect.Struct || t.NumField() < 2 {
		return false
	}
	values := t.Field(1).Type
	return values.Kind() == reflect.Map && values.Elem().Kind() == reflect.Struct && values.Elem().NumField() == 0
}

func (ins *tnInspector) formatCompound(v interface{}, rv reflect.Value, depth int) string {
	var ptr uintptr
	if rv.Kind() == reflect.Pointer || rv.Kind() == reflect.Map || (rv.Kind() == reflect.Slice && rv.Len() > 0) {
		ptr = rv.Pointer()
		if rv.Kind() == reflect.Slice {
			ptr = 0
		}
	}
	if ptr != 0 {
		for _, s := range ins.seen {
			if s == ptr {
				idx, ok := ins.circular[ptr]
				if !ok {
					idx = len(ins.circular) + 1
					ins.circular[ptr] = idx
				}
				return fmt.Sprintf("[Circular *%d]", idx)
			}
		}
	}
	// What kind of value: array, Map, Set, object, class instance
	kind := "object"
	prefix := ""
	var entries [][]interface{}
	var fields []tnField
	var embeddedError *TnError
	isTop := depth == 0
	if withEntries, ok := v.(interface{ Entries() [][]interface{} }); ok {
		entries = withEntries.Entries()
		// new Map() / new Set() are tagged; untagged maps are records unless a
		// key is not a string
		jsKind := uint8(0)
		if tagged, ok := v.(interface{ TnJSKind() uint8 }); ok {
			jsKind = tagged.TnJSKind()
		}
		if jsKind == 2 || (jsKind == 0 && tnInspectSetLike(rv)) {
			kind = "set"
		} else if jsKind == 1 {
			kind = "map"
		} else {
			kind = "map"
			stringKeys := true
			for _, e := range entries {
				if _, isString := e[0].(string); !isString {
					stringKeys = false
				}
			}
			if stringKeys && !(isTop && ins.topIsMap) {
				kind = "object"
				for _, e := range entries {
					fields = append(fields, tnField{name: e[0].(string), value: e[1]})
				}
			}
		}
	} else {
		switch rv.Kind() {
		case reflect.Slice, reflect.Array:
			kind = "array"
		case reflect.Map:
			keys := rv.MapKeys()
			sort.Slice(keys, func(i, j int) bool { return fmt.Sprint(keys[i].Interface()) < fmt.Sprint(keys[j].Interface()) })
			for _, k := range keys {
				fields = append(fields, tnField{name: fmt.Sprint(k.Interface()), value: rv.MapIndex(k).Interface()})
			}
		default:
			sv := rv
			if sv.Kind() == reflect.Pointer {
				sv = sv.Elem()
			}
			fields, embeddedError = tnStructFields(sv)
			name := sv.Type().Name()
			if embeddedError != nil {
				return ins.formatError(embeddedError, name, fields, depth)
			}
			if tnInspectClassNames[name] {
				prefix = name + " "
			}
		}
	}
	if ins.depth >= 0 && float64(depth) > ins.depth {
		switch kind {
		case "array":
			return "[Array]"
		case "map":
			return "[Map]"
		case "set":
			return "[Set]"
		}
		if prefix != "" {
			return "[" + strings.TrimSpace(prefix) + "]"
		}
		return "[Object]"
	}
	if ptr != 0 {
		ins.seen = append(ins.seen, ptr)
		defer func() { ins.seen = ins.seen[:len(ins.seen)-1] }()
	}
	ins.currentDepth = depth
	output := []string{}
	braces := [2]string{prefix + "{", "}"}
	isArray := false
	ins.indentationLvl += 2
	switch kind {
	case "array":
		isArray = true
		braces = [2]string{"[", "]"}
		n := rv.Len()
		shown := n
		if shown > 100 {
			shown = 100
		}
		for i := 0; i < shown; i++ {
			output = append(output, ins.format(rv.Index(i).Interface(), depth+1))
		}
		if n > shown {
			more := n - shown
			if more == 1 {
				output = append(output, "... 1 more item")
			} else {
				output = append(output, fmt.Sprintf("... %d more items", more))
			}
		}
	case "map":
		braces = [2]string{fmt.Sprintf("Map(%d) {", len(entries)), "}"}
		for _, e := range entries {
			output = append(output, ins.format(e[0], depth+1)+" => "+ins.format(e[1], depth+1))
		}
	case "set":
		braces = [2]string{fmt.Sprintf("Set(%d) {", len(entries)), "}"}
		for _, e := range entries {
			output = append(output, ins.format(e[0], depth+1))
		}
	default:
		for _, f := range fields {
			value := ""
			if fv := reflect.ValueOf(f.value); f.value != nil && fv.Kind() == reflect.Func {
				if fv.IsNil() {
					value = "undefined"
				} else {
					value = "[Function: " + f.name + "]"
				}
			} else {
				value = ins.format(f.value, depth+1)
			}
			output = append(output, tnInspectKey(f.name)+": "+value)
		}
	}
	ins.indentationLvl -= 2
	ref := ""
	if ptr != 0 {
		if idx, ok := ins.circular[ptr]; ok {
			ref = fmt.Sprintf("<ref *%d> ", idx)
		}
	}
	if len(output) == 0 {
		if isArray {
			return ref + "[]"
		}
		return ref + braces[0] + "}"
	}
	return ref + ins.reduceToSingleString(output, braces, isArray, depth, rv)
}

func (ins *tnInspector) isBelowBreakLength(output []string, start int) bool {
	total := len(output) + start
	if total+len(output) > ins.breakLength {
		return false
	}
	for _, o := range output {
		total += len(o)
		if total > ins.breakLength {
			return false
		}
	}
	return true
}

func (ins *tnInspector) reduceToSingleString(output []string, braces [2]string, isArray bool, depth int, rv reflect.Value) string {
	if ins.compact >= 1 {
		entries := len(output)
		if isArray && entries > 6 {
			output = ins.groupArrayElements(output, rv)
		}
		if ins.currentDepth-depth < ins.compact && entries == len(output) {
			start := len(output) + ins.indentationLvl + len(braces[0]) + 10
			if ins.isBelowBreakLength(output, start) {
				joined := strings.Join(output, ", ")
				if !strings.Contains(joined, "\\n") {
					return braces[0] + " " + joined + " " + braces[1]
				}
			}
		}
	}
	indentation := "\\n" + strings.Repeat(" ", ins.indentationLvl)
	return braces[0] + indentation + "  " + strings.Join(output, ","+indentation+"  ") + indentation + braces[1]
}

// Node's groupArrayElements: long arrays of short entries print in columns
func (ins *tnInspector) groupArrayElements(output []string, rv reflect.Value) []string {
	totalLength := 0
	maxLength := 0
	outputLength := len(output)
	if strings.HasPrefix(output[len(output)-1], "... ") {
		outputLength--
	}
	separatorSpace := 2
	dataLen := make([]int, outputLength)
	for i := 0; i < outputLength; i++ {
		l := utf8.RuneCountInString(output[i])
		dataLen[i] = l
		totalLength += l + separatorSpace
		if maxLength < l {
			maxLength = l
		}
	}
	actualMax := maxLength + separatorSpace
	if actualMax*3+ins.indentationLvl < ins.breakLength &&
		(float64(totalLength)/float64(actualMax) > 5 || maxLength <= 6) {
		averageBias := math.Sqrt(float64(actualMax) - float64(totalLength)/float64(len(output)))
		biasedMax := math.Max(float64(actualMax)-3-averageBias, 1)
		columns := int(math.Min(math.Min(math.Round(math.Sqrt(2.5*biasedMax*float64(outputLength))/biasedMax),
			math.Floor(float64(ins.breakLength-ins.indentationLvl)/float64(actualMax))),
			math.Min(float64(ins.compact*4), 15)))
		if columns <= 1 {
			return output
		}
		maxLineLength := []int{}
		for i := 0; i < columns; i++ {
			lineLength := 0
			for j := i; j < len(output); j += columns {
				if j < outputLength && dataLen[j] > lineLength {
					lineLength = dataLen[j]
				}
			}
			maxLineLength = append(maxLineLength, lineLength+separatorSpace)
		}
		padStart := true
		for i := 0; i < rv.Len() && i < outputLength; i++ {
			k := reflect.ValueOf(rv.Index(i).Interface()).Kind()
			if k != reflect.Float64 && k != reflect.Int {
				padStart = false
				break
			}
		}
		tmp := []string{}
		for i := 0; i < outputLength; i += columns {
			maxIdx := i + columns
			if maxIdx > outputLength {
				maxIdx = outputLength
			}
			str := ""
			j := i
			for ; j < maxIdx-1; j++ {
				cell := output[j] + ", "
				pad := maxLineLength[j-i] - dataLen[j] - separatorSpace
				if padStart {
					str += strings.Repeat(" ", max(pad, 0)) + cell
				} else {
					str += cell + strings.Repeat(" ", max(pad, 0))
				}
			}
			if padStart {
				pad := maxLineLength[j-i] - separatorSpace - dataLen[j]
				str += strings.Repeat(" ", max(pad, 0)) + output[j]
			} else {
				str += output[j]
			}
			tmp = append(tmp, str)
		}
		if outputLength < len(output) {
			tmp = append(tmp, output[outputLength])
		}
		return tmp
	}
	return output
}

// An argument printed by console.log / util.format: strings as-is
func tnFormatArg(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return TnInspect(v)
}

// console.table(data, [properties]): a box-drawn table of an array / object / Map / Set;
// anything else is logged as is
func TnConsoleTableString(data interface{}, properties ...interface{}) string {
	rv := reflect.ValueOf(data)
	var filter []string
	hasFilter := false
	if len(properties) > 0 && properties[0] != nil {
		hasFilter = true
		switch p := properties[0].(type) {
		case []string:
			filter = p
		case []interface{}:
			for _, x := range p {
				filter = append(filter, fmt.Sprint(x))
			}
		}
	}
	type row struct {
		index string
		value interface{}
	}
	rows := []row{}
	indexHeader := "(index)"
	var mapKeys []string
	isMap, isSet := TnIsMapValue(data), TnIsSetValue(data)
	if entries, ok := tnEntriesOf(rv); ok && (isMap || isSet) {
		indexHeader = "(iteration index)"
		for i, e := range entries {
			value := e[1]
			if isSet {
				value = e[0]
			}
			rows = append(rows, row{index: strconv.Itoa(i), value: value})
			if isMap {
				mapKeys = append(mapKeys, TnInspect(e[0]))
			}
		}
	} else if rv.Kind() == reflect.Slice && !tnIsBytes(rv) {
		for i := 0; i < rv.Len(); i++ {
			rows = append(rows, row{index: strconv.Itoa(i), value: rv.Index(i).Interface()})
		}
	} else if fields, _, ok := tnObjectFields(rv); ok && data != nil {
		if rv.Kind() == reflect.Map {
			sort.Slice(fields, func(i, j int) bool { return fields[i].name < fields[j].name })
		}
		for _, f := range fields {
			rows = append(rows, row{index: f.name, value: f.value})
		}
	} else {
		return TnUtilFormat(data)
	}
	columns := []string{}
	cells := map[string]map[int]string{}
	addColumn := func(name string) {
		if _, ok := cells[name]; !ok {
			cells[name] = map[int]string{}
			columns = append(columns, name)
		}
	}
	for _, name := range filter {
		addColumn(name)
	}
	values := map[int]string{}
	hasValues := false
	for i, r := range rows {
		if mapKeys != nil {
			values[i] = TnInspect(r.value)
			hasValues = true
			continue
		}
		vv := reflect.ValueOf(r.value)
		var fields []tnField
		object := false
		if vv.Kind() == reflect.Slice && !tnIsBytes(vv) {
			object = true
			for j := 0; j < vv.Len(); j++ {
				fields = append(fields, tnField{name: strconv.Itoa(j), value: vv.Index(j).Interface()})
			}
		} else if fs, _, ok := tnObjectFields(vv); ok && r.value != nil && !isSet {
			object = true
			fields = fs
			if vv.Kind() == reflect.Map {
				sort.Slice(fields, func(a, b int) bool { return fields[a].name < fields[b].name })
			}
		}
		if !object {
			if !hasFilter {
				values[i] = TnInspect(r.value)
				hasValues = true
			}
			continue
		}
		for _, f := range fields {
			if hasFilter {
				if _, wanted := cells[f.name]; !wanted {
					continue
				}
			} else {
				addColumn(f.name)
			}
			cells[f.name][i] = TnInspect(f.value)
		}
	}
	header := []string{indexHeader}
	if mapKeys != nil {
		header = append(header, "Key")
	}
	header = append(header, columns...)
	if hasValues {
		header = append(header, "Values")
	}
	table := [][]string{}
	for i, r := range rows {
		line := []string{r.index}
		if mapKeys != nil {
			line = append(line, mapKeys[i])
		}
		for _, c := range columns {
			line = append(line, cells[c][i])
		}
		if hasValues {
			line = append(line, values[i])
		}
		table = append(table, line)
	}
	width := func(s string) int { return utf8.RuneCountInString(TnStripVTControlCharacters(s)) }
	widths := make([]int, len(header))
	for i, h := range header {
		widths[i] = width(h) + 2
		for _, line := range table {
			if w := width(line[i]) + 2; w > widths[i] {
				widths[i] = w
			}
		}
	}
	divider := func(left, mid, right string) string {
		parts := make([]string, len(widths))
		for i, w := range widths {
			parts[i] = strings.Repeat("─", w)
		}
		return left + strings.Join(parts, mid) + right
	}
	render := func(line []string) string {
		out := "│"
		for i, cell := range line {
			out += " " + cell + strings.Repeat(" ", widths[i]-1-width(cell)) + "│"
		}
		return out
	}
	out := []string{divider("┌", "┬", "┐"), render(header), divider("├", "┼", "┤")}
	for _, line := range table {
		out = append(out, render(line))
	}
	out = append(out, divider("└", "┴", "┘"))
	return strings.Join(out, "\\n")
}

func tnIsBytes(v reflect.Value) bool {
	return v.Kind() == reflect.Slice && v.Type().Elem().Kind() == reflect.Uint8
}

// util.format(format, ...args) — also console.log's formatting
func TnUtilFormat(args ...interface{}) string {
	if len(args) == 0 {
		return ""
	}
	// Nullable primitives (optional chaining results) print as their value
	for i, a := range args {
		switch p := a.(type) {
		case *string:
			if p == nil {
				args[i] = nil
			} else {
				args[i] = *p
			}
		case *float64:
			if p == nil {
				args[i] = nil
			} else {
				args[i] = *p
			}
		case *bool:
			if p == nil {
				args[i] = nil
			} else {
				args[i] = *p
			}
		case string:
		default:
			// String enum members (type E string) print as strings
			if rv := reflect.ValueOf(a); rv.Kind() == reflect.String {
				args[i] = rv.String()
			}
		}
	}
	first, isString := args[0].(string)
	if isString && len(args) == 1 {
		return first
	}
	if !isString {
		parts := make([]string, len(args))
		for i, a := range args {
			parts[i] = tnFormatArg(a)
		}
		return strings.Join(parts, " ")
	}
	var sb strings.Builder
	next := 1
	for j := 0; j < len(first); j++ {
		c := first[j]
		if c == '%' && j+1 < len(first) {
			spec := first[j+1]
			if spec == '%' {
				sb.WriteByte('%')
				j++
				continue
			}
			if next < len(args) && strings.IndexByte("sdifjoOc", spec) >= 0 {
				arg := args[next]
				next++
				j++
				switch spec {
				case 's':
					switch x := arg.(type) {
					case string:
						sb.WriteString(x)
					case float64:
						sb.WriteString(tnInspectNumber(x))
					default:
						sb.WriteString(TnInspect(arg, map[string]interface{}{"depth": float64(0)}))
					}
				case 'd', 'i', 'f':
					if b, ok := arg.(*tnbig.Int); ok {
						sb.WriteString(b.String() + "n")
						break
					}
					n := math.NaN()
					switch x := arg.(type) {
					case float64:
						n = x
					case string:
						n = TnParseFloat(x)
					case bool:
						n = TnNumber(x)
					}
					if spec == 'i' {
						n = math.Trunc(n)
					}
					sb.WriteString(tnInspectNumber(n))
				case 'j':
					sb.WriteString(TnJSONStringify(arg, ""))
				case 'o', 'O':
					sb.WriteString(TnInspect(arg))
				case 'c':
				}
				continue
			}
		}
		sb.WriteByte(c)
	}
	for ; next < len(args); next++ {
		sb.WriteString(" ")
		sb.WriteString(tnFormatArg(args[next]))
	}
	return sb.String()
}

// isDeepStrictEqual / assert.deepStrictEqual (strict) and deepEqual (loose)
func TnDeepEqual(a interface{}, b interface{}, strict bool) bool {
	return tnDeepEqual(reflect.ValueOf(a), reflect.ValueOf(b), strict, 0)
}

func tnDeref(v reflect.Value) reflect.Value {
	for v.IsValid() && v.Kind() == reflect.Interface {
		if v.IsNil() {
			return reflect.Value{}
		}
		v = v.Elem()
	}
	if v.IsValid() && v.Kind() == reflect.Pointer && !v.IsNil() && v.Elem().Kind() == reflect.Slice {
		v = v.Elem()
	}
	return v
}

func tnIsNilValue(v reflect.Value) bool {
	if !v.IsValid() {
		return true
	}
	switch v.Kind() {
	case reflect.Pointer, reflect.Map, reflect.Func, reflect.Chan, reflect.Interface:
		return v.IsNil()
	}
	return false
}

func tnEntriesOf(v reflect.Value) ([][]interface{}, bool) {
	if !v.IsValid() || !v.CanInterface() {
		return nil, false
	}
	if e, ok := v.Interface().(interface{ Entries() [][]interface{} }); ok {
		return e.Entries(), true
	}
	return nil, false
}

// A plain object's properties: structs (class instances, object literals),
// map[string]interface{} and string-keyed TnMaps (Records); ok=false otherwise
func tnObjectFields(v reflect.Value) ([]tnField, string, bool) {
	if !v.IsValid() {
		return nil, "", false
	}
	if entries, ok := tnEntriesOf(v); ok {
		if tnInspectSetLike(v) {
			return nil, "", false
		}
		fields := []tnField{}
		for _, e := range entries {
			key, isString := e[0].(string)
			if !isString {
				return nil, "", false
			}
			fields = append(fields, tnField{name: key, value: e[1]})
		}
		return fields, "", true
	}
	switch v.Kind() {
	case reflect.Map:
		if v.Type().Key().Kind() != reflect.String {
			return nil, "", false
		}
		fields := []tnField{}
		for _, k := range v.MapKeys() {
			fields = append(fields, tnField{name: k.String(), value: v.MapIndex(k).Interface()})
		}
		return fields, "", true
	case reflect.Pointer:
		if v.IsNil() || v.Elem().Kind() != reflect.Struct {
			return nil, "", false
		}
		v = v.Elem()
		fallthrough
	case reflect.Struct:
		fields, _ := tnStructFields(v)
		name := v.Type().Name()
		if !tnInspectClassNames[name] {
			name = ""
		}
		return fields, name, true
	}
	return nil, "", false
}

func tnDeepEqualObjects(af []tnField, bf []tnField, strict bool, level int) bool {
	if len(af) != len(bf) {
		return false
	}
	for _, x := range af {
		found := false
		for _, y := range bf {
			if x.name == y.name {
				if !tnDeepEqual(reflect.ValueOf(x.value), reflect.ValueOf(y.value), strict, level+1) {
					return false
				}
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func tnDeepEqual(a reflect.Value, b reflect.Value, strict bool, level int) bool {
	a, b = tnDeref(a), tnDeref(b)
	if tnIsNilValue(a) || tnIsNilValue(b) {
		return tnIsNilValue(a) && tnIsNilValue(b)
	}
	if level > 100 {
		return true
	}
	if a.Kind() == reflect.Float64 && b.Kind() == reflect.Float64 {
		x, y := a.Float(), b.Float()
		if math.IsNaN(x) && math.IsNaN(y) {
			return true
		}
		if strict && x == 0 && y == 0 {
			return math.Signbit(x) == math.Signbit(y)
		}
		return x == y
	}
	if !strict && a.Kind() != b.Kind() && a.CanInterface() && b.CanInterface() {
		_, aPrim := a.Interface().(string)
		_, bPrim := b.Interface().(string)
		if aPrim || bPrim || a.Kind() == reflect.Float64 || b.Kind() == reflect.Float64 || a.Kind() == reflect.Bool || b.Kind() == reflect.Bool {
			return TnNumber(a.Interface()) == TnNumber(b.Interface())
		}
	}
	if a.CanInterface() && b.CanInterface() {
		if ab, ok := a.Interface().([]byte); ok {
			if bb, ok := b.Interface().([]byte); ok {
				return bytes.Equal(ab, bb)
			}
		}
		if at, ok := a.Interface().(time.Time); ok {
			if bt, ok := b.Interface().(time.Time); ok {
				return at.Equal(bt)
			}
		}
	}
	if a.Kind() == reflect.Pointer && b.Kind() == reflect.Pointer && a.Pointer() == b.Pointer() {
		return true
	}
	if af, aClass, ok := tnObjectFields(a); ok {
		if bf, bClass, ok := tnObjectFields(b); ok {
			if strict && aClass != bClass {
				return false
			}
			return tnDeepEqualObjects(af, bf, strict, level)
		}
	}
	if ae, ok := tnEntriesOf(a); ok {
		be, ok := tnEntriesOf(b)
		if !ok || len(ae) != len(be) {
			return false
		}
		for _, x := range ae {
			found := false
			for _, y := range be {
				if tnDeepEqual(reflect.ValueOf(x[0]), reflect.ValueOf(y[0]), strict, level+1) {
					found = tnDeepEqual(reflect.ValueOf(x[1]), reflect.ValueOf(y[1]), strict, level+1)
					break
				}
			}
			if !found {
				return false
			}
		}
		return true
	}
	if strict && a.Type() != b.Type() {
		aSeq := a.Kind() == reflect.Slice || a.Kind() == reflect.Array
		bSeq := b.Kind() == reflect.Slice || b.Kind() == reflect.Array
		if !(aSeq && bSeq) && !(a.Kind() == reflect.Map && b.Kind() == reflect.Map) {
			return false
		}
	}
	switch a.Kind() {
	case reflect.Slice, reflect.Array:
		if b.Kind() != reflect.Slice && b.Kind() != reflect.Array {
			return false
		}
		if a.Len() != b.Len() {
			return false
		}
		for i := 0; i < a.Len(); i++ {
			if !tnDeepEqual(a.Index(i), b.Index(i), strict, level+1) {
				return false
			}
		}
		return true
	case reflect.Map:
		if b.Kind() != reflect.Map || a.Len() != b.Len() {
			return false
		}
		for _, k := range a.MapKeys() {
			bv := b.MapIndex(k)
			if !bv.IsValid() || !tnDeepEqual(a.MapIndex(k), bv, strict, level+1) {
				return false
			}
		}
		return true
	case reflect.Pointer:
		if b.Kind() != reflect.Pointer {
			return false
		}
		if a.Pointer() == b.Pointer() {
			return true
		}
		return tnDeepEqual(a.Elem(), b.Elem(), strict, level+1)
	case reflect.Struct:
		if b.Kind() != reflect.Struct {
			return false
		}
		af, _ := tnStructFields(a)
		bf, _ := tnStructFields(b)
		if len(af) != len(bf) {
			return false
		}
		for i := range af {
			if af[i].name != bf[i].name || !tnDeepEqual(reflect.ValueOf(af[i].value), reflect.ValueOf(bf[i].value), strict, level+1) {
				return false
			}
		}
		return true
	case reflect.Func:
		return a.Pointer() == b.Pointer()
	}
	if a.CanInterface() && b.CanInterface() {
		if strict {
			return a.Interface() == b.Interface()
		}
		return TnSame(a.Interface(), b.Interface()) || fmt.Sprint(a.Interface()) == fmt.Sprint(b.Interface())
	}
	return false
}

func TnTypeName(v interface{}) string {
	if v == nil {
		return ""
	}
	return reflect.TypeOf(v).String()
}

func TnIsNativeError(v interface{}) bool {
	if _, ok := v.(*TnError); ok {
		return true
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		_, e := tnStructFields(rv.Elem())
		return e != nil
	}
	return false
}

func TnIsMapValue(v interface{}) bool {
	_, ok := v.(interface{ Entries() [][]interface{} })
	return ok && !tnInspectSetLike(reflect.ValueOf(v))
}

func TnIsSetValue(v interface{}) bool {
	_, ok := v.(interface{ Entries() [][]interface{} })
	return ok && tnInspectSetLike(reflect.ValueOf(v))
}

// util.deprecate(fn, msg): the warning prints once, on the first call
func TnDeprecate[F any](fn F, msg string, code ...string) F {
	var once sync.Once
	target := reflect.ValueOf(fn)
	wrapped := reflect.MakeFunc(target.Type(), func(args []reflect.Value) []reflect.Value {
		once.Do(func() {
			prefix := "DeprecationWarning"
			if len(code) > 0 && code[0] != "" {
				prefix = "[" + code[0] + "] DeprecationWarning"
			}
			fmt.Fprintf(os.Stderr, "(node:%d) %s: %s\\n", os.Getpid(), prefix, msg)
		})
		if target.Type().IsVariadic() {
			return target.CallSlice(args)
		}
		return target.Call(args)
	})
	return wrapped.Interface().(F)
}

// util.promisify(fn) of a user function taking (…args, (err, value) => void)
func TnPromisify(fn interface{}) func(args ...interface{}) chan interface{} {
	return func(args ...interface{}) chan interface{} {
		ch := make(chan interface{}, 1)
		TnLoopRef()
		callback := func(cbArgs ...interface{}) {
			defer TnLoopUnref()
			if len(cbArgs) > 0 && cbArgs[0] != nil && !TnIsNil(cbArgs[0]) {
				TnReject(ch, cbArgs[0])
				return
			}
			var value interface{}
			if len(cbArgs) > 1 {
				value = cbArgs[1]
			}
			ch <- value
		}
		TnInvoke(fn, append(append([]interface{}{}, args...), TnCallback(callback))...)
		return ch
	}
}

// util.callbackify(asyncFn): (…args, (err, value) => void)
func TnCallbackify(fn interface{}) func(args ...interface{}) {
	return func(args ...interface{}) {
		if len(args) == 0 {
			return
		}
		cb := args[len(args)-1]
		result := reflect.ValueOf(TnInvoke(fn, args[:len(args)-1]...))
		TnLoopRef()
		go func() {
			defer TnLoopUnref()
			if result.Kind() != reflect.Chan {
				value := result.Interface()
				TnLoopPost(func() { TnInvoke(cb, nil, value) })
				return
			}
			v, ok := result.Recv()
			var reason interface{}
			rejected := false
			if !ok {
				reason, rejected = tnRejections.Load(result.Interface())
			}
			TnLoopPost(func() {
				if rejected {
					TnInvoke(cb, reason)
					return
				}
				var value interface{}
				if v.IsValid() {
					value = v.Interface()
				}
				TnInvoke(cb, nil, value)
			})
		}()
	}
}

var tnAnsiPattern = regexp.MustCompile("[\\\\x1b\\\\x9b][[\\\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\\\d\\\\/#&.:=?%@~_]+)*|[a-zA-Z\\\\d]+(?:;[-a-zA-Z\\\\d\\\\/#&.:=?%@~_]*)*)?\\\\x07)|(?:(?:\\\\d{1,4}(?:;\\\\d{0,4})*)?[\\\\dA-PR-TZcf-ntqry=><~]))")

func TnStripVTControlCharacters(s string) string { return tnAnsiPattern.ReplaceAllString(s, "") }

var tnStyles = map[string][2]int{
	"reset": {0, 0}, "bold": {1, 22}, "dim": {2, 22}, "italic": {3, 23}, "underline": {4, 24},
	"blink": {5, 25}, "inverse": {7, 27}, "hidden": {8, 28}, "strikethrough": {9, 29},
	"black": {30, 39}, "red": {31, 39}, "green": {32, 39}, "yellow": {33, 39}, "blue": {34, 39},
	"magenta": {35, 39}, "cyan": {36, 39}, "white": {37, 39}, "gray": {90, 39}, "grey": {90, 39},
	"bgBlack": {40, 49}, "bgRed": {41, 49}, "bgGreen": {42, 49}, "bgYellow": {43, 49},
	"bgBlue": {44, 49}, "bgMagenta": {45, 49}, "bgCyan": {46, 49}, "bgWhite": {47, 49},
}

// util.styleText(format, text, { validateStream }): colors only when stdout is a TTY
func TnStyleText(format interface{}, text string, options ...interface{}) string {
	names := []string{}
	switch f := format.(type) {
	case string:
		names = append(names, f)
	case []string:
		names = f
	case []interface{}:
		for _, n := range f {
			names = append(names, fmt.Sprint(n))
		}
	}
	validate := true
	if len(options) > 0 && options[0] != nil {
		if v, ok := TnGet(options[0], "validateStream").(bool); ok {
			validate = v
		}
	}
	if validate {
		info, err := os.Stdout.Stat()
		if err != nil || info.Mode()&os.ModeCharDevice == 0 || os.Getenv("NO_COLOR") != "" {
			return text
		}
	}
	for i := len(names) - 1; i >= 0; i-- {
		codes, ok := tnStyles[names[i]]
		if !ok {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'format' must be one of the color names. Received "+tnQuoteJS(names[i])))
		}
		text = fmt.Sprintf("\\x1b[%dm%s\\x1b[%dm", codes[0], text, codes[1])
	}
	return text
}`;
export function registerUtil(r) {
    defineModule(r, 'util');
    defineModule(r, 'util/types');
    r.aliases['sys'] = 'util';
    r.namespaces['util.types'] = 'util/types';
    defineHelper(r, 'nodeUtil', ['bytes', 'fmt', 'math', 'math/big', 'os', 'reflect', 'regexp', 'runtime', 'sort', 'strconv', 'strings', 'sync', 'time', 'unicode/utf8', 'unsafe'], ['error', 'dynamic', 'buffer', 'jsonStringify', 'orderedMap', 'nodeInvoke', 'promise', 'eventLoop'], utilHelper);
    const use = () => r.helper('nodeUtil');
    r.functions['util.format'] = (call) => {
        use();
        return `TnUtilFormat(${call.args.join(', ')})`;
    };
    r.functions['util.formatWithOptions'] = (call) => {
        use();
        return `TnUtilFormat(${call.args.slice(1).join(', ')})`;
    };
    r.functions['util.inspect'] = (call) => {
        use();
        const node = call.nodes[0];
        const isMap = !!node && nodeIsMapVariable(r, node);
        return `${isMap ? 'TnInspectMap' : 'TnInspect'}(${call.args.join(', ')})`;
    };
    r.functions['util.isDeepStrictEqual'] = (call) => {
        use();
        return `TnDeepEqual(${call.args[0]}, ${call.args[1]}, true)`;
    };
    r.functions['util.deprecate'] = (call) => {
        use();
        return `TnDeprecate(${call.args.join(', ')})`;
    };
    r.typers['util.deprecate'] = (c) => c.types[0] ?? '';
    r.functions['util.stripVTControlCharacters'] = (call) => {
        use();
        return `TnStripVTControlCharacters(${call.args[0]})`;
    };
    r.functions['util.styleText'] = (call) => {
        use();
        return `TnStyleText(${call.args.join(', ')})`;
    };
    r.functions['util.promisify'] = (call) => {
        use();
        return `TnPromisify(${call.args[0]})`;
    };
    r.results['util.promisify'] = 'func(...interface{}) chan interface{}';
    r.functions['util.callbackify'] = (call) => {
        use();
        return `TnCallbackify(${call.args[0]})`;
    };
    r.results['util.callbackify'] = 'func(...interface{})';
    r.functions['util.isArray'] = (call) => {
        r.pkg('reflect');
        return `(reflect.ValueOf(${call.args[0]}).Kind() == reflect.Slice)`;
    };
    setResults(r, 'util', 'format=string; formatWithOptions=string; inspect=string; isDeepStrictEqual=bool; stripVTControlCharacters=string; styleText=string; isArray=bool');
    // util.types / node:util/types
    const typeCheck = (name, emit) => {
        r.functions[`util/types.${name}`] = (call) => {
            use();
            return emit(call.args[0]);
        };
        r.results[`util/types.${name}`] = 'bool';
    };
    typeCheck('isDate', (a) => `(TnTypeName(${a}) == "time.Time")`);
    typeCheck('isRegExp', (a) => `(TnTypeName(${a}) == "*regexp.Regexp" || TnTypeName(${a}) == "*main.TnRegex")`);
    typeCheck('isPromise', (a) => `(reflect.ValueOf(${a}).Kind() == reflect.Chan)`);
    typeCheck('isMap', (a) => `TnIsMapValue(${a})`);
    typeCheck('isSet', (a) => `TnIsSetValue(${a})`);
    typeCheck('isNativeError', (a) => `TnIsNativeError(${a})`);
    typeCheck('isUint8Array', (a) => `(TnTypeName(${a}) == "[]uint8")`);
    typeCheck('isAnyArrayBuffer', (_a) => 'false');
    typeCheck('isBoxedPrimitive', (_a) => 'false');
    typeCheck('isGeneratorObject', (a) => `(reflect.ValueOf(${a}).Kind() == reflect.Chan)`);
    typeCheck('isAsyncFunction', (_a) => 'false');
}
// Whether the inspected expression is a Map (not a Record): both lower to TnMap
function nodeIsMapVariable(r, node) {
    if (node.kind === 'NewExpression' && node.expression?.text === 'Map')
        return true;
    return r.categoryOf(node) === 'Map';
}
