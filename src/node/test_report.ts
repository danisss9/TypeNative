// node:test reporting: the runner's events (Node's { type, data } objects)
// and the reporters that turn them into text, ported from Node 24's tap /
// spec / dot / junit / lcov reporters. The runner feeds its events to the
// reporters named by --test-reporter (each writing to its
// --test-reporter-destination); node:test/reporters exports the same
// reporters for run() streams and hand-made event sources.

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule } from './registry.js';

const reportHelper = `// node:test events, as reporters and run() streams see them
type TnTestEvent struct {
	type_ string
	data  *TnTestEventData
}

func (e *TnTestEvent) Get_type_() string { return e.type_ }

// One struct for every event's data (test:pass, test:plan, test:summary …)
type TnTestEventData struct {
	name        string
	nesting     float64
	testNumber  float64
	details     *TnTestEventDetails
	skip        interface{}
	todo        interface{}
	file        string
	line        float64
	column      float64
	count       float64
	message     string
	level       string
	counts      *TnTestCounts
	duration_ms float64
	success     bool
	summary     *TnCoverageSummary
}

type TnTestEventDetails struct {
	duration_ms float64
	type_       string
	error_      interface{}
	passed      bool
}

func (d *TnTestEventDetails) Get_type_() string      { return d.type_ }
func (d *TnTestEventDetails) Get_error() interface{} { return d.error_ }

type TnTestCounts struct {
	tests     float64
	failed    float64
	passed    float64
	cancelled float64
	skipped   float64
	todo      float64
	topLevel  float64
	suites    float64
}

// test:coverage's summary (lines, branches and functions per file)
type TnCoverageSummary struct {
	workingDirectory string
	files            []*TnCoverageFile
	totals           *TnCoverageTotals
}

type TnCoverageFile struct {
	path                   string
	totalLineCount         float64
	totalBranchCount       float64
	totalFunctionCount     float64
	coveredLineCount       float64
	coveredBranchCount     float64
	coveredFunctionCount   float64
	coveredLinePercent     float64
	coveredBranchPercent   float64
	coveredFunctionPercent float64
	functions              []*TnCoverageFunction
	branches               []*TnCoverageCount
	lines                  []*TnCoverageCount
}

type TnCoverageTotals struct {
	totalLineCount         float64
	totalBranchCount       float64
	totalFunctionCount     float64
	coveredLineCount       float64
	coveredBranchCount     float64
	coveredFunctionCount   float64
	coveredLinePercent     float64
	coveredBranchPercent   float64
	coveredFunctionPercent float64
}

type TnCoverageFunction struct {
	name  string
	line  float64
	count float64
}

type TnCoverageCount struct {
	line  float64
	count float64
}

func tnTestStr(v interface{}) string {
	switch s := v.(type) {
	case nil:
		return ""
	case string:
		return s
	}
	return TnJSString(v)
}

func tnTestNum(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	}
	return 0
}

// Elements of an array-like value ([]T, *[]T)
func tnTestList(v interface{}) []interface{} {
	if list, ok := v.([]interface{}); ok {
		return list
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() {
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array {
		return nil
	}
	out := make([]interface{}, rv.Len())
	for i := range out {
		out[i] = rv.Index(i).Interface()
	}
	return out
}

// An event from any source: the runner's own, a decoded run() frame or a
// { type, data } object
func tnTestEventOf(v interface{}) *TnTestEvent {
	if e, ok := v.(*TnTestEvent); ok {
		return e
	}
	e := &TnTestEvent{type_: tnTestStr(TnGet(v, "type")), data: &TnTestEventData{}}
	raw := TnGet(v, "data")
	if d, ok := raw.(*TnTestEventData); ok {
		e.data = d
		return e
	}
	if raw == nil {
		return e
	}
	d := e.data
	d.name = tnTestStr(TnGet(raw, "name"))
	d.nesting = tnTestNum(TnGet(raw, "nesting"))
	d.testNumber = tnTestNum(TnGet(raw, "testNumber"))
	d.skip = TnGet(raw, "skip")
	d.todo = TnGet(raw, "todo")
	d.file = tnTestStr(TnGet(raw, "file"))
	d.line = tnTestNum(TnGet(raw, "line"))
	d.column = tnTestNum(TnGet(raw, "column"))
	d.count = tnTestNum(TnGet(raw, "count"))
	d.message = tnTestStr(TnGet(raw, "message"))
	d.level = tnTestStr(TnGet(raw, "level"))
	d.duration_ms = tnTestNum(TnGet(raw, "duration_ms"))
	d.success, _ = TnGet(raw, "success").(bool)
	if det := TnGet(raw, "details"); det != nil {
		if typed, ok := det.(*TnTestEventDetails); ok {
			d.details = typed
		} else {
			d.details = &TnTestEventDetails{duration_ms: tnTestNum(TnGet(det, "duration_ms")), type_: tnTestStr(TnGet(det, "type")), error_: TnGet(det, "error")}
			d.details.passed, _ = TnGet(det, "passed").(bool)
		}
	}
	if c := TnGet(raw, "counts"); c != nil {
		if typed, ok := c.(*TnTestCounts); ok {
			d.counts = typed
		} else {
			d.counts = &TnTestCounts{tests: tnTestNum(TnGet(c, "tests")), failed: tnTestNum(TnGet(c, "failed")), passed: tnTestNum(TnGet(c, "passed")), cancelled: tnTestNum(TnGet(c, "cancelled")), skipped: tnTestNum(TnGet(c, "skipped")), todo: tnTestNum(TnGet(c, "todo")), topLevel: tnTestNum(TnGet(c, "topLevel")), suites: tnTestNum(TnGet(c, "suites"))}
		}
	}
	if s := TnGet(raw, "summary"); s != nil {
		d.summary = tnCoverageSummaryOf(s)
	}
	return e
}

func tnCoverageSummaryOf(v interface{}) *TnCoverageSummary {
	if s, ok := v.(*TnCoverageSummary); ok {
		return s
	}
	s := &TnCoverageSummary{workingDirectory: tnTestStr(TnGet(v, "workingDirectory")), totals: &TnCoverageTotals{}}
	counts := func(src interface{}) []*TnCoverageCount {
		out := []*TnCoverageCount{}
		for _, item := range tnTestList(src) {
			out = append(out, &TnCoverageCount{line: tnTestNum(TnGet(item, "line")), count: tnTestNum(TnGet(item, "count"))})
		}
		return out
	}
	for _, raw := range tnTestList(TnGet(v, "files")) {
		f := &TnCoverageFile{path: tnTestStr(TnGet(raw, "path"))}
		f.totalLineCount = tnTestNum(TnGet(raw, "totalLineCount"))
		f.totalBranchCount = tnTestNum(TnGet(raw, "totalBranchCount"))
		f.totalFunctionCount = tnTestNum(TnGet(raw, "totalFunctionCount"))
		f.coveredLineCount = tnTestNum(TnGet(raw, "coveredLineCount"))
		f.coveredBranchCount = tnTestNum(TnGet(raw, "coveredBranchCount"))
		f.coveredFunctionCount = tnTestNum(TnGet(raw, "coveredFunctionCount"))
		f.coveredLinePercent = tnTestNum(TnGet(raw, "coveredLinePercent"))
		f.coveredBranchPercent = tnTestNum(TnGet(raw, "coveredBranchPercent"))
		f.coveredFunctionPercent = tnTestNum(TnGet(raw, "coveredFunctionPercent"))
		for _, fn := range tnTestList(TnGet(raw, "functions")) {
			f.functions = append(f.functions, &TnCoverageFunction{name: tnTestStr(TnGet(fn, "name")), line: tnTestNum(TnGet(fn, "line")), count: tnTestNum(TnGet(fn, "count"))})
		}
		f.branches = counts(TnGet(raw, "branches"))
		f.lines = counts(TnGet(raw, "lines"))
		s.files = append(s.files, f)
	}
	if t := TnGet(v, "totals"); t != nil {
		s.totals = &TnCoverageTotals{
			totalLineCount: tnTestNum(TnGet(t, "totalLineCount")), totalBranchCount: tnTestNum(TnGet(t, "totalBranchCount")), totalFunctionCount: tnTestNum(TnGet(t, "totalFunctionCount")),
			coveredLineCount: tnTestNum(TnGet(t, "coveredLineCount")), coveredBranchCount: tnTestNum(TnGet(t, "coveredBranchCount")), coveredFunctionCount: tnTestNum(TnGet(t, "coveredFunctionCount")),
			coveredLinePercent: tnTestNum(TnGet(t, "coveredLinePercent")), coveredBranchPercent: tnTestNum(TnGet(t, "coveredBranchPercent")), coveredFunctionPercent: tnTestNum(TnGet(t, "coveredFunctionPercent")),
		}
	}
	return s
}

// --- reporters ---

type tnTestReporter interface {
	begin() string
	report(e *TnTestEvent) string
	end() string
}

// Node's reporter colors: on when stderr is a terminal (FORCE_COLOR / NO_COLOR win)
func tnTestColorsOn() bool {
	if force, ok := os.LookupEnv("FORCE_COLOR"); ok {
		return force != "0" && force != "false"
	}
	if os.Getenv("NO_COLOR") != "" || os.Getenv("NODE_DISABLE_COLORS") != "" {
		return false
	}
	return TnIsTTY(os.Stderr)
}

type tnTestPalette struct{ on bool }

func (p tnTestPalette) c(code string) string {
	if !p.on {
		return ""
	}
	return "\\x1b[" + code + "m"
}
func (p tnTestPalette) green() string  { return p.c("32") }
func (p tnTestPalette) red() string    { return p.c("31") }
func (p tnTestPalette) gray() string   { return p.c("90") }
func (p tnTestPalette) white() string  { return p.c("39") }
func (p tnTestPalette) blue() string   { return p.c("34") }
func (p tnTestPalette) yellow() string { return p.c("33") }
func (p tnTestPalette) reset() string  { return p.c("0") }

func tnNewTestReporter(name string, colors bool) tnTestReporter {
	p := tnTestPalette{on: colors}
	switch name {
	case "tap":
		return &tnTapReporter{}
	case "spec":
		cwd, _ := os.Getwd()
		return &tnSpecReporter{p: p, cwd: cwd}
	case "dot":
		return &tnDotReporter{p: p, columns: tnTestColumns()}
	case "junit":
		return &tnJunitReporter{}
	case "lcov":
		return &tnLcovReporter{}
	}
	return nil
}

// process.stdout.columns ?? 20 (at least 20)
func tnTestColumns() int {
	if TnIsTTY(os.Stdout) {
		if cols := int(TnTtyColumns(os.Stdout)); cols > 20 {
			return cols
		}
	}
	return 20
}

func tnTestLines(s string) []string {
	return strings.Split(strings.ReplaceAll(s, "\\r\\n", "\\n"), "\\n")
}

func tnTestErrorOf(v interface{}) (*TnError, bool) {
	switch e := v.(type) {
	case *TnError:
		return e, true
	case interface{ TnBaseError() *TnError }:
		return e.TnBaseError(), true
	}
	return nil, false
}

// An error's name: a custom error class's own, else the TnError's
func tnTestErrorName(v interface{}) string {
	if named, ok := v.(interface{ Get_name() string }); ok {
		return named.Get_name()
	}
	if e, ok := tnTestErrorOf(v); ok {
		return e.Get_name()
	}
	return ""
}

func tnTestErrorCode(v interface{}) string {
	if e, ok := tnTestErrorOf(v); ok {
		if e.code != "" {
			return e.code
		}
		code, _ := e.prop("code").(string)
		return code
	}
	return ""
}

// AssertionError messages end with a line break, as node:assert's do
func tnTestErrorMessage(v interface{}) string {
	e, ok := tnTestErrorOf(v)
	if !ok {
		return ""
	}
	msg := e.message
	if tnTestErrorName(v) == "AssertionError" && strings.Contains(msg, "\\n") && !strings.HasSuffix(msg, "\\n") {
		msg += "\\n"
	}
	return msg
}

// The error Node's runner reports: ERR_TEST_FAILURE wrapping what was thrown
func tnTestFailure(cause interface{}, failureType string) *TnError {
	msg := ""
	if s, ok := cause.(string); ok {
		msg = s
	} else if _, ok := tnTestErrorOf(cause); ok {
		msg = tnTestErrorMessage(cause)
	} else {
		msg = TnInspect(cause)
	}
	e := TnNodeError("Error", "ERR_TEST_FAILURE", msg)
	e.props["failureType"] = failureType
	e.props["cause"] = cause
	return e
}

func tnTestFailureType(v interface{}) string {
	if e, ok := tnTestErrorOf(v); ok {
		s, _ := e.prop("failureType").(string)
		return s
	}
	return ""
}

// util.inspect of an error as the reporters show it ("Name [code]: message")
func tnTestInspectError(v interface{}) string {
	if _, ok := tnTestErrorOf(v); !ok {
		return TnInspect(v)
	}
	head := tnTestErrorName(v)
	if code := tnTestErrorCode(v); code != "" {
		head += " [" + code + "]"
	}
	return head + ": " + tnTestErrorMessage(v)
}

// --- tap ---

type tnTapReporter struct{ started bool }

func (r *tnTapReporter) begin() string {
	if r.started {
		return ""
	}
	r.started = true
	return "TAP version 13\\n"
}

func (r *tnTapReporter) end() string { return r.begin() }

func (r *tnTapReporter) report(e *TnTestEvent) string {
	out := r.begin()
	d := e.data
	indent := strings.Repeat("    ", int(d.nesting))
	switch e.type_ {
	case "test:fail":
		location := ""
		if d.file != "" {
			location = d.file + ":" + TnNumStr(d.line) + ":" + TnNumStr(d.column)
		}
		out += tnTapTestLine(indent, d, "not ok") + tnTapDetails(indent, d.details, location)
	case "test:pass":
		out += tnTapTestLine(indent, d, "ok") + tnTapDetails(indent, d.details, "")
	case "test:plan":
		out += indent + "1.." + TnNumStr(d.count) + "\\n"
	case "test:start":
		out += indent + "# Subtest: " + tnTapEscape(d.name) + "\\n"
	case "test:stdout", "test:stderr":
		for _, line := range tnTestLines(d.message) {
			if line != "" {
				out += "# " + tnTapEscape(line) + "\\n"
			}
		}
	case "test:diagnostic":
		out += indent + "# " + tnTapEscape(d.message) + "\\n"
	case "test:coverage":
		if d.summary != nil {
			out += tnCoverageReport(indent, d.summary, "# ", "", tnTestPalette{}, true)
		}
	}
	return out
}

func tnTapEscape(s string) string {
	s = strings.ReplaceAll(s, "\\\\", "\\\\\\\\")
	s = strings.ReplaceAll(s, "#", "\\\\#")
	s = strings.ReplaceAll(s, "\\b", "\\\\b")
	s = strings.ReplaceAll(s, "\\f", "\\\\f")
	s = strings.ReplaceAll(s, "\\t", "\\\\t")
	s = strings.ReplaceAll(s, "\\n", "\\\\n")
	s = strings.ReplaceAll(s, "\\r", "\\\\r")
	s = strings.ReplaceAll(s, "\\v", "\\\\v")
	return s
}

func tnTapTestLine(indent string, d *TnTestEventData, status string) string {
	line := indent + status + " " + TnNumStr(d.testNumber)
	if d.name != "" {
		line += " " + tnTapEscape("- "+d.name)
	}
	if d.skip != nil {
		line += " # SKIP"
		if s, ok := d.skip.(string); ok && s != "" {
			line += " " + tnTapEscape(s)
		}
	} else if d.todo != nil {
		line += " # TODO"
		if s, ok := d.todo.(string); ok && s != "" {
			line += " " + tnTapEscape(s)
		}
	}
	return line + "\\n"
}

func tnTapDetails(indent string, details *TnTestEventDetails, location string) string {
	out := indent + "  ---\\n"
	if details != nil {
		out += tnTapYaml(indent, "duration_ms", details.duration_ms, nil)
		if details.type_ != "" {
			out += tnTapYaml(indent, "type", details.type_, nil)
		}
	}
	if location != "" {
		out += tnTapYaml(indent, "location", location, nil)
	}
	if details != nil && details.error_ != nil {
		out += tnTapYaml(indent, "", details.error_, map[uintptr]bool{})
	}
	return out + indent + "  ...\\n"
}

// Identity of a reference value, for circular references (0 for the rest)
func tnTestIdentity(v interface{}) uintptr {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Pointer, reflect.Map, reflect.Slice:
		return rv.Pointer()
	}
	return 0
}

// null where undefined and null differ (YAML's ~)
type tnTestNullValue struct{}

var tnTestNull = &tnTestNullValue{}

// Node's jsToYaml: a key and its value as YAML lines
func tnTapYaml(indent string, name string, value interface{}, seen map[uintptr]bool) string {
	if value == tnTestNull {
		return indent + "  " + name + ": ~\\n"
	}
	if value == nil || TnIsNil(value) {
		return ""
	}
	prefix := indent + "  " + name + ":"
	switch v := value.(type) {
	case string:
		lines := tnTestLines(v)
		if len(lines) == 1 {
			return prefix + " " + TnInspect(v) + "\\n"
		}
		out := prefix + " |-\\n"
		for _, line := range lines {
			out += indent + "    " + line + "\\n"
		}
		return out
	case float64, bool, int:
		return prefix + " " + TnInspect(v) + "\\n"
	}
	if _, isErr := tnTestErrorOf(value); isErr {
		return tnTapYamlError(indent, name, value, seen)
	}
	rv := reflect.ValueOf(value)
	isList := rv.Kind() == reflect.Slice || rv.Kind() == reflect.Array
	entries := [][]interface{}{}
	if isList {
		for i, item := range tnTestList(value) {
			entries = append(entries, []interface{}{strconv.Itoa(i), item})
		}
	} else if rv.Kind() == reflect.Map || (rv.Kind() == reflect.Pointer && rv.Elem().Kind() == reflect.Struct) || TnKeys(value) != nil {
		entries = TnEntries(value)
	} else {
		return prefix + " " + TnInspect(value) + "\\n"
	}
	if seen == nil {
		seen = map[uintptr]bool{}
	}
	if id := tnTestIdentity(value); id != 0 {
		seen[id] = true
	}
	result := ""
	propsIndent := indent
	if name != "" {
		result += prefix + "\\n"
		propsIndent += "  "
	}
	for _, entry := range entries {
		key := tnTestStr(entry[0])
		if id := tnTestIdentity(entry[1]); id != 0 && seen[id] {
			result += propsIndent + "  " + key + ": <Circular>\\n"
			continue
		}
		result += tnTapYaml(propsIndent, key, entry[1], seen)
	}
	return result
}

var tnTestUnwrapped = map[string]bool{"testCodeFailure": true, "hookFailure": true, "uncaughtException": true, "unhandledRejection": true}

func tnTestCopySeen(seen map[uintptr]bool) map[uintptr]bool {
	out := map[uintptr]bool{}
	for k, v := range seen {
		out[k] = v
	}
	return out
}

// An error: its own properties, then error / code / name (and an assertion's
// expected / actual / operator), unwrapping ERR_TEST_FAILURE's cause
func tnTapYamlError(indent string, name string, value interface{}, seen map[uintptr]bool) string {
	err, _ := tnTestErrorOf(value)
	result := ""
	propsIndent := indent
	if name != "" {
		result += indent + "  " + name + ":\\n"
		propsIndent += "  "
	}
	keys := []string{}
	for k := range err.props {
		switch k {
		case "cause", "code", "name", "message", "stack":
			continue
		}
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if (keys[i] == "failureType") != (keys[j] == "failureType") {
			return keys[i] == "failureType"
		}
		return keys[i] < keys[j]
	})
	for _, k := range keys {
		result += tnTapYaml(propsIndent, k, err.props[k], seen)
	}
	msg := tnTestErrorMessage(value)
	errName := tnTestErrorName(value)
	errCode := tnTestErrorCode(value)
	var expected, actual, operator interface{}
	isAssertion := false
	assertionOf := func(e *TnError) bool {
		_, hasExpected := e.props["expected"]
		_, hasActual := e.props["actual"]
		return hasExpected && hasActual
	}
	if assertionOf(err) {
		expected, actual, operator, isAssertion = err.props["expected"], err.props["actual"], err.props["operator"], true
	}
	if errCode == "ERR_TEST_FAILURE" && tnTestUnwrapped[tnTestFailureType(value)] {
		cause := err.prop("cause")
		if c, ok := tnTestErrorOf(cause); ok {
			msg = tnTestErrorMessage(cause)
			if code := tnTestErrorCode(cause); code != "" {
				errCode = code
			}
			errName = tnTestErrorName(cause)
			if assertionOf(c) {
				expected, actual, isAssertion = c.props["expected"], c.props["actual"], true
				if op := c.props["operator"]; op != nil {
					operator = op
				}
			}
		}
	}
	result += tnTapYaml(indent, "error", msg, seen)
	if errCode != "" {
		result += tnTapYaml(indent, "code", errCode, seen)
	}
	if errName != "" && errName != "Error" {
		result += tnTapYaml(indent, "name", errName, seen)
	}
	if isAssertion {
		result += tnTapYaml(indent, "expected", expected, tnTestCopySeen(seen))
		result += tnTapYaml(indent, "actual", actual, tnTestCopySeen(seen))
		if op, ok := operator.(string); ok && op != "" {
			result += tnTapYaml(indent, "operator", op, seen)
		}
	}
	return result
}

// --- spec ---

type tnSpecReporter struct {
	p        tnTestPalette
	cwd      string
	stack    []*TnTestEventData
	reported []*TnTestEventData
	failed   []*TnTestEventData
}

func (r *tnSpecReporter) begin() string { return "" }
func (r *tnSpecReporter) end() string   { return r.failures() }

func tnSpecIndent(nesting float64) string { return strings.Repeat("  ", int(nesting)) }

func (r *tnSpecReporter) report(e *TnTestEvent) string {
	d := e.data
	switch e.type_ {
	case "test:fail":
		if d.details == nil || tnTestFailureType(d.details.error_) != "subtestsFailed" {
			r.failed = append(r.failed, d)
		}
		return r.result(e.type_, d)
	case "test:pass":
		return r.result(e.type_, d)
	case "test:start":
		r.stack = append([]*TnTestEventData{d}, r.stack...)
	case "test:stdout", "test:stderr":
		return d.message
	case "test:diagnostic":
		color := r.p.blue()
		if d.level == "warn" {
			color = r.p.yellow()
		} else if d.level == "error" {
			color = r.p.red()
		}
		return color + tnSpecIndent(d.nesting) + "\\u2139 " + d.message + r.p.white() + "\\n"
	case "test:coverage":
		if d.summary != nil {
			return tnCoverageReport(tnSpecIndent(d.nesting), d.summary, "\\u2139 ", r.p.blue(), r.p, true)
		}
	case "test:summary":
		// only the root's summary (run() also reports one per file)
		if d.file == "" {
			return r.failures()
		}
	}
	return ""
}

// A test's line, after the ▶ lines of its parents not shown yet
func (r *tnSpecReporter) result(kind string, d *TnTestEventData) string {
	if len(r.stack) > 0 {
		r.stack = r.stack[1:]
	}
	prefix := ""
	for len(r.stack) > 0 {
		parent := r.stack[len(r.stack)-1]
		r.stack = r.stack[:len(r.stack)-1]
		r.reported = append([]*TnTestEventData{parent}, r.reported...)
		prefix += tnSpecIndent(parent.nesting) + "\\u25b6 " + parent.name + "\\n"
	}
	hasChildren := false
	if len(r.reported) > 0 && r.reported[0].nesting == d.nesting && r.reported[0].name == d.name {
		r.reported = r.reported[1:]
		hasChildren = true
	}
	_ = hasChildren
	return tnSpecFormat(kind, d, false, prefix, tnSpecIndent(d.nesting), r.p) + "\\n"
}

func (r *tnSpecReporter) failures() string {
	if len(r.failed) == 0 {
		return ""
	}
	parts := []string{"\\n" + r.p.red() + "\\u2716 failing tests:" + r.p.white() + "\\n"}
	for _, t := range r.failed {
		if t.file != "" {
			rel, err := filepath.Rel(r.cwd, t.file)
			if err != nil {
				rel = t.file
			}
			parts = append(parts, "test at "+rel+":"+TnNumStr(t.line)+":"+TnNumStr(t.column))
		}
		parts = append(parts, tnSpecFormat("test:fail", t, true, "", "", r.p))
	}
	r.failed = nil
	return strings.Join(parts, "\\n")
}

// Node's formatTestReport
func tnSpecFormat(kind string, d *TnTestEventData, showError bool, prefix string, indent string, p tnTestPalette) string {
	color, symbol := p.green(), "\\u2714 "
	if kind == "test:fail" {
		color, symbol = p.red(), "\\u2716 "
	}
	title := d.name
	if d.details != nil && d.details.duration_ms != 0 {
		title += " " + p.gray() + "(" + TnNumStr(d.details.duration_ms) + "ms)" + p.white()
	}
	if d.skip != nil {
		msg, _ := d.skip.(string)
		if msg == "" {
			msg = "SKIP"
		}
		title += " # " + msg
		color, symbol = p.gray(), "\\ufe63 "
	} else if d.todo != nil {
		msg, _ := d.todo.(string)
		if msg == "" {
			msg = "TODO"
		}
		title += " # " + msg
		if kind == "test:fail" {
			color, symbol = p.yellow(), "\\u26a0 "
		}
	}
	errText := ""
	if showError && kind == "test:fail" && d.todo == nil && d.details != nil && d.details.error_ != nil {
		errText = tnSpecError(d.details.error_, indent)
	}
	return prefix + indent + color + symbol + title + p.white() + errText
}

func tnSpecError(err interface{}, indent string) string {
	shown := err
	if tnTestErrorCode(err) == "ERR_TEST_FAILURE" {
		if e, ok := tnTestErrorOf(err); ok {
			shown = e.prop("cause")
		}
	}
	lines := tnTestLines(tnTestInspectError(shown))
	return "\\n" + indent + "  " + strings.Join(lines, "\\n"+indent+"  ") + "\\n"
}

// --- dot ---

type tnDotReporter struct {
	p       tnTestPalette
	count   int
	columns int
	failed  []*TnTestEventData
}

func (r *tnDotReporter) begin() string { return "" }

func (r *tnDotReporter) report(e *TnTestEvent) string {
	out := ""
	switch e.type_ {
	case "test:pass":
		out = r.p.green() + "." + r.p.reset()
	case "test:fail":
		out = r.p.red() + "X" + r.p.reset()
		r.failed = append(r.failed, e.data)
	default:
		return ""
	}
	r.count++
	if r.count == r.columns {
		out += "\\n"
		r.count = 0
	}
	return out
}

func (r *tnDotReporter) end() string {
	out := "\\n"
	if len(r.failed) > 0 {
		out += "\\n" + r.p.red() + "Failed tests:" + r.p.white() + "\\n\\n"
		for _, t := range r.failed {
			out += tnSpecFormat("test:fail", t, true, "", "", r.p)
		}
	}
	r.failed = nil
	return out
}

// --- junit ---

type tnJunitNode struct {
	tag      string
	keys     []string
	values   map[string]string
	nesting  int
	parent   *tnJunitNode
	children []*tnJunitNode
	comment  string
	isNote   bool
	text     string
	isText   bool
}

func (n *tnJunitNode) set(key string, value string) {
	if n.values == nil {
		n.values = map[string]string{}
	}
	if _, ok := n.values[key]; !ok {
		n.keys = append(n.keys, key)
	}
	n.values[key] = value
}

type tnJunitReporter struct {
	current *tnJunitNode
	roots   []*tnJunitNode
}

func (r *tnJunitReporter) begin() string { return "" }

func (r *tnJunitReporter) start(name string, nesting int) {
	parent := r.current
	r.current = &tnJunitNode{nesting: nesting, parent: parent}
	r.current.set("name", name)
	if parent != nil {
		parent.children = append(parent.children, r.current)
	} else {
		r.roots = append(r.roots, r.current)
	}
}

func tnJunitIsFailure(n *tnJunitNode) bool {
	for _, c := range n.children {
		if c.tag == "failure" {
			return true
		}
	}
	return n.values["failures"] != "" && n.values["failures"] != "0"
}

// (as in Node, a suite with failures counts as skipped too)
func tnJunitIsSkipped(n *tnJunitNode) bool {
	for _, c := range n.children {
		if c.tag == "skipped" {
			return true
		}
	}
	return n.values["failures"] != "" && n.values["failures"] != "0"
}

func (r *tnJunitReporter) report(e *TnTestEvent) string {
	d := e.data
	switch e.type_ {
	case "test:start":
		r.start(d.name, int(d.nesting))
	case "test:pass", "test:fail":
		if r.current == nil {
			r.start("root", 0)
		}
		if r.current.values["name"] != d.name || r.current.nesting != int(d.nesting) {
			r.start(d.name, int(d.nesting))
		}
		test := r.current
		if r.current.nesting == int(d.nesting) {
			r.current = r.current.parent
		}
		duration := 0.0
		if d.details != nil {
			duration = d.details.duration_ms
		}
		test.set("time", strconv.FormatFloat(duration/1000, 'f', 6, 64))
		children := 0
		for _, c := range test.children {
			if !c.isNote {
				children++
			}
		}
		if children > 0 {
			test.tag = "testsuite"
			test.set("disabled", "0")
			test.set("errors", "0")
			test.set("tests", strconv.Itoa(children))
			failures, skipped := 0, 0
			for _, c := range test.children {
				if tnJunitIsFailure(c) {
					failures++
				}
				if tnJunitIsSkipped(c) {
					skipped++
				}
			}
			test.set("failures", strconv.Itoa(failures))
			test.set("skipped", strconv.Itoa(skipped))
			test.set("timestamp", time.Now().UTC().Format("2006-01-02T15:04:05.000Z"))
			host, _ := os.Hostname()
			test.set("hostname", host)
		} else {
			test.tag = "testcase"
			test.set("classname", "test")
			if d.file != "" {
				test.set("file", d.file)
			}
			child := func(tag string) *tnJunitNode {
				n := &tnJunitNode{tag: tag, nesting: int(d.nesting) + 1}
				test.children = append(test.children, n)
				return n
			}
			if d.skip != nil && d.skip != false {
				n := child("skipped")
				n.set("type", "skipped")
				n.set("message", tnTestStr(d.skip))
			}
			if d.todo != nil && d.todo != false {
				n := child("skipped")
				n.set("type", "todo")
				n.set("message", tnTestStr(d.todo))
			}
			if e.type_ == "test:fail" {
				var err interface{}
				if d.details != nil {
					err = d.details.error_
				}
				msg := tnTestErrorMessage(err)
				kind := tnTestFailureType(err)
				if kind == "" {
					kind = tnTestErrorCode(err)
				}
				n := child("failure")
				n.set("type", kind)
				n.set("message", strings.TrimSpace(msg))
				n.children = []*tnJunitNode{{isText: true, text: tnJunitErrorText(err)}}
				test.set("failure", msg)
			}
		}
	case "test:diagnostic":
		note := &tnJunitNode{nesting: int(d.nesting), isNote: true, comment: d.message}
		if r.current != nil {
			r.current.children = append(r.current.children, note)
		} else {
			r.roots = append(r.roots, note)
		}
	}
	return ""
}

// util.inspect of the ERR_TEST_FAILURE wrapper, without its stack
func tnJunitErrorText(err interface{}) string {
	if tnTestErrorCode(err) != "ERR_TEST_FAILURE" {
		return tnTestInspectError(err)
	}
	e, _ := tnTestErrorOf(err)
	head := "[Error [ERR_TEST_FAILURE]: " + tnTestErrorMessage(err) + "]"
	cause := tnTestInspectError(e.prop("cause"))
	failureType := TnInspect(tnTestFailureType(err))
	if !strings.Contains(head+cause, "\\n") {
		return head + " { code: 'ERR_TEST_FAILURE', failureType: " + failureType + ", cause: " + cause + " }"
	}
	return head + " {\\n  code: 'ERR_TEST_FAILURE',\\n  failureType: " + failureType + ",\\n  cause: " + strings.ReplaceAll(cause, "\\n", "\\n  ") + "\\n}"
}

func tnJunitContent(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	return strings.ReplaceAll(s, "<", "&lt;")
}

func tnJunitAttr(s string) string {
	s = strings.ReplaceAll(tnJunitContent(s), "\\"", "&quot;")
	return strings.ReplaceAll(s, "\\n", "&#10;")
}

func tnJunitXML(n *tnJunitNode) string {
	if n.isText {
		return tnJunitContent(n.text) + "\\n"
	}
	indent := strings.Repeat("\\t", n.nesting+1)
	if n.isNote {
		return indent + "<!-- " + strings.ReplaceAll(n.comment, "--", "&#45;&#45;") + " -->\\n"
	}
	attrs := []string{}
	for _, k := range n.keys {
		attrs = append(attrs, k+"=\\""+tnJunitAttr(n.values[k])+"\\"")
	}
	if len(n.children) == 0 {
		return indent + "<" + n.tag + " " + strings.Join(attrs, " ") + "/>\\n"
	}
	out := indent + "<" + n.tag + " " + strings.Join(attrs, " ") + ">\\n"
	for _, c := range n.children {
		out += tnJunitXML(c)
	}
	return out + indent + "</" + n.tag + ">\\n"
}

func (r *tnJunitReporter) end() string {
	out := "<?xml version=\\"1.0\\" encoding=\\"utf-8\\"?>\\n<testsuites>\\n"
	for _, n := range r.roots {
		out += tnJunitXML(n)
	}
	r.roots = nil
	return out + "</testsuites>\\n"
}

// --- lcov ---

type tnLcovReporter struct{}

func (r *tnLcovReporter) begin() string { return "" }
func (r *tnLcovReporter) end() string   { return "" }

func (r *tnLcovReporter) report(e *TnTestEvent) string {
	if e.type_ != "test:coverage" || e.data.summary == nil {
		return ""
	}
	s := e.data.summary
	var b strings.Builder
	for _, f := range s.files {
		b.WriteString("TN:\\n")
		rel, err := filepath.Rel(s.workingDirectory, f.path)
		if err != nil {
			rel = f.path
		}
		b.WriteString("SF:" + rel + "\\n")
		names := make([]string, len(f.functions))
		for j, fn := range f.functions {
			names[j] = fn.name
			if names[j] == "" {
				names[j] = "anonymous_" + strconv.Itoa(j)
			}
			b.WriteString("FN:" + TnNumStr(fn.line) + "," + names[j] + "\\n")
		}
		for j, fn := range f.functions {
			b.WriteString("FNDA:" + TnNumStr(fn.count) + "," + names[j] + "\\n")
		}
		b.WriteString("FNF:" + TnNumStr(f.totalFunctionCount) + "\\n")
		b.WriteString("FNH:" + TnNumStr(f.coveredFunctionCount) + "\\n")
		for j, br := range f.branches {
			b.WriteString("BRDA:" + TnNumStr(br.line) + "," + strconv.Itoa(j) + ",0," + TnNumStr(br.count) + "\\n")
		}
		b.WriteString("BRF:" + TnNumStr(f.totalBranchCount) + "\\n")
		b.WriteString("BRH:" + TnNumStr(f.coveredBranchCount) + "\\n")
		lines := append([]*TnCoverageCount{}, f.lines...)
		sort.SliceStable(lines, func(i, j int) bool { return lines[i].line < lines[j].line })
		for _, l := range lines {
			b.WriteString("DA:" + TnNumStr(l.line) + "," + TnNumStr(l.count) + "\\n")
		}
		b.WriteString("LH:" + TnNumStr(f.coveredLineCount) + "\\n")
		b.WriteString("LF:" + TnNumStr(f.totalLineCount) + "\\n")
		b.WriteString("end_of_record\\n")
	}
	return b.String()
}

// --- the coverage table (tap and spec) ---

type tnCoverageDir struct {
	name     string
	children []*tnCoverageDir
	file     *TnCoverageFile
}

func (d *tnCoverageDir) child(name string) *tnCoverageDir {
	for _, c := range d.children {
		if c.name == name {
			return c
		}
	}
	c := &tnCoverageDir{name: name}
	d.children = append(d.children, c)
	return c
}

func tnCoverageUncovered(lines []*TnCoverageCount) string {
	ranges := [][]float64{}
	for _, l := range lines {
		if l.count != 0 {
			continue
		}
		if n := len(ranges); n > 0 && l.line-ranges[n-1][len(ranges[n-1])-1] == 1 {
			if len(ranges[n-1]) == 1 {
				ranges[n-1] = append(ranges[n-1], l.line)
			} else {
				ranges[n-1][1] = l.line
			}
			continue
		}
		ranges = append(ranges, []float64{l.line})
	}
	parts := make([]string, len(ranges))
	for i, r := range ranges {
		parts[i] = TnNumStr(r[0])
		if len(r) > 1 {
			parts[i] += "-" + TnNumStr(r[1])
		}
	}
	return strings.Join(parts, " ")
}

// Node's getCoverageReport: a table of the files (grouped by directory) and the totals
func tnCoverageReport(pad string, s *TnCoverageSummary, symbol string, color string, p tnTestPalette, table bool) string {
	prefix := pad + symbol
	var b strings.Builder
	b.WriteString(color + prefix + "start of coverage report\\n")
	root := &tnCoverageDir{}
	depth, longest := 1, 0
	for _, f := range s.files {
		rel, err := filepath.Rel(s.workingDirectory, f.path)
		if err != nil {
			rel = f.path
		}
		parts := strings.Split(rel, string(filepath.Separator))
		node := root
		for _, part := range parts {
			node = node.child(part)
			if len(part) > longest {
				longest = len(part)
			}
		}
		node.file = f
		if len(parts) > depth {
			depth = len(parts)
		}
	}
	columns := []string{"line %", "branch %", "funcs %"}
	filePad := longest + depth - 1
	if color != "" {
		filePad += 2
	}
	if filePad < len("all files") {
		filePad = len("all files")
	}
	columnPads := []int{}
	columnsWidth := 0
	for _, c := range columns {
		w := len(c)
		if w < 6 {
			w = 6
		}
		columnPads = append(columnPads, w)
		columnsWidth += w + 3
	}
	uncoveredPad := len("uncovered lines")
	for _, f := range s.files {
		if n := len(tnCoverageUncovered(f.lines)); n > uncoveredPad {
			uncoveredPad = n
		}
	}
	tableWidth := filePad + 2 + columnsWidth + uncoveredPad + 2
	cell := func(text string, width int, padStart bool, coverage float64, colored bool) string {
		for len([]rune(text)) < width {
			if padStart {
				text = " " + text
			} else {
				text += " "
			}
		}
		if color != "" && colored {
			shade := p.red()
			if coverage > 90 {
				shade = p.green()
			} else if coverage > 50 {
				shade = p.yellow()
			}
			return shade + text + color
		}
		return text
	}
	line := func(file string, depth int, coverages []interface{}, fileCoverage float64, fileColored bool, uncovered string) string {
		name := file
		if r := []rune(name); len(r) > filePad-depth && filePad-depth > 0 {
			name = "\\u2026" + string(r[len(r)-(filePad-depth)+1:])
		}
		cols := make([]string, len(coverages))
		for j, c := range coverages {
			if pct, ok := c.(float64); ok {
				cols[j] = cell(strconv.FormatFloat(pct, 'f', 2, 64), columnPads[j], true, pct, true)
			} else {
				cols[j] = cell(tnTestStr(c), columnPads[j], true, 0, c != nil && !isColumnTitle(c))
			}
		}
		return prefix + strings.Repeat(" ", depth) + cell(name, filePad-depth, false, fileCoverage, fileColored) + " | " + strings.Join(cols, " | ") + " | " + uncovered + "\\n"
	}
	rule := func() {
		if table {
			b.WriteString(prefix + strings.Repeat("-", tableWidth) + "\\n")
		}
	}
	rule()
	b.WriteString(line("file", 0, []interface{}{tnCoverageTitle("line %"), tnCoverageTitle("branch %"), tnCoverageTitle("funcs %")}, 0, false, "uncovered lines"))
	rule()
	var walk func(dir *tnCoverageDir, depth int)
	walk = func(dir *tnCoverageDir, depth int) {
		for _, c := range dir.children {
			if c.file != nil {
				f := c.file
				coverage := (f.coveredLinePercent + f.coveredBranchPercent + f.coveredFunctionPercent) / 3
				b.WriteString(line(c.name, depth, []interface{}{f.coveredLinePercent, f.coveredBranchPercent, f.coveredFunctionPercent}, coverage, true, tnCoverageUncovered(f.lines)))
			} else {
				b.WriteString(line(c.name, depth, []interface{}{"", "", ""}, 0, false, ""))
				walk(c, depth+1)
			}
		}
	}
	walk(root, 0)
	rule()
	t := s.totals
	if t == nil {
		t = &TnCoverageTotals{}
	}
	b.WriteString(line("all files", 0, []interface{}{t.coveredLinePercent, t.coveredBranchPercent, t.coveredFunctionPercent}, 0, false, ""))
	rule()
	b.WriteString(prefix + "end of coverage report\\n")
	if color != "" {
		b.WriteString(p.white())
	}
	return b.String()
}

// The header's column titles, which are never colored
type tnCoverageTitle string

func isColumnTitle(v interface{}) bool {
	_, ok := v.(tnCoverageTitle)
	return ok
}`;

const reportersHelper = `// --- node:test/reporters: the reporters over any event source ---

// The events of a source: an array, an async generator (channel) or a
// readable stream (run()'s TestsStream, Readable.from); posts each one to fn
// on the event loop, then done
func tnTestEachEvent(source interface{}, fn func(e *TnTestEvent), done func()) {
	if s, ok := source.(*TnStream); ok {
		source = s.tnIterator()
	}
	rv := reflect.ValueOf(source)
	if rv.Kind() != reflect.Chan {
		for _, item := range tnTestList(source) {
			fn(tnTestEventOf(item))
		}
		done()
		return
	}
	TnLoopRef()
	go func() {
		for {
			v, ok := rv.Recv()
			if !ok {
				break
			}
			item := v.Interface()
			TnLoopPost(func() { fn(tnTestEventOf(item)) })
		}
		TnLoopPost(func() {
			defer TnLoopUnref()
			done()
		})
	}()
}

// tap / dot / junit (source): an async generator of the reporter's text
func TnTestReporterOver(name string, source interface{}) chan string {
	reporter := tnNewTestReporter(name, tnTestColorsOn())
	out := make(chan string, 65536)
	if head := reporter.begin(); head != "" {
		out <- head
	}
	tnTestEachEvent(source, func(e *TnTestEvent) {
		if text := reporter.report(e); text != "" {
			out <- text
		}
	}, func() {
		if text := reporter.end(); text != "" {
			out <- text
		}
		close(out)
	})
	return out
}

func TnTestReporterTap(source interface{}) chan string   { return TnTestReporterOver("tap", source) }
func TnTestReporterDot(source interface{}) chan string   { return TnTestReporterOver("dot", source) }
func TnTestReporterJunit(source interface{}) chan string { return TnTestReporterOver("junit", source) }

// new spec() / new lcov(): a Transform from events (object mode) to text
func TnNewTestReporterStream(name string) *TnStream {
	reporter := tnNewTestReporter(name, tnTestColorsOn())
	s := TnNewTransform()
	s.objectMode = true
	s.setHook("_transform", func(chunk interface{}, encoding string, cb func(...interface{})) {
		if text := reporter.report(tnTestEventOf(chunk)); text != "" {
			s.push(text)
		}
		cb()
	})
	s.setHook("_flush", func(cb func(...interface{})) {
		if text := reporter.end(); text != "" {
			s.push(text)
		}
		cb()
	})
	return s
}

func TnTestReporterSpec() *TnStream { return TnNewTestReporterStream("spec") }
func TnTestReporterLcov() *TnStream { return TnNewTestReporterStream("lcov") }`;

export function registerTestReporters(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeTestReport',
    ['os', 'path/filepath', 'reflect', 'sort', 'strconv', 'strings', 'time'],
    ['nodeTty', 'nodeUtil', 'nodeProcess', 'dynamic', 'error'],
    reportHelper
  );
  // Test durations: Go's monotonic clock on Windows ticks too coarsely for them
  defineHelper(
    r,
    'nodeTestClock@windows',
    ['syscall', 'unsafe'],
    [],
    `// Milliseconds from QueryPerformanceCounter (what Node's hrtime reads)
var tnQPC = syscall.NewLazyDLL("kernel32.dll").NewProc("QueryPerformanceCounter")
var tnQPF = syscall.NewLazyDLL("kernel32.dll").NewProc("QueryPerformanceFrequency")

func tnTestNow() float64 {
	var count, frequency int64
	tnQPC.Call(uintptr(unsafe.Pointer(&count)))
	tnQPF.Call(uintptr(unsafe.Pointer(&frequency)))
	if frequency == 0 {
		return 0
	}
	return float64(count) / float64(frequency) * 1000
}`
  );
  defineHelper(
    r,
    'nodeTestClock@other',
    ['time'],
    [],
    `var tnTestEpoch = time.Now()

// Milliseconds on the monotonic clock
func tnTestNow() float64 { return float64(time.Since(tnTestEpoch).Nanoseconds()) / 1e6 }`
  );
  defineHelper(r, 'nodeTestReporters', ['reflect'], ['nodeTestReport', 'nodeStream', 'eventLoop'], reportersHelper);
  const use = () => r.helper('nodeTestReporters');

  // Event data, for typed reads in run() listeners (stream.on('test:pass', (data) => …))
  defineClass(r, 'test.TestEvent', '*TnTestEvent', 'class', '', 'data=*TnTestEventData', 'type=string', '');
  defineClass(
    r,
    'test.TestEventData',
    '*TnTestEventData',
    'class',
    '',
    'name=string; nesting=float64; testNumber=float64; details=*TnTestEventDetails; skip=interface{}; todo=interface{}; file=string; line=float64; column=float64; count=float64; message=string; level=string; counts=*TnTestCounts; duration_ms=float64; success=bool; summary=*TnCoverageSummary',
    '',
    ''
  );
  defineClass(r, 'test.TestEventDetails', '*TnTestEventDetails', 'class', '', 'duration_ms=float64; passed=bool', 'type=string; error=interface{}', '');
  defineClass(
    r,
    'test.TestCounts',
    '*TnTestCounts',
    'class',
    '',
    'tests=float64; failed=float64; passed=float64; cancelled=float64; skipped=float64; todo=float64; topLevel=float64; suites=float64',
    '',
    ''
  );
  const counts =
    'totalLineCount=float64; totalBranchCount=float64; totalFunctionCount=float64; coveredLineCount=float64; coveredBranchCount=float64; coveredFunctionCount=float64; coveredLinePercent=float64; coveredBranchPercent=float64; coveredFunctionPercent=float64';
  defineClass(r, 'test.CoverageSummary', '*TnCoverageSummary', 'class', '', 'workingDirectory=string; files=[]*TnCoverageFile; totals=*TnCoverageTotals', '', '');
  defineClass(
    r,
    'test.CoverageFile',
    '*TnCoverageFile',
    'class',
    '',
    `path=string; ${counts}; functions=[]*TnCoverageFunction; branches=[]*TnCoverageCount; lines=[]*TnCoverageCount`,
    '',
    ''
  );
  defineClass(r, 'test.CoverageTotals', '*TnCoverageTotals', 'class', '', counts, '', '');
  defineClass(r, 'test.CoverageFunction', '*TnCoverageFunction', 'class', '', 'name=string; line=float64; count=float64', '', '');
  defineClass(r, 'test.CoverageCount', '*TnCoverageCount', 'class', '', 'line=float64; count=float64', '', '');

  // node:test/reporters
  defineModule(r, 'test/reporters');
  r.namespaces['test/reporters.default'] = 'test/reporters';
  const generators: Record<string, string> = { tap: 'TnTestReporterTap', dot: 'TnTestReporterDot', junit: 'TnTestReporterJunit' };
  for (const name of Object.keys(generators)) {
    const goFn = generators[name];
    r.functions[`test/reporters.${name}`] = (c: NodeCall) => {
      use();
      return `${goFn}(${c.args[0] ?? 'nil'})`;
    };
    r.results[`test/reporters.${name}`] = 'chan string';
    // passed to compose(): the generator function itself
    r.values[`test/reporters.${name}`] = (_c: NodeCall) => {
      use();
      return goFn;
    };
    r.valueTypes[`test/reporters.${name}`] = 'func(interface{}) chan string';
  }
  const streams: Record<string, string> = { spec: 'TnTestReporterSpec', lcov: 'TnTestReporterLcov' };
  for (const name of Object.keys(streams)) {
    const goFn = streams[name];
    r.constructors[`test/reporters.${name}`] = (_c: NodeCall) => {
      use();
      return `${goFn}()`;
    };
    r.classes[`test/reporters.${name}`] = r.classes['stream.Duplex'];
    // compose(spec): the factory, called with the source
    r.values[`test/reporters.${name}`] = (_c: NodeCall) => {
      use();
      return goFn;
    };
    r.valueTypes[`test/reporters.${name}`] = 'func() *TnStream';
  }
}
