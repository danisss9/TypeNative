// node:test run({ files }): each file is compiled into the program as a
// second entry point (like a Worker's file) and runs in a child process,
// whose runner sends its events back as frames on stdout. The parent relays
// them on a TestsStream (an object-mode Readable that also emits each event
// by type), renumbering top-level tests across files, and adds the totals
// at the end, as Node's run() does. Other child output becomes test:stdout /
// test:stderr events.

import { NodeRegistry, NodeCall, AstNode, defineHelper, getOption, isObjectLiteral } from './registry.js';

const runHelper = `// node:test run()
const tnTestFrame = "\\x00tn-test "

// A child started by run(): its runner writes events instead of reports
func init() {
	if os.Getenv("NODE_TEST_CONTEXT") == "child-tn" {
		os.Unsetenv("NODE_TEST_CONTEXT")
		tnTestChildSink = tnTestWriteFrame
	}
}

func tnTestWriteFrame(e *TnTestEvent) {
	var payload interface{}
	func() {
		defer func() {
			// a value that can't be cloned (a function): the error as text
			if recover() != nil && e.data.details != nil {
				details := *e.data.details
				details.error_ = tnTestFailure(tnTestInspectError(details.error_), "testCodeFailure")
				data := *e.data
				data.details = &details
				payload = tnCloneEncode(&TnTestEvent{type_: e.type_, data: &data})
			}
		}()
		payload = tnCloneEncode(e)
	}()
	b, err := json.Marshal(payload)
	if err != nil {
		return
	}
	os.Stdout.Write(append(append([]byte(tnTestFrame), b...), '\\n'))
}

type tnTestRunFile struct {
	entry string
	path  string
	// events held back while an earlier file is still reporting
	held     []*TnTestEvent
	finished bool
	summary  *TnTestEventData
	start    time.Time
	exitCode int
	signal   string
}

type tnTestRun struct {
	stream      *TnStream
	files       []*tnTestRunFile
	next        int
	reporting   int
	running     int
	concurrency int
	options     interface{}
	topLevel    float64
	counts      TnTestCounts
	coverage    []*TnCoverageSummary
	start       time.Time
	success     bool
}

// run(options): files pairs each entry id with the file's path
func TnTestRun(options interface{}, files ...[]string) *TnStream {
	s := TnNewReadable()
	s.objectMode = true
	r := &tnTestRun{stream: s, options: options, concurrency: 1, success: true}
	for _, f := range files {
		r.files = append(r.files, &tnTestRunFile{entry: f[0], path: f[1]})
	}
	if options != nil {
		switch c := TnGet(options, "concurrency").(type) {
		case float64:
			if c > 1 {
				r.concurrency = int(c)
			}
		case bool:
			if c {
				r.concurrency = runtime.NumCPU() - 1
			}
		}
	}
	if r.concurrency < 1 {
		r.concurrency = 1
	}
	TnLoopRef()
	TnLoopPost(func() {
		if options != nil {
			if setup := TnGet(options, "setup"); tnTestIsFunc(setup) {
				TnInvoke(setup, s)
			}
		}
		r.start = time.Now()
		r.fill()
	})
	return s
}

func (r *tnTestRun) emit(e *TnTestEvent) {
	r.stream.push(e)
	r.stream.emit(e.type_, e.data)
}

func tnTestRunPatterns(v interface{}) []string {
	out := []string{}
	add := func(p interface{}) {
		switch x := p.(type) {
		case string:
			out = append(out, x)
		case *regexp.Regexp:
			out = append(out, x.String())
		default:
			if p != nil {
				out = append(out, TnJSString(p))
			}
		}
	}
	if list := tnTestList(v); list != nil {
		for _, p := range list {
			add(p)
		}
	} else {
		add(v)
	}
	return out
}

func tnTestOptionWord(flag string, value string) string {
	if strings.ContainsAny(value, " \\"") {
		return flag + "=\\"" + strings.ReplaceAll(value, "\\"", "") + "\\""
	}
	return flag + "=" + value
}

// The NODE_OPTIONS a child runs with: run()'s filters and coverage
func (r *tnTestRun) childOptions() string {
	words := []string{}
	if r.options == nil {
		return ""
	}
	for _, p := range tnTestRunPatterns(TnGet(r.options, "testNamePatterns")) {
		words = append(words, tnTestOptionWord("--test-name-pattern", p))
	}
	for _, p := range tnTestRunPatterns(TnGet(r.options, "testSkipPatterns")) {
		words = append(words, tnTestOptionWord("--test-skip-pattern", p))
	}
	if only, _ := TnGet(r.options, "only").(bool); only {
		words = append(words, "--test-only")
	}
	if coverage, _ := TnGet(r.options, "coverage").(bool); coverage {
		words = append(words, "--experimental-test-coverage")
	}
	if update, _ := TnGet(r.options, "updateSnapshots").(bool); update || tnTestFilters().updateSnapshots {
		words = append(words, "--test-update-snapshots")
	}
	return strings.Join(words, " ")
}

// Starts files until concurrency children run
func (r *tnTestRun) fill() {
	for r.running < r.concurrency && r.next < len(r.files) {
		f := r.files[r.next]
		r.next++
		r.running++
		r.startFile(f)
	}
	if r.running == 0 && r.next >= len(r.files) {
		r.finish()
	}
}

// Events of the file reporting now are relayed at once; later files' wait
func (r *tnTestRun) deliver(f *tnTestRunFile, e *TnTestEvent) {
	if r.reporting < len(r.files) && r.files[r.reporting] == f {
		r.relay(f, e)
		return
	}
	f.held = append(f.held, e)
}

func (r *tnTestRun) relay(f *tnTestRunFile, e *TnTestEvent) {
	d := e.data
	switch e.type_ {
	case "test:summary":
		f.summary = d
		return
	case "test:coverage":
		if d.summary != nil {
			r.coverage = append(r.coverage, d.summary)
		}
		return
	case "test:pass", "test:fail":
		if d.nesting == 0 {
			r.topLevel++
			d.testNumber = r.topLevel
		}
	}
	if d.file == "" && (e.type_ == "test:stdout" || e.type_ == "test:stderr") {
		d.file = f.path
	}
	r.emit(e)
}

func (r *tnTestRun) startFile(f *tnTestRunFile) {
	f.path, _ = filepath.Abs(f.path)
	f.start = time.Now()
	r.emit(&TnTestEvent{type_: "test:enqueue", data: &TnTestEventData{name: f.path, file: f.path, line: 1, column: 1}})
	if f.entry == "" {
		// not a literal path in run({ files }): it wasn't compiled into the program
		f.finished = true
		f.held = append(f.held, &TnTestEvent{type_: "test:stderr", data: &TnTestEventData{file: f.path, message: "run(): " + f.path + " is not compiled into this program (files need literal paths)\\n"}})
		r.fileDone(f, 1, "")
		return
	}
	exe, err := os.Executable()
	if err != nil {
		exe = os.Args[0]
	}
	args := []string{}
	if r.options != nil {
		for _, a := range tnTestList(TnGet(r.options, "argv")) {
			args = append(args, TnJSString(a))
		}
	}
	cmd := exec.Command(exe, args...)
	if cwd, ok := TnGet(r.options, "cwd").(string); ok && cwd != "" {
		cmd.Dir = cwd
	}
	env := os.Environ()
	filtered := env[:0]
	for _, kv := range env {
		if !strings.HasPrefix(kv, "NODE_OPTIONS=") && !strings.HasPrefix(kv, "TN_ENTRY=") {
			filtered = append(filtered, kv)
		}
	}
	cmd.Env = append(filtered, "TN_ENTRY="+f.entry, "NODE_TEST_CONTEXT=child-tn", "NODE_OPTIONS="+r.childOptions())
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		f.finished = true
		f.held = append(f.held, &TnTestEvent{type_: "test:stderr", data: &TnTestEventData{file: f.path, message: err.Error() + "\\n"}})
		r.fileDone(f, 1, "")
		return
	}
	r.emit(&TnTestEvent{type_: "test:dequeue", data: &TnTestEventData{name: f.path, file: f.path, line: 1, column: 1}})
	var timer *time.Timer
	if r.options != nil {
		if ms, ok := TnGet(r.options, "timeout").(float64); ok && ms > 0 && !math.IsInf(ms, 1) {
			timer = time.AfterFunc(time.Duration(ms*float64(time.Millisecond)), func() { cmd.Process.Kill() })
		}
	}
	var pipes sync.WaitGroup
	pipes.Add(2)
	go func() {
		defer pipes.Done()
		tnTestReadFrames(stdout, func(e *TnTestEvent) {
			TnLoopPost(func() { r.deliver(f, e) })
		}, func(text string) {
			TnLoopPost(func() {
				r.deliver(f, &TnTestEvent{type_: "test:stdout", data: &TnTestEventData{file: f.path, message: text}})
			})
		})
	}()
	go func() {
		defer pipes.Done()
		buf := make([]byte, 32768)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				text := string(buf[:n])
				TnLoopPost(func() {
					r.deliver(f, &TnTestEvent{type_: "test:stderr", data: &TnTestEventData{file: f.path, message: text}})
				})
			}
			if err != nil {
				return
			}
		}
	}()
	go func() {
		pipes.Wait()
		err := cmd.Wait()
		if timer != nil {
			timer.Stop()
		}
		code, signal := 0, ""
		if err != nil {
			code = 1
			if exit, ok := err.(*exec.ExitError); ok {
				code = exit.ExitCode()
				if code < 0 {
					signal = "SIGKILL"
				}
			}
		}
		TnLoopPost(func() {
			f.finished = true
			r.fileDone(f, code, signal)
		})
	}()
}

// A child exited: its file's summary (or a failure when it crashed), then
// the next files' held events
func (r *tnTestRun) fileDone(f *tnTestRunFile, code int, signal string) {
	f.exitCode, f.signal = code, signal
	r.running--
	r.drain()
	r.fill()
}

// Relays the held events of files whose turn has come
func (r *tnTestRun) drain() {
	for r.reporting < len(r.files) {
		f := r.files[r.reporting]
		held := f.held
		f.held = nil
		for _, e := range held {
			r.relay(f, e)
		}
		if !f.finished {
			return
		}
		r.closeFile(f)
		r.reporting++
	}
}

func (r *tnTestRun) closeFile(f *tnTestRunFile) {
	duration := math.Round(float64(time.Since(f.start).Nanoseconds())/1e3) / 1e3
	// A child that exited with an error its failing tests don't explain crashed: the file fails
	explained := f.summary != nil && f.summary.counts != nil && (f.summary.counts.failed > 0 || f.summary.counts.cancelled > 0)
	if f.exitCode != 0 && !explained {
		{
			r.topLevel++
			err := tnTestFailure("test failed", "testCodeFailure")
			err.props["exitCode"] = float64(f.exitCode)
			err.props["signal"] = tnTestNull
			if f.signal != "" {
				err.props["signal"] = f.signal
			}
			base := &TnTestEventData{name: f.path, file: f.path, line: 1, column: 1}
			r.emit(&TnTestEvent{type_: "test:start", data: base})
			fail := *base
			fail.testNumber = r.topLevel
			fail.details = &TnTestEventDetails{duration_ms: duration, type_: "test", error_: err}
			r.emit(&TnTestEvent{type_: "test:fail", data: &fail})
			r.counts.tests++
			r.counts.failed++
			r.counts.topLevel++
			r.success = false
		}
	}
	if f.summary != nil {
		if c := f.summary.counts; c != nil {
			r.counts.tests += c.tests
			r.counts.failed += c.failed
			r.counts.passed += c.passed
			r.counts.cancelled += c.cancelled
			r.counts.skipped += c.skipped
			r.counts.todo += c.todo
			r.counts.topLevel += c.topLevel
			r.counts.suites += c.suites
		}
		if !f.summary.success {
			r.success = false
		}
		f.summary.file = f.path
		r.emit(&TnTestEvent{type_: "test:summary", data: f.summary})
	}
	complete := &TnTestEventData{name: f.path, nesting: 0, file: f.path, line: 1, column: 1, details: &TnTestEventDetails{duration_ms: duration, type_: "test", passed: f.summary != nil && f.summary.success}}
	r.emit(&TnTestEvent{type_: "test:complete", data: complete})
}

func (r *tnTestRun) finish() {
	r.emit(&TnTestEvent{type_: "test:plan", data: &TnTestEventData{count: r.topLevel}})
	c := r.counts
	duration := math.Round(float64(time.Since(r.start).Nanoseconds())/1e2) / 1e4
	note := func(message string) {
		r.emit(&TnTestEvent{type_: "test:diagnostic", data: &TnTestEventData{message: message, level: "info"}})
	}
	note("tests " + TnNumStr(c.tests))
	note("suites " + TnNumStr(c.suites))
	note("pass " + TnNumStr(c.passed))
	note("fail " + TnNumStr(c.failed))
	note("cancelled " + TnNumStr(c.cancelled))
	note("skipped " + TnNumStr(c.skipped))
	note("todo " + TnNumStr(c.todo))
	note("duration_ms " + TnNumStr(duration))
	if len(r.coverage) > 0 {
		r.emit(&TnTestEvent{type_: "test:coverage", data: &TnTestEventData{summary: tnCoverageMerge(r.coverage)}})
	}
	counts := c
	r.emit(&TnTestEvent{type_: "test:summary", data: &TnTestEventData{success: r.success && c.failed == 0 && c.cancelled == 0, counts: &counts, duration_ms: duration}})
	r.stream.push(nil)
	TnLoopUnref()
}

// The children's coverage of the same program: counts add up per file
func tnCoverageMerge(list []*TnCoverageSummary) *TnCoverageSummary {
	if len(list) == 1 {
		return list[0]
	}
	out := &TnCoverageSummary{workingDirectory: list[0].workingDirectory}
	byPath := map[string]*TnCoverageFile{}
	for _, s := range list {
		for _, f := range s.files {
			m, ok := byPath[f.path]
			if !ok {
				copy := *f
				copy.functions = append([]*TnCoverageFunction{}, f.functions...)
				copy.branches = append([]*TnCoverageCount{}, f.branches...)
				copy.lines = append([]*TnCoverageCount{}, f.lines...)
				byPath[f.path] = &copy
				out.files = append(out.files, &copy)
				continue
			}
			for i, fn := range f.functions {
				if i < len(m.functions) {
					m.functions[i] = &TnCoverageFunction{name: fn.name, line: fn.line, count: m.functions[i].count + fn.count}
				}
			}
			for i, b := range f.branches {
				if i < len(m.branches) {
					m.branches[i] = &TnCoverageCount{line: b.line, count: m.branches[i].count + b.count}
				}
			}
			for i, l := range f.lines {
				if i < len(m.lines) {
					m.lines[i] = &TnCoverageCount{line: l.line, count: m.lines[i].count + l.count}
				}
			}
		}
	}
	totals := &TnCoverageTotals{}
	for _, f := range out.files {
		f.coveredFunctionCount, f.coveredBranchCount, f.coveredLineCount = 0, 0, 0
		for _, fn := range f.functions {
			if fn.count > 0 {
				f.coveredFunctionCount++
			}
		}
		for _, b := range f.branches {
			if b.count > 0 {
				f.coveredBranchCount++
			}
		}
		ignored := f.totalLineCount - float64(len(f.lines))
		f.coveredLineCount = ignored
		for _, l := range f.lines {
			if l.count > 0 {
				f.coveredLineCount++
			}
		}
		f.coveredLinePercent = tnCoveragePercent(f.coveredLineCount, f.totalLineCount)
		f.coveredBranchPercent = tnCoveragePercent(f.coveredBranchCount, f.totalBranchCount)
		f.coveredFunctionPercent = tnCoveragePercent(f.coveredFunctionCount, f.totalFunctionCount)
		totals.totalLineCount += f.totalLineCount
		totals.totalBranchCount += f.totalBranchCount
		totals.totalFunctionCount += f.totalFunctionCount
		totals.coveredLineCount += f.coveredLineCount
		totals.coveredBranchCount += f.coveredBranchCount
		totals.coveredFunctionCount += f.coveredFunctionCount
	}
	totals.coveredLinePercent = tnCoveragePercent(totals.coveredLineCount, totals.totalLineCount)
	totals.coveredBranchPercent = tnCoveragePercent(totals.coveredBranchCount, totals.totalBranchCount)
	totals.coveredFunctionPercent = tnCoveragePercent(totals.coveredFunctionCount, totals.totalFunctionCount)
	out.totals = totals
	return out
}

func tnCoveragePercent(covered float64, total float64) float64 {
	if total == 0 {
		return 100
	}
	return covered / total * 100
}

// Splits a child's stdout into event frames and plain output
func tnTestReadFrames(r io.Reader, onEvent func(e *TnTestEvent), onText func(text string)) {
	marker := []byte(tnTestFrame)
	buf := []byte{}
	chunk := make([]byte, 32768)
	for {
		n, err := r.Read(chunk)
		buf = append(buf, chunk[:n]...)
		for len(buf) > 0 {
			i := bytes.Index(buf, marker)
			if i < 0 {
				// keep what may be the start of a marker
				keep := 0
				for k := len(marker) - 1; k > 0; k-- {
					if bytes.HasSuffix(buf, marker[:k]) {
						keep = k
						break
					}
				}
				if len(buf) > keep {
					onText(string(buf[:len(buf)-keep]))
				}
				buf = append([]byte{}, buf[len(buf)-keep:]...)
				break
			}
			if i > 0 {
				onText(string(buf[:i]))
			}
			end := bytes.IndexByte(buf[i:], '\\n')
			if end < 0 {
				buf = append([]byte{}, buf[i:]...)
				break
			}
			var raw interface{}
			if json.Unmarshal(buf[i+len(marker):i+end], &raw) == nil {
				onEvent(tnTestEventOf(tnCloneDecode(raw)))
			}
			buf = append([]byte{}, buf[i+end+1:]...)
		}
		if err != nil {
			if len(buf) > 0 {
				onText(string(buf))
			}
			return
		}
	}
}`;

// The files of run({ files: [...] }): each literal path is compiled in as an
// entry point; [entry id, path] pairs ('' ids for paths only known at run time)
function runFiles(r: NodeRegistry, options: AstNode): string[] {
  const files = isObjectLiteral(options) ? getOption(options, 'files') : undefined;
  if (!files || files.kind !== 'ArrayLiteralExpression') return [];
  const out: string[] = [];
  for (const element of files.elements ?? []) {
    // path.resolve('./a.test.ts') / path.join(__dirname, 'a.test.ts') name the file too
    let target = element;
    if (
      element.kind === 'CallExpression' &&
      element.expression?.kind === 'PropertyAccessExpression' &&
      element.expression.name?.text === 'resolve' &&
      (element.arguments ?? []).length === 1
    ) {
      target = element.arguments[0];
    }
    const entry = r.entryPoint(target);
    out.push(`[]string{${JSON.stringify(entry)}, ${r.visit(element)}}`);
  }
  return out;
}

export function registerTestRun(r: NodeRegistry): void {
  defineHelper(
    r,
    'nodeTestRun',
    ['bytes', 'encoding/json', 'io', 'math', 'os', 'os/exec', 'path/filepath', 'regexp', 'runtime', 'strings', 'sync', 'time'],
    ['nodeTest', 'nodeTestReporters', 'nodeClone', 'entryPoints', 'nodeEvents'],
    runHelper
  );
  r.functions['test.run'] = (c: NodeCall) => {
    r.helper('nodeTestRun');
    const files = runFiles(r, c.nodes[0]);
    const options = c.args.length > 0 ? c.args[0] : 'nil';
    return `TnTestRun(${options}${files.length > 0 ? ', ' : ''}${files.join(', ')})`;
  };
  r.results['test.run'] = '*TnStream';
  r.paramTypers['test.run'] = (_n: AstNode[]) => ['*TnStream'];
  // run(…).on('test:pass', (data) => …): the event's data
  const streamListeners = r.paramTypers['stream.Duplex#on'];
  const listeners = (nodes: AstNode[]): string[] => {
    const event = nodes[0];
    if (event && event.kind === 'StringLiteral' && String(event.text).startsWith('test:')) {
      r.helper('nodeTestReport');
      return ['*TnTestEventData'];
    }
    return streamListeners ? streamListeners(nodes) : [];
  };
  r.paramTypers['stream.Duplex#on'] = listeners;
  r.paramTypers['stream.Duplex#once'] = listeners;
}
