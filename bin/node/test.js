// node:test — test / it / describe / suite with hooks, subtests (t.test),
// skip / todo, timeouts, async and callback-style tests, mocks and snapshots.
// Tests are collected while the program runs and executed one after another
// once the main module has finished (as in Node). The runner reports through
// events (Node's test:start / test:pass / test:fail / …), which the
// reporters in test_report.ts turn into TAP, spec, dot, junit or lcov text
// for each --test-reporter / --test-reporter-destination pair. A failure
// sets the exit code to 1.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
import { registerTestReporters } from './test_report.js';
import { registerTestRun } from './test_run.js';
import { registerTestCoverage } from './test_coverage.js';
const testHelper = `// node:test
type TnTestNode struct {
	name        string
	fn          interface{}
	suite       bool
	skip        bool
	skipMsg     string
	todo        bool
	todoMsg     string
	only        bool
	timeoutMs   float64
	parent      *TnTestNode
	children    []*TnTestNode
	before      []interface{}
	after       []interface{}
	beforeEach  []interface{}
	afterEach   []interface{}
	status      string
	err         interface{}
	failureType string
	failure     *TnError
	duration    float64
	diagnostics []string
	started     bool
	ctx         *TnTestContext
	done        chan struct{}
	// where test() / describe() was called
	file   string
	line   float64
	column float64
}

var tnTestRoot = &TnTestNode{suite: true}
var tnTestCurrent = tnTestRoot
var tnTestRunning *TnTestNode
var tnTestScheduled bool
var tnTestStart float64
var tnTestCounts = map[string]int{}

// Hooks of the optional parts: a run() child sends its events to the parent;
// coverage and snapshots finish when the run does
var tnTestChildSink func(e *TnTestEvent)
var tnTestCoverage func(cfg *tnTestConfig) *TnCoverageSummary
var tnTestSnapshotsDone func()

// TestContext (t)
type TnTestContext struct {
	node    *TnTestNode
	mock    *TnMockTracker
	signal  *TnAbortSignal
	planned float64
	planSet bool
	asserts float64
}

func (t *TnTestContext) Get_name() string { return t.node.name }
func (t *TnTestContext) Get_fullName() string {
	names := []string{}
	for n := t.node; n != nil && n.parent != nil; n = n.parent {
		names = append([]string{n.name}, names...)
	}
	return strings.Join(names, " > ")
}
func (t *TnTestContext) Get_mock() *TnMockTracker  { return t.mock }
func (t *TnTestContext) Get_signal() *TnAbortSignal { return t.signal }

// The source file the test was declared in
func (t *TnTestContext) Get_filePath() string {
	for n := t.node; n != nil; n = n.parent {
		if n.file != "" {
			return n.file
		}
	}
	if len(os.Args) > 0 {
		return os.Args[0]
	}
	return ""
}

func (t *TnTestContext) skip(msg ...interface{}) {
	t.node.skip = true
	if len(msg) > 0 && msg[0] != nil {
		t.node.skipMsg = TnJSString(msg[0])
	}
}

func (t *TnTestContext) todo(msg ...interface{}) {
	t.node.todo = true
	if len(msg) > 0 && msg[0] != nil {
		t.node.todoMsg = TnJSString(msg[0])
	}
}

func (t *TnTestContext) diagnostic(msg string) {
	t.node.diagnostics = append(t.node.diagnostics, msg)
}

func (t *TnTestContext) plan(n float64, options ...interface{}) {
	t.planned = n
	t.planSet = true
}

func (t *TnTestContext) runOnly(flag bool) {}

// t.test(name, [options], fn): runs the subtest now; resolves when it is done
func (t *TnTestContext) test(file string, line float64, column float64, args ...interface{}) chan struct{} {
	child := tnTestNew(false, args)
	tnTestLocate(child, file, line, column)
	child.parent = t.node
	t.node.children = append(t.node.children, child)
	t.asserts++
	tnRunTestNode(child, tnTestDepth(child))
	return child.done
}

func (t *TnTestContext) before(fn interface{}, options ...interface{}) {
	t.node.before = append(t.node.before, fn)
}
func (t *TnTestContext) after(fn interface{}, options ...interface{}) {
	t.node.after = append(t.node.after, fn)
}
func (t *TnTestContext) beforeEach(fn interface{}, options ...interface{}) {
	t.node.beforeEach = append(t.node.beforeEach, fn)
}
func (t *TnTestContext) afterEach(fn interface{}, options ...interface{}) {
	t.node.afterEach = append(t.node.afterEach, fn)
}

// test(name?, options?, fn?) arguments
func tnTestNew(suite bool, args []interface{}) *TnTestNode {
	n := &TnTestNode{suite: suite, name: "<anonymous>", done: make(chan struct{}, 1)}
	for _, a := range args {
		switch x := a.(type) {
		case string:
			n.name = x
		case nil:
		default:
			if tnTestIsFunc(a) {
				n.fn = a
				continue
			}
			switch s := TnGet(a, "skip").(type) {
			case bool:
				n.skip = s
			case string:
				n.skip, n.skipMsg = true, s
			}
			switch td := TnGet(a, "todo").(type) {
			case bool:
				n.todo = td
			case string:
				n.todo, n.todoMsg = true, td
			}
			if ms, ok := TnGet(a, "timeout").(float64); ok {
				n.timeoutMs = ms
			}
			if only, ok := TnGet(a, "only").(bool); ok {
				n.only = only
			}
		}
	}
	return n
}

// The call site (a source path with forward slashes, as the compiler knows it)
func tnTestLocate(n *TnTestNode, file string, line float64, column float64) {
	if file != "" {
		n.file = filepath.FromSlash(file)
	}
	n.line, n.column = line, column
}

func tnTestIsFunc(v interface{}) bool {
	rv := reflect.ValueOf(v)
	return rv.IsValid() && rv.Kind() == reflect.Func && !rv.IsNil()
}

func tnTestDepth(n *TnTestNode) int {
	d := -1
	for p := n; p.parent != nil; p = p.parent {
		d++
	}
	return d
}

// test() / it(): registered with the enclosing describe (or the running test)
func TnTestRegister(variant string, file string, line float64, column float64, args ...interface{}) chan struct{} {
	n := tnTestNew(false, args)
	tnTestLocate(n, file, line, column)
	switch variant {
	case "skip":
		n.skip = true
	case "todo":
		n.todo = true
	case "only":
		n.only = true
	}
	if tnTestRunning != nil && tnTestCurrent == tnTestRoot && tnTestRunning.ctx != nil {
		n.parent = tnTestRunning
		// subtests go through the same filters
		if tnTestFilters().active() && !tnTestSelected(n) {
			n.done <- struct{}{}
			return n.done
		}
		tnTestRunning.children = append(tnTestRunning.children, n)
		tnRunTestNode(n, tnTestDepth(n))
		return n.done
	}
	n.parent = tnTestCurrent
	tnTestCurrent.children = append(tnTestCurrent.children, n)
	tnTestSchedule()
	return n.done
}

// describe() / suite(): the body runs now and registers the suite's tests
func TnSuiteRegister(variant string, file string, line float64, column float64, args ...interface{}) chan struct{} {
	n := tnTestNew(true, args)
	tnTestLocate(n, file, line, column)
	switch variant {
	case "skip":
		n.skip = true
	case "todo":
		n.todo = true
	case "only":
		n.only = true
	}
	n.parent = tnTestCurrent
	tnTestCurrent.children = append(tnTestCurrent.children, n)
	if n.fn != nil {
		saved := tnTestCurrent
		tnTestCurrent = n
		func() {
			defer func() {
				if r := recover(); r != nil {
					n.err = r
					n.failureType = "testCodeFailure"
				}
			}()
			TnInvoke(n.fn, &TnTestContext{node: n})
		}()
		tnTestCurrent = saved
	}
	tnTestSchedule()
	return n.done
}

// before / after / beforeEach / afterEach (in a describe body or at the top level)
func TnTestHook(kind string, fn interface{}, options ...interface{}) {
	target := tnTestCurrent
	if tnTestRunning != nil && target == tnTestRoot {
		target = tnTestRunning
	}
	switch kind {
	case "before":
		target.before = append(target.before, fn)
	case "after":
		target.after = append(target.after, fn)
	case "beforeEach":
		target.beforeEach = append(target.beforeEach, fn)
	case "afterEach":
		target.afterEach = append(target.afterEach, fn)
	}
	tnTestSchedule()
}

// The run starts once the main module has finished (a loop task); the
// reporters are set up by the first test(), as Node does
func tnTestSchedule() {
	if tnTestScheduled {
		return
	}
	tnTestScheduled = true
	tnTestOpenReporters()
	TnLoopRef()
	TnLoopPost(func() {
		TnStartAsync(func() {
			defer TnLoopUnref()
			tnRunRoot()
		})
	})
}

type tnTestOutcome struct {
	err      interface{}
	failed   bool
	timedOut bool
}

// Calls a test / hook function: sync, async (a promise), or with a done callback
func tnTestInvoke(fn interface{}, ctx *TnTestContext, timeoutMs float64) tnTestOutcome {
	outcome := make(chan tnTestOutcome, 1)
	settle := func(o tnTestOutcome) {
		select {
		case outcome <- o:
		default:
		}
	}
	if timeoutMs > 0 && !math.IsInf(timeoutMs, 1) {
		ms := timeoutMs
		timer := time.AfterFunc(time.Duration(ms*float64(time.Millisecond)), func() {
			settle(tnTestOutcome{err: "test timed out after " + strconv.FormatFloat(ms, 'f', -1, 64) + "ms", failed: true, timedOut: true})
		})
		defer timer.Stop()
	}
	fv := reflect.ValueOf(fn)
	usesDone := fv.Kind() == reflect.Func && fv.Type().NumIn() >= 2
	var result interface{}
	panicked := func() (out *tnTestOutcome) {
		defer func() {
			if r := recover(); r != nil {
				out = &tnTestOutcome{err: r, failed: true}
			}
		}()
		if usesDone {
			result = TnInvoke(fn, ctx, func(args ...interface{}) {
				if len(args) > 0 && args[0] != nil && !TnIsNil(args[0]) {
					settle(tnTestOutcome{err: args[0], failed: true})
					return
				}
				settle(tnTestOutcome{})
			})
		} else {
			result = TnInvoke(fn, ctx)
		}
		return nil
	}()
	if panicked != nil {
		return *panicked
	}
	rv := reflect.ValueOf(result)
	isPromise := rv.IsValid() && rv.Kind() == reflect.Chan
	if !isPromise && !usesDone {
		// A test that ran past its timeout (async callbacks run to completion)
		select {
		case o := <-outcome:
			return o
		default:
			return tnTestOutcome{}
		}
	}
	if isPromise {
		go func() {
			_, ok := rv.Recv()
			if !ok {
				if reason, rejected := tnRejections.Load(result); rejected {
					settle(tnTestOutcome{err: reason, failed: true})
					return
				}
			}
			if !usesDone {
				settle(tnTestOutcome{})
			}
		}()
	}
	o, _ := TnLoopReceive(outcome)
	return o
}

func tnRunHooks(hooks []interface{}, ctx *TnTestContext) *tnTestOutcome {
	for _, h := range hooks {
		if o := tnTestInvoke(h, ctx, 0); o.failed {
			return &o
		}
	}
	return nil
}

func tnTestAncestors(n *TnTestNode) []*TnTestNode {
	chain := []*TnTestNode{}
	for p := n.parent; p != nil; p = p.parent {
		chain = append([]*TnTestNode{p}, chain...)
	}
	return chain
}

// The test runner's flags, from NODE_OPTIONS as Node reads them:
// --test-name-pattern / --test-skip-pattern (repeatable, "/re/flags" or a
// plain regular expression), --test-only, --test-reporter /
// --test-reporter-destination (repeatable, in pairs),
// --test-update-snapshots and the coverage flags
type tnTestConfig struct {
	names           []*regexp.Regexp
	skips           []*regexp.Regexp
	only            bool
	reporters       []string
	destinations    []string
	updateSnapshots bool
	coverage        bool
	coverageInclude []string
	coverageExclude []string
	// --test-coverage-lines / -branches / -functions (0: no threshold)
	thresholds map[string]float64
}

func (c *tnTestConfig) active() bool { return len(c.names) > 0 || len(c.skips) > 0 || c.only }

var tnTestCfg *tnTestConfig

// NODE_OPTIONS words: spaces separate them, double quotes group
func tnNodeOptionWords(s string) []string {
	words := []string{}
	cur := strings.Builder{}
	inQuote, has := false, false
	for _, r := range s {
		switch {
		case r == '"':
			inQuote = !inQuote
			has = true
		case r == ' ' && !inQuote:
			if has {
				words = append(words, cur.String())
				cur.Reset()
				has = false
			}
		default:
			cur.WriteRune(r)
			has = true
		}
	}
	if has {
		words = append(words, cur.String())
	}
	return words
}

func tnTestPattern(s string) *regexp.Regexp {
	if len(s) > 2 && s[0] == '/' {
		if i := strings.LastIndexByte(s, '/'); i > 0 {
			prefix := ""
			if strings.Contains(s[i+1:], "i") {
				prefix = "(?i)"
			}
			if re, err := regexp.Compile(prefix + s[1:i]); err == nil {
				return re
			}
		}
	}
	re, err := regexp.Compile(s)
	if err != nil {
		return regexp.MustCompile(regexp.QuoteMeta(s))
	}
	return re
}

var tnTestValueFlags = map[string]bool{
	"--test-name-pattern": true, "--test-skip-pattern": true, "--test-reporter": true, "--test-reporter-destination": true,
	"--test-coverage-include": true, "--test-coverage-exclude": true,
	"--test-coverage-lines": true, "--test-coverage-branches": true, "--test-coverage-functions": true,
}

func tnTestFilters() *tnTestConfig {
	if tnTestCfg != nil {
		return tnTestCfg
	}
	c := &tnTestConfig{thresholds: map[string]float64{}}
	words := tnNodeOptionWords(os.Getenv("NODE_OPTIONS"))
	for i := 0; i < len(words); i++ {
		name, value, hasValue := strings.Cut(words[i], "=")
		if tnTestValueFlags[name] && !hasValue && i+1 < len(words) {
			i++
			value = words[i]
		}
		switch name {
		case "--test-name-pattern":
			c.names = append(c.names, tnTestPattern(value))
		case "--test-skip-pattern":
			c.skips = append(c.skips, tnTestPattern(value))
		case "--test-only":
			c.only = true
		case "--test-reporter":
			c.reporters = append(c.reporters, value)
		case "--test-reporter-destination":
			c.destinations = append(c.destinations, value)
		case "--test-update-snapshots":
			c.updateSnapshots = true
		case "--experimental-test-coverage":
			c.coverage = true
		case "--test-coverage-include":
			c.coverageInclude = append(c.coverageInclude, value)
		case "--test-coverage-exclude":
			c.coverageExclude = append(c.coverageExclude, value)
		case "--test-coverage-lines", "--test-coverage-branches", "--test-coverage-functions":
			if n, err := strconv.ParseFloat(value, 64); err == nil {
				c.thresholds[strings.TrimPrefix(name, "--test-coverage-")] = n
			}
		}
	}
	tnTestCfg = c
	return c
}

// A pattern matches a test's name, an ancestor's, or the names joined with spaces
func tnTestNameMatches(n *TnTestNode, patterns []*regexp.Regexp) bool {
	names := []string{}
	for p := n; p != nil && p.parent != nil; p = p.parent {
		for _, re := range patterns {
			if re.MatchString(p.name) {
				return true
			}
		}
		names = append([]string{p.name}, names...)
	}
	full := strings.Join(names, " ")
	for _, re := range patterns {
		if re.MatchString(full) {
			return true
		}
	}
	return false
}

func tnTestSelected(n *TnTestNode) bool {
	c := tnTestFilters()
	if len(c.names) > 0 && !tnTestNameMatches(n, c.names) {
		return false
	}
	if len(c.skips) > 0 && tnTestNameMatches(n, c.skips) {
		return false
	}
	if c.only {
		for p := n; p != nil; p = p.parent {
			if p.only {
				return true
			}
		}
		return false
	}
	return true
}

// Drops the tests the filters leave out, and the suites left empty (Node
// does not report them)
func tnTestPrune(n *TnTestNode) bool {
	kept := []*TnTestNode{}
	for _, child := range n.children {
		if child.suite {
			if tnTestPrune(child) {
				kept = append(kept, child)
			}
		} else if tnTestSelected(child) {
			kept = append(kept, child)
		}
	}
	n.children = kept
	return len(kept) > 0
}

// --- reporting ---

// A reporter and where its text goes
type tnTestSink struct {
	reporter tnTestReporter
	out      *os.File
	file     bool
}

func (s *tnTestSink) write(text string) {
	if text != "" {
		s.out.WriteString(text)
	}
}

var tnTestSinks []*tnTestSink

// --test-reporter / --test-reporter-destination, paired as Node pairs them
// (the default: spec on a terminal, else tap, to stdout)
func tnTestOpenReporters() {
	if tnTestChildSink != nil {
		return
	}
	cfg := tnTestFilters()
	reporters, destinations := cfg.reporters, cfg.destinations
	if len(reporters) == 0 && len(destinations) == 0 {
		reporters = []string{"tap"}
		if TnIsTTY(os.Stdout) {
			reporters = []string{"spec"}
		}
	}
	if len(reporters) == 1 && len(destinations) == 0 {
		destinations = []string{"stdout"}
	}
	if len(destinations) != len(reporters) {
		received := make([]interface{}, len(reporters))
		for i, r := range reporters {
			received[i] = r
		}
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument '--test-reporter' must match the number of specified '--test-reporter-destination'. Received "+TnInspect(received)))
	}
	for i, name := range reporters {
		sink := &tnTestSink{}
		colors := tnTestColorsOn()
		switch destinations[i] {
		case "stdout":
			sink.out = os.Stdout
		case "stderr":
			sink.out = os.Stderr
		default:
			path := destinations[i]
			os.MkdirAll(filepath.Dir(path), 0o755)
			f, err := os.Create(path)
			if err != nil {
				panic(TnNodeError("Error", "ENOENT", err.Error()))
			}
			sink.out, sink.file, colors = f, true, false
		}
		sink.reporter = tnNewTestReporter(name, colors)
		if sink.reporter == nil {
			cwd, _ := os.Getwd()
			panic(TnNodeError("Error", "ERR_MODULE_NOT_FOUND", "Cannot find package '"+name+"' imported from "+cwd))
		}
		tnTestSinks = append(tnTestSinks, sink)
	}
}

func tnTestEmit(e *TnTestEvent) {
	if tnTestChildSink != nil {
		tnTestChildSink(e)
		return
	}
	for _, s := range tnTestSinks {
		s.write(s.reporter.report(e))
	}
}

func tnTestNumber(n *TnTestNode) int {
	if n.parent != nil {
		for i, c := range n.parent.children {
			if c == n {
				return i + 1
			}
		}
	}
	return 1
}

func tnTestEventFor(kind string, n *TnTestNode, depth int) *TnTestEvent {
	d := &TnTestEventData{name: n.name, nesting: float64(depth), file: n.file, line: n.line, column: n.column}
	if kind != "test:start" {
		d.testNumber = float64(tnTestNumber(n))
		kindName := "test"
		if n.suite {
			kindName = "suite"
		}
		d.details = &TnTestEventDetails{duration_ms: math.Round(n.duration*1e6) / 1e6, type_: kindName, passed: n.status != "fail"}
		if n.err != nil {
			if n.failure == nil {
				n.failure = tnTestFailure(n.err, n.failureType)
			}
			d.details.error_ = n.failure
		}
		if n.skip {
			d.skip = true
			if n.skipMsg != "" {
				d.skip = n.skipMsg
			}
		} else if n.todo {
			d.todo = true
			if n.todoMsg != "" {
				d.todo = n.todoMsg
			}
		}
	}
	return &TnTestEvent{type_: kind, data: d}
}

func tnTestNote(nesting int, message string, level string, n *TnTestNode) *TnTestEvent {
	d := &TnTestEventData{nesting: float64(nesting), message: message, level: level}
	if n != nil {
		d.file, d.line, d.column = n.file, n.line, n.column
	}
	return &TnTestEvent{type_: "test:diagnostic", data: d}
}

func tnRunRoot() {
	tnTestStart = tnTestNow()
	cfg := tnTestFilters()
	for _, s := range tnTestSinks {
		s.write(s.reporter.begin())
	}
	root := tnTestRoot
	if cfg.active() {
		tnTestPrune(root)
	}
	ctx := &TnTestContext{node: root}
	failedHook := tnRunHooks(root.before, ctx)
	for i := 0; i < len(root.children); i++ {
		child := root.children[i]
		if failedHook != nil {
			child.err, child.failureType = failedHook.err, "hookFailure"
		}
		tnRunTestNode(child, 0)
	}
	tnRunHooks(root.after, ctx)
	tnTestFinish()
}

func tnRunTestNode(n *TnTestNode, depth int) {
	n.started = true
	tnTestEmit(tnTestEventFor("test:start", n, depth))
	// .only without --test-only: Node's notice, as the test's diagnostic
	if n.only && !tnTestFilters().only {
		n.diagnostics = append(n.diagnostics, "'only' and 'runOnly' require the --test-only command-line option.")
	}
	start := tnTestNow()
	ctx := &TnTestContext{node: n, mock: TnNewMockTracker(), signal: TnNewAbortSignal()}
	n.ctx = ctx
	defer func() {
		ctx.mock.reset()
		n.done <- struct{}{}
	}()
	if n.suite {
		if !n.skip && n.err == nil {
			if o := tnRunHooks(n.before, ctx); o != nil {
				n.err, n.failureType = o.err, "hookFailure"
			}
		}
		for _, child := range n.children {
			if n.skip {
				child.skip = true
			}
			if n.err != nil && n.failureType == "hookFailure" && !child.skip {
				child.err, child.failureType = n.err, "hookFailure"
			}
			tnRunTestNode(child, depth+1)
		}
		if !n.skip {
			tnRunHooks(n.after, ctx)
		}
	} else if !n.skip && n.err == nil {
		prev := tnTestRunning
		tnTestRunning = n
		chain := tnTestAncestors(n)
		var failure *tnTestOutcome
		for _, p := range chain {
			if failure == nil {
				failure = tnRunHooks(p.beforeEach, ctx)
			}
		}
		if failure == nil && n.fn != nil {
			o := tnTestInvoke(n.fn, ctx, n.timeoutMs)
			if o.failed {
				failure = &o
				if o.timedOut {
					n.failureType = "testTimeoutFailure"
				}
			}
		}
		// Subtests registered without awaiting them run before the parent finishes
		for _, child := range n.children {
			if !child.started {
				tnRunTestNode(child, depth+1)
			}
		}
		tnRunHooks(n.after, ctx)
		for i := len(chain) - 1; i >= 0; i-- {
			if o := tnRunHooks(chain[i].afterEach, ctx); o != nil && failure == nil {
				failure = o
			}
		}
		if failure != nil {
			n.err = failure.err
			if n.failureType == "" {
				n.failureType = "testCodeFailure"
			}
		} else if ctx.planSet && ctx.planned != ctx.asserts {
			n.err = "plan expected " + strconv.FormatFloat(ctx.planned, 'f', -1, 64) + " assertions but received " + strconv.FormatFloat(ctx.asserts, 'f', -1, 64)
			n.failureType = "testCodeFailure"
		}
		tnTestRunning = prev
	}
	n.duration = tnTestNow() - start
	switch {
	case n.skip:
		n.status = "skip"
	case n.todo:
		n.status = "todo"
	case n.err != nil:
		n.status = "fail"
	default:
		n.status = "pass"
		failed := 0
		for _, c := range n.children {
			if c.status == "fail" {
				failed++
			}
		}
		if failed > 0 {
			n.status = "fail"
			noun := "subtest"
			if failed > 1 {
				noun = "subtests"
			}
			n.err = strconv.Itoa(failed) + " " + noun + " failed"
			n.failureType = "subtestsFailed"
		}
	}
	if n.suite {
		tnTestCounts["suites"]++
	} else {
		tnTestCounts["tests"]++
		switch n.status {
		case "pass":
			tnTestCounts["pass"]++
		case "fail":
			if n.failureType == "testTimeoutFailure" {
				tnTestCounts["cancelled"]++
			} else {
				tnTestCounts["fail"]++
			}
		case "skip":
			tnTestCounts["skipped"]++
		case "todo":
			tnTestCounts["todo"]++
		}
	}
	tnTestReport(n, depth)
}

// A finished test's events: complete, its subtests' plan, pass / fail, diagnostics
func tnTestReport(n *TnTestNode, depth int) {
	tnTestEmit(tnTestEventFor("test:complete", n, depth))
	if len(n.children) > 0 {
		tnTestEmit(&TnTestEvent{type_: "test:plan", data: &TnTestEventData{nesting: float64(depth + 1), count: float64(len(n.children)), file: n.file, line: n.line, column: n.column}})
	}
	kind := "test:pass"
	if n.err != nil && !n.skip {
		kind = "test:fail"
	}
	tnTestEmit(tnTestEventFor(kind, n, depth))
	for _, d := range n.diagnostics {
		tnTestEmit(tnTestNote(depth, d, "info", n))
	}
}

func tnTestDuration(ms float64) string {
	return strconv.FormatFloat(math.Round(ms*1e6)/1e6, 'f', -1, 64)
}

// The root's report: the plan, the counters as diagnostics, coverage, the summary
func tnTestFinish() {
	cfg := tnTestFilters()
	duration := tnTestNow() - tnTestStart
	stats := []string{"tests", "suites", "pass", "fail", "cancelled", "skipped", "todo"}
	if tnTestChildSink == nil {
		tnTestEmit(&TnTestEvent{type_: "test:plan", data: &TnTestEventData{count: float64(len(tnTestRoot.children))}})
		for _, key := range stats {
			tnTestEmit(tnTestNote(0, key+" "+strconv.Itoa(tnTestCounts[key]), "info", nil))
		}
		tnTestEmit(tnTestNote(0, "duration_ms "+tnTestDuration(duration), "info", nil))
	}
	success := tnTestCounts["fail"] == 0 && tnTestCounts["cancelled"] == 0
	if cfg.coverage && tnTestCoverage != nil {
		if summary := tnTestCoverage(cfg); summary != nil {
			totals := map[string]float64{"line": summary.totals.coveredLinePercent, "branch": summary.totals.coveredBranchPercent, "function": summary.totals.coveredFunctionPercent}
			for _, kind := range []string{"lines", "branches", "functions"} {
				threshold, set := cfg.thresholds[kind]
				name := map[string]string{"lines": "line", "branches": "branch", "functions": "function"}[kind]
				if set && totals[name] < threshold {
					success = false
					tnTestEmit(tnTestNote(0, "Error: "+strconv.FormatFloat(totals[name], 'f', 2, 64)+"% "+name+" coverage does not meet threshold of "+TnNumStr(threshold)+"%.", "error", nil))
				}
			}
			tnTestEmit(&TnTestEvent{type_: "test:coverage", data: &TnTestEventData{summary: summary}})
		}
	}
	if tnTestSnapshotsDone != nil {
		tnTestSnapshotsDone()
	}
	counts := &TnTestCounts{
		tests: float64(tnTestCounts["tests"]), failed: float64(tnTestCounts["fail"]), passed: float64(tnTestCounts["pass"]),
		cancelled: float64(tnTestCounts["cancelled"]), skipped: float64(tnTestCounts["skipped"]), todo: float64(tnTestCounts["todo"]),
		topLevel: float64(len(tnTestRoot.children)), suites: float64(tnTestCounts["suites"]),
	}
	tnTestEmit(&TnTestEvent{type_: "test:summary", data: &TnTestEventData{success: success, counts: counts, duration_ms: math.Round(duration*1e6) / 1e6}})
	for _, s := range tnTestSinks {
		s.write(s.reporter.end())
		if s.file {
			s.out.Close()
		}
	}
	if !success {
		TnSetExitCode(1)
	}
}

// --- mocks ---

type TnMockCall struct {
	arguments []interface{}
	result    interface{}
	error_    interface{}
	this      interface{}
}

func (c *TnMockCall) Get_error() interface{} { return c.error_ }

type TnMockFunctionContext struct {
	calls    []*TnMockCall
	impl     interface{}
	original interface{}
	once     map[int]interface{}
	// mock.method & co.: puts the original back where the mock was
	unmock func()
}

func (m *TnMockFunctionContext) Get_calls() []*TnMockCall { return m.calls }
func (m *TnMockFunctionContext) callCount() float64        { return float64(len(m.calls)) }
func (m *TnMockFunctionContext) resetCalls()               { m.calls = nil }
func (m *TnMockFunctionContext) mockImplementation(fn interface{}) { m.impl = fn }
func (m *TnMockFunctionContext) mockImplementationOnce(fn interface{}, onCall ...float64) {
	index := len(m.calls)
	if len(onCall) > 0 {
		index = int(onCall[0])
	}
	m.once[index] = fn
}
func (m *TnMockFunctionContext) restore() {
	m.impl = m.original
	if m.unmock != nil {
		m.unmock()
		m.unmock = nil
	}
}

var tnMocks = map[uintptr]*TnMockFunctionContext{}

type TnMockTracker struct {
	mocks  []*TnMockFunctionContext
	timers *TnMockTimers
}

// mock.timers: fake setTimeout / setInterval / setImmediate / Date driven by tick()
type TnMockTimers struct {
	enabled bool
	now     float64
	seq     int
	queue   []*tnFakeTimer
}

type tnFakeTimer struct {
	runAt    float64
	interval float64
	seq      int
	run      func() bool
}

func (t *TnMockTracker) Get_timers() *TnMockTimers {
	if t.timers == nil {
		t.timers = &TnMockTimers{}
	}
	return t.timers
}

func tnMockTimersState(msg string) *TnError {
	return TnNodeError("Error", "ERR_INVALID_STATE", "Invalid state: "+msg)
}

func (m *TnMockTimers) enable(options ...interface{}) {
	if m.enabled {
		panic(tnMockTimersState("MockTimers is already enabled!"))
	}
	apis := map[string]bool{"setTimeout": true, "setInterval": true, "setImmediate": true, "Date": true}
	m.now = 0
	if len(options) > 0 && options[0] != nil {
		switch list := TnGet(options[0], "apis").(type) {
		case []string:
			apis = map[string]bool{}
			for _, a := range list {
				apis[a] = true
			}
		case []interface{}:
			apis = map[string]bool{}
			for _, a := range list {
				apis[fmt.Sprint(a)] = true
			}
		}
		switch now := TnGet(options[0], "now").(type) {
		case float64:
			m.now = now
		case time.Time:
			m.now = float64(now.UnixMilli())
		}
	}
	m.enabled = true
	m.queue = nil
	tnMockTimerHook = func(kind string, ms float64, run func() bool) bool {
		if !m.enabled || !apis[kind] {
			return false
		}
		if ms < 0 || kind == "setImmediate" {
			ms = 0
		}
		interval := 0.0
		if kind == "setInterval" {
			interval = math.Max(ms, 1)
		}
		m.seq++
		m.queue = append(m.queue, &tnFakeTimer{runAt: m.now + ms, interval: interval, seq: m.seq, run: run})
		return true
	}
	if apis["Date"] {
		tnClockHook = func() time.Time { return time.UnixMilli(int64(m.now)) }
	}
}

func (m *TnMockTimers) check() {
	if !m.enabled {
		panic(tnMockTimersState("You should enable MockTimers first by calling the .enable function"))
	}
}

// The next timer to fire: earliest first, then in scheduling order
func (m *TnMockTimers) next() (*tnFakeTimer, int) {
	best := -1
	for i, t := range m.queue {
		if best < 0 || t.runAt < m.queue[best].runAt || (t.runAt == m.queue[best].runAt && t.seq < m.queue[best].seq) {
			best = i
		}
	}
	if best < 0 {
		return nil, -1
	}
	return m.queue[best], best
}

// tick(ms): advances the clock, then runs the timers that are due
func (m *TnMockTimers) tick(ms ...float64) {
	m.check()
	d := 1.0
	if len(ms) > 0 {
		d = ms[0]
	}
	if d < 0 {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'time' must be a positive number. Received "+TnNumStr(d)))
	}
	m.now += d
	for {
		t, i := m.next()
		if t == nil || t.runAt > m.now {
			return
		}
		m.queue = append(m.queue[:i:i], m.queue[i+1:]...)
		if t.run() && t.interval > 0 {
			t.runAt += t.interval
			m.queue = append(m.queue, t)
		}
	}
}

// runAll(): ticks up to the last pending timer
func (m *TnMockTimers) runAll() {
	m.check()
	last := m.now
	for _, t := range m.queue {
		last = math.Max(last, t.runAt)
	}
	m.tick(last - m.now)
}

func (m *TnMockTimers) setTime(ms float64) {
	m.check()
	m.now = ms
}

func (m *TnMockTimers) reset() {
	if m.enabled {
		tnMockTimerHook = nil
		tnClockHook = nil
	}
	m.enabled = false
	m.queue = nil
}

// t.assert: node:assert's functions, counted towards t.plan()
type TnTestAssert struct {
	ctx *TnTestContext
}

func (t *TnTestContext) Get_assert() *TnTestAssert { return &TnTestAssert{ctx: t} }

func (a *TnTestAssert) count(run func()) {
	a.ctx.asserts++
	run()
}

func tnTestCounted[T any](a *TnTestAssert, v T) T {
	a.ctx.asserts++
	return v
}

func TnNewMockTracker() *TnMockTracker { return &TnMockTracker{} }

var TnMock = TnNewMockTracker()

// mock.fn(original?, implementation?): a function of the same type that records its calls
func TnMockFn[F any](tracker *TnMockTracker, original F, implementation ...F) F {
	ctx := &TnMockFunctionContext{once: map[int]interface{}{}}
	ctx.original = original
	ctx.impl = original
	if len(implementation) > 0 {
		ctx.impl = implementation[0]
	}
	tracker.mocks = append(tracker.mocks, ctx)
	ft := reflect.TypeOf(original)
	wrapped := reflect.MakeFunc(ft, func(in []reflect.Value) []reflect.Value {
		args := make([]interface{}, 0, len(in))
		for i, v := range in {
			if ft.IsVariadic() && i == len(in)-1 {
				for j := 0; j < v.Len(); j++ {
					args = append(args, v.Index(j).Interface())
				}
				continue
			}
			args = append(args, v.Interface())
		}
		call := &TnMockCall{arguments: args}
		impl := ctx.impl
		if once, ok := ctx.once[len(ctx.calls)]; ok {
			impl = once
			delete(ctx.once, len(ctx.calls))
		}
		ctx.calls = append(ctx.calls, call)
		var out []reflect.Value
		func() {
			defer func() {
				if r := recover(); r != nil {
					call.error_ = r
					panic(r)
				}
			}()
			result := TnInvoke(impl, args...)
			call.result = result
			for i := 0; i < ft.NumOut(); i++ {
				out = append(out, tnInvokeArg(result, ft.Out(i)))
			}
		}()
		return out
	})
	fn := wrapped.Interface().(F)
	tnMocks[tnFuncID(fn)] = ctx
	return fn
}

// mock.fn() without a function: accepts anything, returns undefined
func TnMockFnEmpty(tracker *TnMockTracker) func(...interface{}) interface{} {
	return TnMockFn(tracker, func(args ...interface{}) interface{} { return nil })
}

// The implementation argument of mock.method / getter / setter (options objects aside)
func tnMockImplementation(rest []interface{}) interface{} {
	for _, r := range rest {
		if tnTestIsFunc(r) {
			return r
		}
	}
	return nil
}

func tnMockNotAMethod(name string) *TnError {
	return TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'methodName' must be a method. Received '"+name+"'")
}

// mock.method(object, name, implementation?) on a function-valued field (an
// object literal's method or accessor): the field holds the mock until restore()
func TnMockMethod[F any](tracker *TnMockTracker, name string, slot *F, rest ...interface{}) F {
	original := *slot
	if !tnTestIsFunc(original) {
		panic(tnMockNotAMethod(name))
	}
	fn := TnMockFn(tracker, original)
	ctx := tnMocks[tnFuncID(fn)]
	if impl := tnMockImplementation(rest); impl != nil {
		ctx.impl = impl
	}
	*slot = fn
	ctx.unmock = func() { *slot = original }
	return fn
}

// mock.method on a class instance: the method's override slot holds the mock
// (the method calls it while it is set); original is the method's own body
func TnMockSlot[F any](tracker *TnMockTracker, slot *F, original F, rest ...interface{}) F {
	fn := TnMockFn(tracker, original)
	ctx := tnMocks[tnFuncID(fn)]
	if impl := tnMockImplementation(rest); impl != nil {
		ctx.impl = impl
	}
	*slot = fn
	ctx.unmock = func() {
		var none F
		*slot = none
	}
	return fn
}

// mock.method(console, 'log') & co.: calls of a namespace's function check
// for a mock by name (TnMockedCall)
var tnMockedGlobals = map[string]*TnMockFunctionContext{}

func TnMockGlobal(tracker *TnMockTracker, key string, rest ...interface{}) func(...interface{}) interface{} {
	ctx := &TnMockFunctionContext{once: map[int]interface{}{}, impl: tnMockImplementation(rest)}
	tracker.mocks = append(tracker.mocks, ctx)
	tnMockedGlobals[key] = ctx
	ctx.unmock = func() {
		if tnMockedGlobals[key] == ctx {
			delete(tnMockedGlobals, key)
		}
	}
	fn := func(args ...interface{}) interface{} {
		return tnMockedCallVia(ctx, args, func() interface{} { return nil })
	}
	tnMocks[tnFuncID(fn)] = ctx
	return fn
}

func tnMockedCallVia(ctx *TnMockFunctionContext, args []interface{}, original func() interface{}) interface{} {
	call := &TnMockCall{arguments: args}
	impl := ctx.impl
	if once, ok := ctx.once[len(ctx.calls)]; ok {
		impl = once
		delete(ctx.once, len(ctx.calls))
	}
	ctx.calls = append(ctx.calls, call)
	defer func() {
		if r := recover(); r != nil {
			call.error_ = r
			panic(r)
		}
	}()
	var result interface{}
	if impl == nil {
		result = original()
	} else {
		result = TnInvoke(impl, args...)
	}
	call.result = result
	return result
}

// A call of a namespace function that a mock may replace (args evaluate only then)
func TnMockedCall[R any](key string, args func() []interface{}, original func() R) R {
	ctx, mocked := tnMockedGlobals[key]
	if !mocked {
		return original()
	}
	result := tnMockedCallVia(ctx, args(), func() interface{} { return original() })
	if r, ok := result.(R); ok {
		return r
	}
	var zero R
	if result == nil {
		return zero
	}
	return tnInvokeArg(result, reflect.TypeOf(&zero).Elem()).Interface().(R)
}

func TnMockedCallVoid(key string, args func() []interface{}, original func()) {
	ctx, mocked := tnMockedGlobals[key]
	if !mocked {
		original()
		return
	}
	tnMockedCallVia(ctx, args(), func() interface{} {
		original()
		return nil
	})
}

// console.log.mock: the record of a namespace function's mock
func TnMockedContext(key string) *TnMockFunctionContext {
	if ctx, ok := tnMockedGlobals[key]; ok {
		return ctx
	}
	panic(TnNodeError("TypeError", "", "not a mock function"))
}

// fn.mock: the call record of a mock function
func TnMockOf(fn interface{}) *TnMockFunctionContext {
	if ctx, ok := tnMocks[tnFuncID(fn)]; ok {
		return ctx
	}
	panic(TnNodeError("TypeError", "", "not a mock function"))
}

func (t *TnMockTracker) reset() {
	for _, m := range t.mocks {
		m.resetCalls()
	}
	if t.timers != nil {
		t.timers.reset()
	}
	t.restoreAll()
}

func (t *TnMockTracker) restoreAll() {
	for _, m := range t.mocks {
		m.restore()
	}
}`;
const snapshotHelper = `// node:test snapshots: t.assert.snapshot (one <test file>.snapshot file per
// test file, Node's format) and t.assert.fileSnapshot; --test-update-snapshots
// writes them, otherwise they are compared
const tnSnapshotTip = "Missing snapshots can be generated by rerunning the command with the --test-update-snapshots flag."

type tnSnapshotFile struct {
	path      string
	snapshots map[string]string
	counts    map[string]int
	loaded    bool
}

var tnSnapshotFiles = map[string]*tnSnapshotFile{}
var tnSnapshotOrder []*tnSnapshotFile
var tnSnapshotSerializers []interface{}
var tnSnapshotResolve interface{}

func init() {
	tnTestSnapshotsDone = tnSnapshotWriteAll
}

// snapshot.setDefaultSnapshotSerializers / setResolveSnapshotPath
func TnSetDefaultSnapshotSerializers(list interface{}) { tnSnapshotSerializers = tnTestList(list) }
func TnSetResolveSnapshotPath(fn interface{})          { tnSnapshotResolve = fn }

func tnSnapshotEscape(s string) string {
	s = strings.ReplaceAll(s, "\\\\", "\\\\\\\\")
	s = strings.ReplaceAll(s, "\`", "\\\\\`")
	return strings.ReplaceAll(s, "\${", "\\\\\${")
}

func tnSnapshotUnescape(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] == '\\\\' && i+1 < len(s) {
			i++
		}
		b.WriteByte(s[i])
	}
	return b.String()
}

func tnSnapshotState(msg string, file string) *TnError {
	e := tnMockTimersState(msg)
	e.props["filename"] = file
	return e
}

func tnSnapshotFor(testFile string) *tnSnapshotFile {
	if f, ok := tnSnapshotFiles[testFile]; ok {
		return f
	}
	path := testFile + ".snapshot"
	if tnSnapshotResolve != nil {
		resolved, ok := TnInvoke(tnSnapshotResolve, testFile).(string)
		if !ok {
			panic(tnSnapshotState("Invalid snapshot filename.", ""))
		}
		path = resolved
	}
	f := &tnSnapshotFile{path: path, snapshots: map[string]string{}, counts: map[string]int{}, loaded: tnTestFilters().updateSnapshots}
	tnSnapshotFiles[testFile] = f
	tnSnapshotOrder = append(tnSnapshotOrder, f)
	return f
}

func (f *tnSnapshotFile) nextID(name string) string {
	count := f.counts[name]
	if count == 0 {
		count = 1
	}
	f.counts[name] = count + 1
	return name + " " + strconv.Itoa(count)
}

// exports[\`name 1\`] = \`value\`; entries, keeping the values escaped as written
func tnSnapshotParse(src string) (map[string]string, bool) {
	out := map[string]string{}
	i := 0
	literal := func() (string, bool) {
		start := i
		for i < len(src) {
			switch src[i] {
			case '\\\\':
				i += 2
				continue
			case '\`':
				text := src[start:i]
				i++
				return text, true
			}
			i++
		}
		return "", false
	}
	for {
		at := strings.Index(src[i:], "exports[\`")
		if at < 0 {
			return out, true
		}
		i += at + len("exports[\`")
		key, ok := literal()
		if !ok || !strings.HasPrefix(src[i:], "] = \`") {
			return nil, false
		}
		i += len("] = \`")
		value, ok := literal()
		if !ok {
			return nil, false
		}
		out[tnSnapshotUnescape(key)] = value
	}
}

func (f *tnSnapshotFile) read() {
	if f.loaded {
		return
	}
	data, err := os.ReadFile(f.path)
	msg := "Cannot read snapshot file '" + f.path + ".'"
	if err != nil {
		if os.IsNotExist(err) {
			msg += " " + tnSnapshotTip
		}
		panic(tnSnapshotState(msg, f.path))
	}
	snapshots, ok := tnSnapshotParse(string(data))
	if !ok {
		panic(tnSnapshotState(msg, f.path))
	}
	f.snapshots = snapshots
	f.loaded = true
}

// The serializers (default: JSON.stringify(value, null, 2)), then String()
func tnSnapshotSerialize(value interface{}, options []interface{}) string {
	serializers := tnSnapshotSerializers
	if len(options) > 0 && options[0] != nil {
		if list := TnGet(options[0], "serializers"); list != nil {
			serializers = tnTestList(list)
		}
	}
	if len(serializers) == 0 {
		return TnJSONStringify(value, "  ")
	}
	for _, fn := range serializers {
		value = TnInvoke(fn, value)
	}
	return tnTestStr(value)
}

func (a *TnTestAssert) snapshot(value interface{}, options ...interface{}) {
	a.ctx.asserts++
	file := tnSnapshotFor(a.ctx.Get_filePath())
	serialized := "\\n" + tnSnapshotEscape(tnSnapshotSerialize(value, options)) + "\\n"
	id := file.nextID(a.ctx.Get_fullName())
	if tnTestFilters().updateSnapshots {
		file.snapshots[id] = serialized
		return
	}
	file.read()
	expected, ok := file.snapshots[id]
	if !ok {
		e := tnSnapshotState("Snapshot '"+id+"' not found in '"+file.path+".' "+tnSnapshotTip, file.path)
		e.props["snapshot"] = id
		panic(e)
	}
	TnAssertStrictEqual(serialized, expected)
}

func (a *TnTestAssert) fileSnapshot(value interface{}, path string, options ...interface{}) {
	a.ctx.asserts++
	serialized := tnSnapshotSerialize(value, options)
	if tnTestFilters().updateSnapshots {
		os.MkdirAll(filepath.Dir(path), 0o755)
		if err := os.WriteFile(path, []byte(serialized), 0o644); err != nil {
			panic(tnSnapshotState("Cannot write snapshot file '"+path+".'", path))
		}
		return
	}
	data, err := os.ReadFile(path)
	if err != nil {
		msg := "Cannot read snapshot file '" + path + ".'"
		if os.IsNotExist(err) {
			msg += " " + tnSnapshotTip
		}
		panic(tnSnapshotState(msg, path))
	}
	TnAssertStrictEqual(serialized, string(data))
}

// --test-update-snapshots: each snapshot file, its entries sorted by name
func tnSnapshotWriteAll() {
	if !tnTestFilters().updateSnapshots {
		return
	}
	for _, f := range tnSnapshotOrder {
		keys := make([]string, 0, len(f.snapshots))
		for k := range f.snapshots {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		entries := make([]string, len(keys))
		for i, k := range keys {
			entries[i] = "exports[\`" + tnSnapshotEscape(k) + "\`] = \`" + f.snapshots[k] + "\`;\\n"
		}
		os.MkdirAll(filepath.Dir(f.path), 0o755)
		if err := os.WriteFile(f.path, []byte(strings.Join(entries, "\\n")), 0o644); err != nil {
			fmt.Fprintln(os.Stderr, "Cannot write snapshot file '"+f.path+".'")
			TnSetExitCode(1)
		}
	}
}`;
function eventFn(nodes) {
    void nodes;
    return ['*TnTestContext', 'func(...interface{})'];
}
export function registerTest(r) {
    defineModule(r, 'test');
    defineHelper(r, 'nodeTest', ['fmt', 'math', 'os', 'path/filepath', 'reflect', 'regexp', 'strconv', 'strings', 'time'], ['eventLoop', 'promise', 'nodeInvoke', 'dynamic', 'nodeEvents', 'nodeProcess', 'nodeUtil', 'error', 'timerWait', 'clock', 'nodeTestReport', 'nodeTestClock@os'], testHelper);
    defineHelper(r, 'nodeTestSnapshot', ['fmt', 'os', 'path/filepath', 'sort', 'strconv', 'strings'], ['nodeTest', 'nodeAssert', 'jsonStringify'], snapshotHelper);
    registerTestReporters(r);
    registerTestRun(r);
    registerTestCoverage(r);
    const use = () => r.helper('nodeTest');
    // "file", line, column of a test() call: where Node's reports point
    const site = (c) => {
        const position = r.callSite(c.site);
        return `${JSON.stringify(position.file)}, ${position.line}, ${position.column}`;
    };
    defineClass(r, 'test.TestContext', '*TnTestContext', 'class', 'skip=; todo=; diagnostic=; plan=; runOnly=; test=chan struct{}; before=; after=; beforeEach=; afterEach=', '', 'name=string; fullName=string; mock=*TnMockTracker; signal=*TnAbortSignal; filePath=string; assert=*TnTestAssert', '');
    r.methods['test.TestContext#test'] = (c) => {
        use();
        return `${c.recv}.test(${site(c)}${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
    };
    r.classes['test.SuiteContext'] = r.classes['test.TestContext'];
    defineClass(r, 'test.MockTracker', '*TnMockTracker', 'class', 'reset=; restoreAll=', '', 'timers=*TnMockTimers', '');
    defineClass(r, 'test.MockTimers', '*TnMockTimers', 'class', 'enable=; tick=; runAll=; setTime=; reset=', '', '', '');
    // t.assert.x(...): node:assert's x, counted for t.plan()
    defineClass(r, 'test.TestContextAssert', '*TnTestAssert', 'class', 'snapshot=; fileSnapshot=', '', '', '');
    for (const name of ['snapshot', 'fileSnapshot']) {
        r.methods[`test.TestContextAssert#${name}`] = (c) => {
            r.helper('nodeTestSnapshot');
            return `${c.recv}.${name}(${c.args.join(', ')})`;
        };
    }
    const assertNames = ['ok', 'equal', 'notEqual', 'strictEqual', 'notStrictEqual', 'deepEqual', 'notDeepEqual', 'deepStrictEqual', 'notDeepStrictEqual', 'throws', 'doesNotThrow', 'rejects', 'doesNotReject', 'match', 'doesNotMatch', 'fail', 'ifError'];
    for (const name of assertNames) {
        const key = `test.TestContextAssert#${name}`;
        r.methods[key] = (c) => {
            use();
            // node:assert's emitters ignore the receiver
            const expr = r.functions[`assert.${name}`](c);
            if (name === 'rejects' || name === 'doesNotReject')
                return `tnTestCounted(${c.recv}, ${expr})`;
            return `${c.recv}.count(func() { ${expr} })`;
        };
        r.typers[key] = (_c) => (name === 'rejects' || name === 'doesNotReject' ? 'chan struct{}' : '');
        r.paramTypers[key] = (nodes) => (r.paramTypers[`assert.${name}`] ? r.paramTypers[`assert.${name}`](nodes) : []);
    }
    defineClass(r, 'test.MockFunctionContext', '*TnMockFunctionContext', 'class', 'callCount=float64; resetCalls=; mockImplementation=; mockImplementationOnce=; restore=', '', 'calls=[]*TnMockCall', '');
    defineClass(r, 'test.MockCall', '*TnMockCall', 'class', '', 'arguments=[]interface{}; result=interface{}; this=interface{}', 'error=interface{}', '');
    r.paramTypers['test.TestContext#test'] = eventFn;
    for (const hook of ['before', 'after', 'beforeEach', 'afterEach'])
        r.paramTypers[`test.TestContext#${hook}`] = eventFn;
    const register = (name, goFn, variant) => {
        r.functions[`test.${name}`] = (c) => {
            use();
            return `${goFn}(${JSON.stringify(variant)}, ${site(c)}${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
        };
        r.results[`test.${name}`] = 'chan struct{}';
        r.paramTypers[`test.${name}`] = eventFn;
    };
    for (const name of ['test', 'it']) {
        register(name, 'TnTestRegister', '');
        register(`${name}.skip`, 'TnTestRegister', 'skip');
        register(`${name}.todo`, 'TnTestRegister', 'todo');
        register(`${name}.only`, 'TnTestRegister', 'only');
    }
    for (const name of ['describe', 'suite']) {
        register(name, 'TnSuiteRegister', '');
        register(`${name}.skip`, 'TnSuiteRegister', 'skip');
        register(`${name}.todo`, 'TnSuiteRegister', 'todo');
        register(`${name}.only`, 'TnSuiteRegister', 'only');
    }
    for (const variant of ['', '.skip', '.todo', '.only']) {
        r.functions[`test.default${variant}`] = r.functions[`test.test${variant}`];
        r.results[`test.default${variant}`] = 'chan struct{}';
        r.paramTypers[`test.default${variant}`] = eventFn;
    }
    for (const hook of ['before', 'after', 'beforeEach', 'afterEach']) {
        r.functions[`test.${hook}`] = (c) => {
            use();
            return `TnTestHook(${JSON.stringify(hook)}, ${c.args.join(', ')})`;
        };
        r.paramTypers[`test.${hook}`] = eventFn;
    }
    // snapshot.setDefaultSnapshotSerializers / setResolveSnapshotPath
    r.namespaces['test.default.snapshot'] = 'test.snapshot';
    r.objects['test.snapshot'] = true;
    r.functions['test.snapshot.setDefaultSnapshotSerializers'] = (c) => {
        r.helper('nodeTestSnapshot');
        return `TnSetDefaultSnapshotSerializers(${c.args[0]})`;
    };
    r.functions['test.snapshot.setResolveSnapshotPath'] = (c) => {
        r.helper('nodeTestSnapshot');
        return `TnSetResolveSnapshotPath(${c.args[0]})`;
    };
    r.paramTypers['test.snapshot.setResolveSnapshotPath'] = (_n) => ['string'];
    // mock.fn(original?, implementation?) / t.mock.fn(...)
    r.values['test.mock'] = (_c) => {
        use();
        return 'TnMock';
    };
    r.valueTypes['test.mock'] = '*TnMockTracker';
    r.methods['test.MockTracker#fn'] = (c) => {
        use();
        if (c.args.length === 0)
            return `TnMockFnEmpty(${c.recv})`;
        return `TnMockFn(${c.recv}, ${c.args.join(', ')})`;
    };
    r.functions['test.mock.fn'] = (c) => {
        use();
        if (c.args.length === 0)
            return 'TnMockFnEmpty(TnMock)';
        return `TnMockFn(TnMock, ${c.args.join(', ')})`;
    };
    r.typers['test.mock.fn'] = (c) => (c.nodes.length === 0 || !c.types[0] ? 'func(...interface{}) interface{}' : c.types[0]);
    // mock.method(object, name, implementation?, options?) / getter / setter
    for (const kind of ['method', 'getter', 'setter']) {
        r.methods[`test.MockTracker#${kind}`] = (c) => {
            use();
            return r.mockMember(c, c.recv, kind);
        };
        r.functions[`test.mock.${kind}`] = (c) => {
            use();
            return r.mockMember(c, 'TnMock', kind);
        };
        r.typers[`test.MockTracker#${kind}`] = (c) => r.mockMemberType(c, kind);
        r.typers[`test.mock.${kind}`] = r.typers[`test.MockTracker#${kind}`];
    }
    for (const method of ['reset', 'restoreAll']) {
        r.functions[`test.mock.${method}`] = (_c) => {
            use();
            return `TnMock.${method}()`;
        };
    }
    for (const method of ['enable', 'tick', 'runAll', 'setTime', 'reset']) {
        r.functions[`test.mock.timers.${method}`] = (c) => {
            use();
            return `TnMock.Get_timers().${method}(${c.args.join(', ')})`;
        };
        r.results[`test.mock.timers.${method}`] = '';
    }
    r.typers['test.MockTracker#fn'] = (c) => (c.nodes.length === 0 || !c.types[0] ? 'func(...interface{}) interface{}' : c.types[0]);
    setResults(r, 'test', 'before=; after=; beforeEach=; afterEach=');
}
