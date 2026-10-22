// node:child_process — sync (execSync / execFileSync / spawnSync, Buffers
// unless an encoding is given) and async (exec / execFile with callbacks,
// spawn → ChildProcess with stdio streams and exit / close events)
import { defineClass, defineHelper, defineModule, encodingOf, getOption, isStringNode } from './registry.js';
const childHelper = `// node:child_process
type tnSpawnOptions struct {
	cwd      string
	env      []string
	shell    bool
	input    []byte
	stdio    string
	encoding string
	detached bool
}

// Environment entries from an env option (records, objects, process.env)
func tnEnvList(v interface{}) []string {
	if v == nil || TnIsNil(v) {
		return nil
	}
	out := []string{}
	if withEntries, ok := v.(interface{ Entries() [][]interface{} }); ok {
		for _, e := range withEntries.Entries() {
			out = append(out, fmt.Sprint(e[0])+"="+TnJSString(e[1]))
		}
		return out
	}
	if m, ok := v.(map[string]interface{}); ok {
		for k, val := range m {
			out = append(out, k+"="+TnJSString(val))
		}
		return out
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && !rv.IsNil() && rv.Elem().Kind() == reflect.Struct {
		sv := rv.Elem()
		for i := 0; i < sv.NumField(); i++ {
			f := sv.Field(i)
			value := reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Interface()
			out = append(out, strings.TrimSuffix(sv.Type().Field(i).Name, "_")+"="+TnJSString(value))
		}
	}
	return out
}

func tnSpawnOpts(options []interface{}) tnSpawnOptions {
	o := tnSpawnOptions{stdio: "pipe"}
	if len(options) == 0 || options[0] == nil {
		return o
	}
	opts := options[0]
	if s, ok := TnGet(opts, "cwd").(string); ok {
		o.cwd = s
	}
	if env := TnGet(opts, "env"); env != nil {
		o.env = tnEnvList(env)
	}
	switch sh := TnGet(opts, "shell").(type) {
	case bool:
		o.shell = sh
	case string:
		o.shell = sh != ""
	}
	switch in := TnGet(opts, "input").(type) {
	case string:
		o.input = []byte(in)
	case []byte:
		o.input = in
	}
	switch st := TnGet(opts, "stdio").(type) {
	case string:
		o.stdio = st
	case []interface{}:
		if len(st) > 1 {
			if s, ok := st[1].(string); ok {
				o.stdio = s
			}
		}
	case []string:
		if len(st) > 1 {
			o.stdio = st[1]
		}
	}
	if e, ok := TnGet(opts, "encoding").(string); ok {
		o.encoding = e
	}
	if d, ok := TnGet(opts, "detached").(bool); ok {
		o.detached = d
	}
	return o
}

func tnShellCommand(command string) (string, []string) {
	if runtime.GOOS == "windows" {
		return "cmd", []string{"/d", "/s", "/c", command}
	}
	return "/bin/sh", []string{"-c", command}
}

func tnCommand(file string, args []string, o tnSpawnOptions) *exec.Cmd {
	if o.shell {
		file, args = tnShellCommand(strings.TrimSpace(file + " " + strings.Join(args, " ")))
	}
	cmd := exec.Command(file, args...)
	cmd.Dir = o.cwd
	if o.env != nil {
		cmd.Env = o.env
	}
	if o.detached {
		tnDetach(cmd)
	}
	return cmd
}

func tnExitStatus(err error) (float64, bool) {
	if err == nil {
		return 0, true
	}
	if exitErr, ok := err.(*exec.ExitError); ok {
		return float64(exitErr.ExitCode()), true
	}
	return -1, false
}

func tnSpawnError(err error, file string) *TnError {
	e := TnSysError(err, "spawn "+file, file)
	if errors.Is(err, exec.ErrNotFound) {
		e = TnSysError(fs.ErrNotExist, "spawn "+file, file)
	}
	e.props["spawnargs"] = []interface{}{}
	return e
}

type tnSyncRun struct {
	stdout []byte
	stderr []byte
	status float64
	pid    float64
	err    error
}

func tnRunSync(file string, args []string, o tnSpawnOptions, inheritStderr bool) tnSyncRun {
	cmd := tnCommand(file, args, o)
	var stdout, stderr bytes.Buffer
	if o.input != nil {
		cmd.Stdin = bytes.NewReader(o.input)
	}
	if o.stdio == "inherit" {
		cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	} else if o.stdio != "ignore" {
		cmd.Stdout = &stdout
		if inheritStderr {
			cmd.Stderr = io.MultiWriter(&stderr, os.Stderr)
		} else {
			cmd.Stderr = &stderr
		}
	}
	err := cmd.Run()
	run := tnSyncRun{stdout: stdout.Bytes(), stderr: stderr.Bytes()}
	if cmd.Process != nil {
		run.pid = float64(cmd.Process.Pid)
	}
	status, ok := tnExitStatus(err)
	run.status = status
	if !ok {
		run.err = err
	}
	return run
}

// execSync / execFileSync: stdout; a non-zero exit throws (status / stdout / stderr on the error)
func tnExecSyncRun(file string, args []string, display string, options []interface{}) tnSyncRun {
	o := tnSpawnOpts(options)
	run := tnRunSync(file, args, o, true)
	if run.err != nil {
		panic(tnSpawnError(run.err, file))
	}
	if run.status != 0 {
		e := TnNodeError("Error", "", "Command failed: "+display+"\\n"+string(run.stderr))
		e.props["status"] = run.status
		e.props["stdout"] = TnBufferToString(run.stdout, "")
		e.props["stderr"] = TnBufferToString(run.stderr, "")
		e.props["pid"] = run.pid
		panic(e)
	}
	return run
}

func TnExecSync(command string, options ...interface{}) []byte {
	file, args := tnShellCommand(command)
	return tnExecSyncRun(file, args, command, options).stdout
}

func TnExecSyncString(command string, enc string, options ...interface{}) string {
	return TnBufferToString(TnExecSync(command, options...), enc)
}

func TnExecFileSync(file string, args []string, options ...interface{}) []byte {
	return tnExecSyncRun(file, args, strings.TrimSpace(file+" "+strings.Join(args, " ")), options).stdout
}

func TnExecFileSyncString(file string, args []string, enc string, options ...interface{}) string {
	return TnBufferToString(TnExecFileSync(file, args, options...), enc)
}

// spawnSync results: stdout / stderr are strings with an encoding, Buffers without
type TnSpawnSyncResult struct {
	pid    float64
	stdout string
	stderr string
	status float64
	signal *string
	output []interface{}
	error  *TnError
}

type TnSpawnSyncBytes struct {
	pid    float64
	stdout []byte
	stderr []byte
	status float64
	signal *string
	output []interface{}
	error  *TnError
}

func TnSpawnSync(file string, args []string, options ...interface{}) *TnSpawnSyncBytes {
	o := tnSpawnOpts(options)
	run := tnRunSync(file, args, o, false)
	res := &TnSpawnSyncBytes{pid: run.pid, stdout: run.stdout, stderr: run.stderr, status: run.status}
	res.output = []interface{}{nil, res.stdout, res.stderr}
	if run.err != nil {
		res.error = tnSpawnError(run.err, file)
	}
	return res
}

func TnSpawnSyncString(file string, args []string, enc string, options ...interface{}) *TnSpawnSyncResult {
	b := TnSpawnSync(file, args, options...)
	res := &TnSpawnSyncResult{pid: b.pid, stdout: TnBufferToString(b.stdout, enc), stderr: TnBufferToString(b.stderr, enc), status: b.status, error: b.error}
	res.output = []interface{}{nil, res.stdout, res.stderr}
	return res
}

// ChildProcess (spawn / exec / execFile)
type TnChildProcess struct {
	TnEventEmitter
	stdin      *TnStream
	stdout     *TnStream
	stderr     *TnStream
	pid        float64
	exitCode   interface{}
	signalCode interface{}
	killed     bool
	cmd        *exec.Cmd
	spawnfile  string
	// IPC state of forked children (node:cluster / fork)
	ipc interface{}
	// whether the child keeps the event loop alive (unref() drops it)
	refHeld bool
}

func (cp *TnChildProcess) Get_stdin() *TnStream       { return cp.stdin }
func (cp *TnChildProcess) Get_stdout() *TnStream      { return cp.stdout }
func (cp *TnChildProcess) Get_stderr() *TnStream      { return cp.stderr }
func (cp *TnChildProcess) Get_pid() float64           { return cp.pid }
func (cp *TnChildProcess) Get_exitCode() interface{}  { return cp.exitCode }
func (cp *TnChildProcess) Get_signalCode() interface{} { return cp.signalCode }
func (cp *TnChildProcess) Get_killed() bool           { return cp.killed }
func (cp *TnChildProcess) Get_spawnfile() string      { return cp.spawnfile }

// unref(): the parent can exit while the child runs; ref() undoes it
func (cp *TnChildProcess) unref() {
	if cp.refHeld {
		cp.refHeld = false
		TnLoopUnref()
	}
}

func (cp *TnChildProcess) ref() {
	if !cp.refHeld && cp.exitCode == nil && cp.cmd != nil && cp.cmd.Process != nil {
		cp.refHeld = true
		TnLoopRef()
	}
}

func (cp *TnChildProcess) kill(signal ...interface{}) bool {
	if cp.cmd == nil || cp.cmd.Process == nil || cp.exitCode != nil {
		return false
	}
	cp.killed = true
	cp.signalCode = "SIGTERM"
	if len(signal) > 0 {
		if s, ok := signal[0].(string); ok {
			cp.signalCode = s
		}
	}
	return cp.cmd.Process.Kill() == nil
}

func tnPipeSource(r io.Reader, s *TnStream, done *sync.WaitGroup) {
	go func() {
		defer done.Done()
		buf := make([]byte, 32768)
		for {
			n, err := r.Read(buf)
			if n > 0 {
				chunk := append([]byte{}, buf[:n]...)
				TnLoopPost(func() { s.push(chunk) })
			}
			if err != nil {
				TnLoopPost(func() { s.push(nil) })
				return
			}
		}
	}()
}

func TnSpawn(file string, args []string, options ...interface{}) *TnChildProcess {
	o := tnSpawnOpts(options)
	cp := &TnChildProcess{spawnfile: file}
	cmd := tnCommand(file, args, o)
	cp.cmd = cmd
	var streams sync.WaitGroup
	if o.stdio == "inherit" {
		cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	} else if o.stdio != "ignore" {
		stdinPipe, _ := cmd.StdinPipe()
		stdoutPipe, _ := cmd.StdoutPipe()
		stderrPipe, _ := cmd.StderrPipe()
		cp.stdout = TnNewReadable()
		cp.stderr = TnNewReadable()
		cp.stdin = TnNewWritable()
		cp.stdin.sink = func(chunk interface{}, done func(err interface{})) {
			switch c := chunk.(type) {
			case []byte:
				stdinPipe.Write(c)
			case string:
				io.WriteString(stdinPipe, c)
			}
			done(nil)
		}
		cp.stdin.sinkFinal = func(done func(err interface{})) {
			stdinPipe.Close()
			done(nil)
		}
		streams.Add(2)
		tnPipeSource(stdoutPipe, cp.stdout, &streams)
		tnPipeSource(stderrPipe, cp.stderr, &streams)
	}
	if err := cmd.Start(); err != nil {
		spawnErr := tnSpawnError(err, file)
		TnLoopPost(func() { cp.emit("error", spawnErr) })
		return cp
	}
	cp.pid = float64(cmd.Process.Pid)
	cp.refHeld = true
	TnLoopRef()
	TnLoopPost(func() { cp.emit("spawn") })
	go func() {
		streams.Wait()
		err := cmd.Wait()
		status, _ := tnExitStatus(err)
		TnLoopPost(func() {
			defer cp.unref()
			var code interface{} = status
			var signal interface{}
			if cp.killed {
				code, signal = nil, cp.signalCode
			}
			cp.exitCode = code
			cp.emit("exit", code, signal)
			// 'close' follows the end of the stdio streams that are being read
			pending := 0
			closeOnce := func() {
				pending--
				if pending == 0 {
					cp.emit("close", code, signal)
				}
			}
			pending++
			for _, st := range []*TnStream{cp.stdout, cp.stderr} {
				if st != nil && st.flowing == 1 && !st.endEmitted {
					pending++
					TnLoopRef()
					st.TnEventEmitter.once("end", func() {
						defer TnLoopUnref()
						closeOnce()
					})
				}
			}
			closeOnce()
		})
	}()
	return cp
}

// exec / execFile: the output is collected; callback(err, stdout, stderr)
func tnExecCollect(cp *TnChildProcess, display string, encoding string, cb interface{}) {
	var stdout, stderr []byte
	if cp.stdout != nil {
		cp.stdout.on("data", func(chunk interface{}) { stdout = append(stdout, tnChunksBytes([]interface{}{chunk})...) })
		cp.stderr.on("data", func(chunk interface{}) { stderr = append(stderr, tnChunksBytes([]interface{}{chunk})...) })
	}
	convert := func(b []byte) interface{} {
		if encoding == "buffer" {
			return b
		}
		return TnBufferToString(b, encoding)
	}
	finished := false
	cp.TnEventEmitter.once("error", func(err interface{}) {
		if !finished && cb != nil {
			finished = true
			TnInvoke(cb, err, convert(stdout), convert(stderr))
		}
	})
	cp.TnEventEmitter.once("close", func(code interface{}, signal interface{}) {
		if finished || cb == nil {
			return
		}
		finished = true
		if n, ok := code.(float64); ok && n == 0 {
			TnInvoke(cb, nil, convert(stdout), convert(stderr))
			return
		}
		e := TnNodeError("Error", "", "Command failed: "+display+"\\n"+string(stderr))
		e.props["code"] = code
		e.props["killed"] = cp.killed
		e.props["signal"] = signal
		e.props["cmd"] = display
		e.props["stdout"] = convert(stdout)
		e.props["stderr"] = convert(stderr)
		TnInvoke(cb, e, convert(stdout), convert(stderr))
	})
}

func tnExecEncoding(options []interface{}) string {
	if len(options) > 0 && options[0] != nil {
		if e, ok := TnGet(options[0], "encoding").(string); ok {
			return e
		}
	}
	return "utf8"
}

func TnExec(command string, options interface{}, cb interface{}) *TnChildProcess {
	opts := []interface{}{}
	if options != nil && !TnIsNil(options) {
		opts = append(opts, options)
	}
	file, args := tnShellCommand(command)
	cp := TnSpawn(file, args, opts...)
	tnExecCollect(cp, command, tnExecEncoding(opts), cb)
	return cp
}

func TnExecFile(file string, args []string, options interface{}, cb interface{}) *TnChildProcess {
	opts := []interface{}{}
	if options != nil && !TnIsNil(options) {
		opts = append(opts, options)
	}
	cp := TnSpawn(file, args, opts...)
	tnExecCollect(cp, strings.TrimSpace(file+" "+strings.Join(args, " ")), tnExecEncoding(opts), cb)
	return cp
}

// util.promisify(exec) / promisify(execFile): resolves with { stdout, stderr }
type TnExecOutput struct {
	stdout string
	stderr string
}

func tnExecPromise(start func(cb interface{}) *TnChildProcess) chan *TnExecOutput {
	ch := make(chan *TnExecOutput, 1)
	start(func(err interface{}, stdout string, stderr string) {
		if err != nil && !TnIsNil(err) {
			TnReject(ch, err)
			return
		}
		ch <- &TnExecOutput{stdout: stdout, stderr: stderr}
	})
	return ch
}

func TnExecPromise(command string, options ...interface{}) chan *TnExecOutput {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	return tnExecPromise(func(cb interface{}) *TnChildProcess { return TnExec(command, opts, cb) })
}

func TnExecFilePromise(file string, args []string, options ...interface{}) chan *TnExecOutput {
	var opts interface{}
	if len(options) > 0 {
		opts = options[0]
	}
	return tnExecPromise(func(cb interface{}) *TnChildProcess { return TnExecFile(file, args, opts, cb) })
}`;
// A Go []string expression from an args argument (untyped literals are typed)
function stringArray(arg) {
    if (!arg)
        return '[]string{}';
    if (arg.startsWith('[]') && !arg.startsWith('[]string'))
        return arg.replace(/^\[\]\S* \{/, '[]string{');
    return arg;
}
function isFunctionArg(node, type) {
    return !!node && (node.kind === 'ArrowFunction' || node.kind === 'FunctionExpression' || type.startsWith('func('));
}
// detached: a new session on Unix (setsid, as libuv does), a detached process
// in a new process group on Windows
const unixDetachHelper = `func tnDetach(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.Setsid = true
}`;
const windowsDetachHelper = `func tnDetach(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	// DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
	cmd.SysProcAttr.CreationFlags |= 0x8 | 0x200
}`;
export function registerChildProcess(r) {
    defineModule(r, 'child_process');
    for (const goos of ['linux', 'darwin', 'freebsd', 'openbsd', 'netbsd', 'dragonfly', 'solaris', 'illumos', 'aix']) {
        defineHelper(r, `nodeChildOS@${goos}`, ['os/exec', 'syscall'], [], unixDetachHelper);
    }
    defineHelper(r, 'nodeChildOS@windows', ['os/exec', 'syscall'], [], windowsDetachHelper);
    defineHelper(r, 'nodeChildOS@other', ['os/exec'], [], 'func tnDetach(cmd *exec.Cmd) {}');
    defineHelper(r, 'nodeChild', ['bytes', 'errors', 'fmt', 'io', 'io/fs', 'os', 'os/exec', 'reflect', 'runtime', 'strings', 'sync', 'unsafe'], ['nodeStream', 'fsErrors', 'buffer', 'dynamic', 'nodeInvoke', 'eventLoop', 'promise', 'nodeChildOS@os'], childHelper);
    defineClass(r, 'child_process.ChildProcess', '*TnChildProcess', 'class', 'on=*TnEventEmitter; once=*TnEventEmitter; off=*TnEventEmitter; emit=bool; kill=bool; ref=; unref=', '', 'stdin=*TnStream; stdout=*TnStream; stderr=*TnStream; pid=float64; exitCode=interface{}; signalCode=interface{}; killed=bool; spawnfile=string', '');
    defineClass(r, 'child_process.SpawnSyncReturns', '*TnSpawnSyncResult', 'class', '', 'pid=float64; stdout=string; stderr=string; status=float64; signal=*string; output=[]interface{}; error=*TnError', '', '');
    defineClass(r, 'child_process.SpawnSyncBytes', '*TnSpawnSyncBytes', 'class', '', 'pid=float64; stdout=[]byte; stderr=[]byte; status=float64; signal=*string; output=[]interface{}; error=*TnError', '', '');
    defineClass(r, 'child_process.ExecOutput', '*TnExecOutput', 'class', '', 'stdout=string; stderr=string', '', '');
    r.paramTypers['child_process.ChildProcess#on'] = (nodes) => {
        const event = nodes[0];
        const name = event && event.kind === 'StringLiteral' ? String(event.text) : '';
        if (name === 'exit' || name === 'close')
            return ['interface{}', 'interface{}'];
        return name === 'error' || name === 'message' ? ['interface{}'] : [];
    };
    r.paramTypers['child_process.ChildProcess#once'] = r.paramTypers['child_process.ChildProcess#on'];
    const use = () => r.helper('nodeChild');
    // A literal encoding other than 'buffer' makes the output strings
    const stringEncoding = (node) => {
        const enc = encodingOf(node);
        return enc && enc !== 'buffer' ? enc : '';
    };
    const options = (c, index) => (c.args.length > index ? `, ${c.args[index]}` : '');
    r.functions['child_process.execSync'] = (c) => {
        use();
        const enc = stringEncoding(c.nodes[1]);
        if (enc)
            return `TnExecSyncString(${c.args[0]}, ${JSON.stringify(enc)}${options(c, 1)})`;
        return `TnExecSync(${c.args[0]}${options(c, 1)})`;
    };
    r.typers['child_process.execSync'] = (c) => (stringEncoding(c.nodes[1]) ? 'string' : '[]byte');
    r.functions['child_process.execFileSync'] = (c) => {
        use();
        const hasArgs = c.types[1] ? c.types[1].startsWith('[]') : false;
        const argsExpr = hasArgs ? stringArray(c.args[1]) : '[]string{}';
        const optIndex = hasArgs ? 2 : 1;
        const enc = stringEncoding(c.nodes[optIndex]);
        if (enc)
            return `TnExecFileSyncString(${c.args[0]}, ${argsExpr}, ${JSON.stringify(enc)}${options(c, optIndex)})`;
        return `TnExecFileSync(${c.args[0]}, ${argsExpr}${options(c, optIndex)})`;
    };
    r.typers['child_process.execFileSync'] = (c) => {
        const hasArgs = c.types[1] ? c.types[1].startsWith('[]') : false;
        return stringEncoding(c.nodes[hasArgs ? 2 : 1]) ? 'string' : '[]byte';
    };
    r.functions['child_process.spawnSync'] = (c) => {
        use();
        const hasArgs = c.types[1] ? c.types[1].startsWith('[]') : false;
        const argsExpr = hasArgs ? stringArray(c.args[1]) : '[]string{}';
        const optIndex = hasArgs ? 2 : 1;
        const enc = stringEncoding(c.nodes[optIndex]);
        if (enc)
            return `TnSpawnSyncString(${c.args[0]}, ${argsExpr}, ${JSON.stringify(enc)}${options(c, optIndex)})`;
        return `TnSpawnSync(${c.args[0]}, ${argsExpr}${options(c, optIndex)})`;
    };
    r.typers['child_process.spawnSync'] = (c) => {
        const hasArgs = c.types[1] ? c.types[1].startsWith('[]') : false;
        return stringEncoding(c.nodes[hasArgs ? 2 : 1]) ? '*TnSpawnSyncResult' : '*TnSpawnSyncBytes';
    };
    r.functions['child_process.spawn'] = (c) => {
        use();
        const hasArgs = c.types[1] ? c.types[1].startsWith('[]') : false;
        const argsExpr = hasArgs ? stringArray(c.args[1]) : '[]string{}';
        return `TnSpawn(${c.args[0]}, ${argsExpr}${options(c, hasArgs ? 2 : 1)})`;
    };
    r.results['child_process.spawn'] = '*TnChildProcess';
    // exec(command, [options], [callback])
    r.functions['child_process.exec'] = (c) => {
        use();
        const last = c.nodes.length - 1;
        const hasCallback = last >= 1 && isFunctionArg(c.nodes[last], c.types[last]);
        const cb = hasCallback ? c.args[last] : 'nil';
        const opts = c.nodes.length >= 2 && !(hasCallback && last === 1) ? c.args[1] : 'nil';
        return `TnExec(${c.args[0]}, ${opts}, ${cb})`;
    };
    r.results['child_process.exec'] = '*TnChildProcess';
    // execFile(file, [args], [options], [callback])
    r.functions['child_process.execFile'] = (c) => {
        use();
        const last = c.nodes.length - 1;
        const hasCallback = last >= 1 && isFunctionArg(c.nodes[last], c.types[last]);
        const end = hasCallback ? last : c.nodes.length;
        let index = 1;
        let argsExpr = '[]string{}';
        if (index < end && c.types[index].startsWith('[]')) {
            argsExpr = stringArray(c.args[index]);
            index++;
        }
        const opts = index < end ? c.args[index] : 'nil';
        return `TnExecFile(${c.args[0]}, ${argsExpr}, ${opts}, ${hasCallback ? c.args[last] : 'nil'})`;
    };
    r.results['child_process.execFile'] = '*TnChildProcess';
    const execCallback = (nodes) => {
        // encoding: 'buffer' → Buffers
        const options = nodes.length >= 3 ? nodes[nodes.length - 2] : undefined;
        const encoding = options ? getOption(options, 'encoding') : undefined;
        const isBuffer = !!encoding && isStringNode(encoding) && encoding.text === 'buffer';
        const output = isBuffer ? '[]byte' : 'string';
        return ['*TnError', output, output];
    };
    r.paramTypers['child_process.exec'] = execCallback;
    r.paramTypers['child_process.execFile'] = execCallback;
    // util.promisify(exec) / promisify(execFile)
    r.functions['child_process.exec.__promisify__'] = (c) => {
        use();
        return `TnExecPromise(${c.args.join(', ')})`;
    };
    r.results['child_process.exec.__promisify__'] = 'chan *TnExecOutput';
    r.functions['child_process.execFile.__promisify__'] = (c) => {
        use();
        const hasArgs = c.types[1] ? c.types[1].startsWith('[]') : false;
        return `TnExecFilePromise(${c.args[0]}, ${hasArgs ? stringArray(c.args[1]) : '[]string{}'}${options(c, hasArgs ? 2 : 1)})`;
    };
    r.results['child_process.execFile.__promisify__'] = 'chan *TnExecOutput';
}
