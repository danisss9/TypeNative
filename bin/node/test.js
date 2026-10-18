// node:test — test / it / describe / suite with hooks, subtests (t.test),
// skip / todo, timeouts, async and callback-style tests, and mock.fn. Tests
// are collected while the program runs and executed one after another once
// the main module has finished (as in Node); the report uses Node's TAP
// reporter, or the spec reporter when stdout is a terminal. A failure sets
// the exit code to 1.
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
const testHelper = `// node:test
type TnTestNode struct {
	name        string
	fn          interface{}
	suite       bool
	skip        bool
	skipMsg     string
	todo        bool
	todoMsg     string
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
	duration    float64
	diagnostics []string
	started     bool
	headerShown bool
	ctx         *TnTestContext
	done        chan struct{}
}

var tnTestRoot = &TnTestNode{suite: true}
var tnTestCurrent = tnTestRoot
var tnTestRunning *TnTestNode
var tnTestScheduled bool
var tnTestSpec bool
var tnTestColor bool
var tnTestStart time.Time
var tnTestCounts = map[string]int{}
var tnTestFailures []*TnTestNode

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
func (t *TnTestContext) Get_filePath() string {
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
func (t *TnTestContext) test(args ...interface{}) chan struct{} {
	child := tnTestNew(false, args)
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
		}
	}
	return n
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
func TnTestRegister(variant string, args ...interface{}) chan struct{} {
	n := tnTestNew(false, args)
	switch variant {
	case "skip":
		n.skip = true
	case "todo":
		n.todo = true
	}
	if tnTestRunning != nil && tnTestCurrent == tnTestRoot && tnTestRunning.ctx != nil {
		n.parent = tnTestRunning
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
func TnSuiteRegister(variant string, args ...interface{}) chan struct{} {
	n := tnTestNew(true, args)
	switch variant {
	case "skip":
		n.skip = true
	case "todo":
		n.todo = true
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

// The run starts once the main module has finished (a loop task)
func tnTestSchedule() {
	if tnTestScheduled {
		return
	}
	tnTestScheduled = true
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
			settle(tnTestOutcome{err: TnNodeError("Error", "ERR_TEST_FAILURE", "test timed out after "+strconv.FormatFloat(ms, 'f', -1, 64)+"ms"), failed: true, timedOut: true})
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

func tnRunRoot() {
	tnTestStart = time.Now()
	tnTestSpec = TnIsTTY(os.Stdout)
	tnTestColor = tnTestSpec && os.Getenv("NO_COLOR") == ""
	if !tnTestSpec {
		fmt.Println("TAP version 13")
	}
	root := tnTestRoot
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
	tnTestShowParents(n)
	indent := strings.Repeat("    ", depth)
	if !tnTestSpec {
		fmt.Println(indent + "# Subtest: " + n.name)
	}
	start := time.Now()
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
			n.err = TnNodeError("Error", "ERR_TEST_FAILURE", "plan expected "+strconv.FormatFloat(ctx.planned, 'f', -1, 64)+" assertions but received "+strconv.FormatFloat(ctx.asserts, 'f', -1, 64))
			n.failureType = "testCodeFailure"
		}
		tnTestRunning = prev
	}
	n.duration = float64(time.Since(start).Nanoseconds()) / 1e6
	switch {
	case n.skip:
		n.status = "skip"
	case n.todo:
		n.status = "todo"
	case n.err != nil:
		n.status = "fail"
	default:
		n.status = "pass"
		for _, child := range n.children {
			if child.status == "fail" {
				n.status = "fail"
				failed := 0
				for _, c := range n.children {
					if c.status == "fail" {
						failed++
					}
				}
				noun := "subtest"
				if failed > 1 {
					noun = "subtests"
				}
				n.err = TnNodeError("Error", "ERR_TEST_FAILURE", strconv.Itoa(failed)+" "+noun+" failed")
				n.failureType = "subtestsFailed"
				break
			}
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
			if n.failureType != "subtestsFailed" {
				tnTestFailures = append(tnTestFailures, n)
			}
		case "skip":
			tnTestCounts["skipped"]++
		case "todo":
			tnTestCounts["todo"]++
		}
	}
	tnTestReport(n, depth)
}

// Spec reporter: a parent's ▶ line comes before its first child's output
func tnTestShowParents(n *TnTestNode) {
	if !tnTestSpec {
		return
	}
	chain := tnTestAncestors(n)
	for i, p := range chain {
		if p.parent == nil || p.headerShown {
			continue
		}
		p.headerShown = true
		fmt.Println(strings.Repeat("  ", i-1) + "\\u25b6 " + p.name)
	}
}

func tnTestColorize(code string, s string) string {
	if !tnTestColor {
		return s
	}
	return "\\x1b[" + code + "m" + s + "\\x1b[39m"
}

func tnTestDuration(ms float64) string {
	return strconv.FormatFloat(math.Round(ms*1e6)/1e6, 'f', -1, 64)
}

func tnTestErrorField(err interface{}, key string) interface{} {
	if e, ok := err.(*TnError); ok {
		if key == "message" {
			return e.message
		}
		if key == "code" {
			if e.code != "" {
				return e.code
			}
		}
		if key == "name" {
			return e.Get_name()
		}
		return e.prop(key)
	}
	if key == "message" {
		return TnJSString(err)
	}
	return nil
}

func tnTestYamlString(s string, indent string) string {
	if strings.Contains(s, "\\n") {
		lines := strings.Split(s, "\\n")
		for i, l := range lines {
			lines[i] = indent + "    " + l
		}
		return "|-\\n" + strings.Join(lines, "\\n")
	}
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func tnTestReport(n *TnTestNode, depth int) {
	if tnTestSpec {
		tnTestReportSpec(n, depth)
		return
	}
	indent := strings.Repeat("    ", depth)
	if len(n.children) > 0 {
		fmt.Println(indent + "    1.." + strconv.Itoa(len(n.children)))
	}
	number := 1
	if n.parent != nil {
		for i, c := range n.parent.children {
			if c == n {
				number = i + 1
			}
		}
	}
	line := "ok"
	if n.status == "fail" {
		line = "not ok"
	}
	line = indent + line + " " + strconv.Itoa(number) + " - " + n.name
	switch n.status {
	case "skip":
		line += " # SKIP"
		if n.skipMsg != "" {
			line += " " + n.skipMsg
		}
	case "todo":
		line += " # TODO"
		if n.todoMsg != "" {
			line += " " + n.todoMsg
		}
	}
	fmt.Println(line)
	fmt.Println(indent + "  ---")
	fmt.Println(indent + "  duration_ms: " + tnTestDuration(n.duration))
	kind := "test"
	if n.suite {
		kind = "suite"
	}
	fmt.Println(indent + "  type: '" + kind + "'")
	if n.status == "fail" || (n.status == "todo" && n.err != nil) {
		fmt.Println(indent + "  failureType: '" + n.failureType + "'")
		msg := TnJSString(tnTestErrorField(n.err, "message"))
		if e, ok := n.err.(*TnError); ok && e.Get_name() == "AssertionError" && !strings.HasSuffix(msg, "\\n") && strings.Contains(msg, "\\n") {
			msg += "\\n"
		}
		fmt.Println(indent + "  error: " + tnTestYamlString(msg, indent))
		code, _ := tnTestErrorField(n.err, "code").(string)
		if code == "" {
			code = "ERR_TEST_FAILURE"
		}
		fmt.Println(indent + "  code: '" + code + "'")
		if e, isTnErr := n.err.(*TnError); isTnErr && n.failureType == "testCodeFailure" && e.Get_name() == "AssertionError" {
			fmt.Println(indent + "  name: '" + TnJSString(tnTestErrorField(n.err, "name")) + "'")
			for _, key := range []string{"expected", "actual", "operator"} {
				if e, ok := n.err.(*TnError); ok {
					if v, has := e.props[key]; has {
						fmt.Println(indent + "  " + key + ": " + TnInspect(v))
					}
				}
			}
		}
	}
	fmt.Println(indent + "  ...")
	for _, d := range n.diagnostics {
		fmt.Println(indent + "# " + d)
	}
}

func tnTestReportSpec(n *TnTestNode, depth int) {
	indent := strings.Repeat("  ", depth)
	dur := " (" + tnTestDuration(n.duration) + "ms)"
	var line string
	switch n.status {
	case "pass":
		line = tnTestColorize("32", "\\u2714 "+n.name+dur)
	case "fail":
		line = tnTestColorize("31", "\\u2716 "+n.name+dur)
	case "skip":
		msg := "SKIP"
		if n.skipMsg != "" {
			msg = n.skipMsg
		}
		line = tnTestColorize("90", "\\ufe63 "+n.name+dur+" # "+msg)
	case "todo":
		msg := "TODO"
		if n.todoMsg != "" {
			msg = n.todoMsg
		}
		mark := "\\u2714 "
		if n.err != nil {
			mark = "\\u2716 "
		}
		line = tnTestColorize("33", mark+n.name+dur+" # "+msg)
	}
	fmt.Println(indent + line)
	for _, d := range n.diagnostics {
		fmt.Println(indent + tnTestColorize("34", "\\u2139 "+d))
	}
}

func tnTestFinish() {
	stats := []string{"tests", "suites", "pass", "fail", "cancelled", "skipped", "todo"}
	if !tnTestSpec {
		fmt.Println("1.." + strconv.Itoa(len(tnTestRoot.children)))
	}
	for _, key := range stats {
		line := key + " " + strconv.Itoa(tnTestCounts[key])
		if tnTestSpec {
			fmt.Println(tnTestColorize("34", "\\u2139 "+line))
		} else {
			fmt.Println("# " + line)
		}
	}
	duration := "duration_ms " + tnTestDuration(float64(time.Since(tnTestStart).Nanoseconds())/1e6)
	if tnTestSpec {
		fmt.Println(tnTestColorize("34", "\\u2139 "+duration))
		if len(tnTestFailures) > 0 {
			fmt.Println("\\n" + tnTestColorize("31", "\\u2716 failing tests:"))
			for _, n := range tnTestFailures {
				fmt.Println("\\n" + tnTestColorize("31", "\\u2716 "+n.name+" ("+tnTestDuration(n.duration)+"ms)"))
				name := TnJSString(tnTestErrorField(n.err, "name"))
				head := name
				if code, ok := tnTestErrorField(n.err, "code").(string); ok && code != "" {
					head += " [" + code + "]"
				}
				for _, l := range strings.Split(head+": "+TnJSString(tnTestErrorField(n.err, "message")), "\\n") {
					fmt.Println("  " + l)
				}
			}
		}
	} else {
		fmt.Println("# " + duration)
	}
	if tnTestCounts["fail"] > 0 || tnTestCounts["cancelled"] > 0 {
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
func (m *TnMockFunctionContext) restore() { m.impl = m.original }

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
function eventFn(nodes) {
    void nodes;
    return ['*TnTestContext', 'func(...interface{})'];
}
export function registerTest(r) {
    defineModule(r, 'test');
    defineHelper(r, 'nodeTest', ['fmt', 'math', 'os', 'reflect', 'strconv', 'strings', 'time'], ['eventLoop', 'promise', 'nodeInvoke', 'dynamic', 'nodeEvents', 'nodeProcess', 'nodeUtil', 'error', 'timerWait', 'clock'], testHelper);
    const use = () => r.helper('nodeTest');
    defineClass(r, 'test.TestContext', '*TnTestContext', 'class', 'skip=; todo=; diagnostic=; plan=; runOnly=; test=chan struct{}; before=; after=; beforeEach=; afterEach=', '', 'name=string; fullName=string; mock=*TnMockTracker; signal=*TnAbortSignal; filePath=string; assert=*TnTestAssert', '');
    r.classes['test.SuiteContext'] = r.classes['test.TestContext'];
    defineClass(r, 'test.MockTracker', '*TnMockTracker', 'class', 'reset=; restoreAll=', '', 'timers=*TnMockTimers', '');
    defineClass(r, 'test.MockTimers', '*TnMockTimers', 'class', 'enable=; tick=; runAll=; setTime=; reset=', '', '', '');
    // t.assert.x(...): node:assert's x, counted for t.plan()
    defineClass(r, 'test.TestContextAssert', '*TnTestAssert', 'class', '', '', '', '');
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
            return `${goFn}(${JSON.stringify(variant)}${c.args.length > 0 ? ', ' : ''}${c.args.join(', ')})`;
        };
        r.results[`test.${name}`] = 'chan struct{}';
        r.paramTypers[`test.${name}`] = eventFn;
    };
    for (const name of ['test', 'it']) {
        register(name, 'TnTestRegister', '');
        register(`${name}.skip`, 'TnTestRegister', 'skip');
        register(`${name}.todo`, 'TnTestRegister', 'todo');
        register(`${name}.only`, 'TnTestRegister', '');
    }
    for (const name of ['describe', 'suite']) {
        register(name, 'TnSuiteRegister', '');
        register(`${name}.skip`, 'TnSuiteRegister', 'skip');
        register(`${name}.todo`, 'TnSuiteRegister', 'todo');
        register(`${name}.only`, 'TnSuiteRegister', '');
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
