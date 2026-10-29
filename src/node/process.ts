// node:process + the global `process`: argv / env / exit / exitCode / cwd /
// hrtime / memoryUsage / stdout.write / nextTick … (process.env reads and
// writes are lowered in the transpiler: process.env.X → TnGetenv("X"))

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule, setResults } from './registry.js';

const processHelper = `// node:process
var tnProcessStart = time.Now()
var tnExitCode float64

// Node's argv shape: [execPath, script, ...args] (the binary is the script)
func TnProcessArgv() []string {
	return append([]string{TnProcessExecPath(), os.Args[0]}, os.Args[1:]...)
}

func TnProcessExecPath() string {
	exe, err := os.Executable()
	if err != nil {
		return os.Args[0]
	}
	return exe
}

func TnSetExitCode(code float64) { tnExitCode = code }

// process.on('exit') listeners (installed by node:events)
var tnBeforeExit func(code float64)
var tnExiting bool

func tnRunBeforeExit(code float64) {
	if tnBeforeExit != nil && !tnExiting {
		tnExiting = true
		tnBeforeExit(code)
	}
}

// Set by process.stdin.setRawMode: puts the terminal back as it was, as Node does at exit
var tnResetStdio func()

// The end of main: exit with process.exitCode
func TnProcessExit() {
	tnRunBeforeExit(tnExitCode)
	if tnResetStdio != nil {
		tnResetStdio()
	}
	if tnExitCode != 0 {
		os.Exit(int(tnExitCode))
	}
}

// process.exit(code?)
func TnProcessExitWith(code ...float64) {
	if len(code) > 0 {
		tnExitCode = code[0]
	}
	tnRunBeforeExit(tnExitCode)
	if tnResetStdio != nil {
		tnResetStdio()
	}
	os.Exit(int(tnExitCode))
}

func TnProcessChdir(dir string) {
	if err := os.Chdir(dir); err != nil {
		panic(TnNodeError("Error", "ENOENT", "ENOENT: no such file or directory, chdir "+tnQuote(dir)))
	}
}

func tnQuote(s string) string { return "'" + s + "'" }

// process.hrtime([prev]): [seconds, nanoseconds] of a monotonic clock
func TnProcessHrtime(prev ...[]float64) []float64 {
	ns := time.Since(tnProcessStart).Nanoseconds()
	if len(prev) > 0 && len(prev[0]) == 2 {
		ns -= int64(prev[0][0])*1e9 + int64(prev[0][1])
	}
	return []float64{float64(ns / 1e9), float64(ns % 1e9)}
}

func TnProcessHrtimeBigint() *tnbig.Int {
	return tnbig.NewInt(time.Since(tnProcessStart).Nanoseconds())
}

func TnProcessUptime() float64 { return time.Since(tnProcessStart).Seconds() }

type TnMemoryUsage struct {
	rss          float64
	heapTotal    float64
	heapUsed     float64
	external     float64
	arrayBuffers float64
}

func TnProcessMemoryUsage() *TnMemoryUsage {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return &TnMemoryUsage{rss: float64(m.Sys), heapTotal: float64(m.HeapSys), heapUsed: float64(m.HeapAlloc)}
}

// process.stdout.write / process.stderr.write (strings or Buffers)
func TnProcessWrite(w *os.File, v interface{}) bool {
	switch x := v.(type) {
	case string:
		w.WriteString(x)
	case []byte:
		w.Write(x)
	default:
		fmt.Fprint(w, x)
	}
	return true
}

func TnIsTTY(f *os.File) bool {
	info, err := f.Stat()
	return err == nil && info.Mode()&os.ModeCharDevice != 0
}

func TnProcessKill(pid float64, signal ...interface{}) bool {
	p, err := os.FindProcess(int(pid))
	if err != nil {
		panic(TnNodeError("Error", "ESRCH", "kill ESRCH"))
	}
	sig := 15
	if len(signal) > 0 {
		switch s := signal[0].(type) {
		case float64:
			sig = int(s)
		case string:
			switch s {
			case "SIGINT":
				sig = 2
			case "SIGKILL":
				sig = 9
			case "SIGHUP":
				sig = 1
			case "SIGQUIT":
				sig = 3
			}
		}
	}
	if sig == 0 {
		return true
	}
	if sig == 9 || sig == 15 || runtime.GOOS == "windows" {
		err = p.Kill()
	} else {
		err = p.Signal(syscall.Signal(sig))
	}
	if err != nil {
		panic(TnNodeError("Error", "ESRCH", "kill ESRCH"))
	}
	return true
}

func TnProcessEmitWarning(warning interface{}) {
	msg := fmt.Sprint(warning)
	if e, ok := warning.(*TnError); ok {
		msg = e.message
	}
	fmt.Fprintf(os.Stderr, "(node:%d) Warning: %s\\n", os.Getpid(), msg)
	// (Node's hint, after the first warning)
	if !tnWarningHinted {
		tnWarningHinted = true
		fmt.Fprintln(os.Stderr, "(Use \`node --trace-warnings ...\` to show where the warning was created)")
	}
}

var tnWarningHinted bool

func TnProcessVersions() *TnMap[string, string] {
	m := TnNewMap[string, string]()
	m.Set("node", "24.0.0")
	m.Set("go", strings.TrimPrefix(runtime.Version(), "go"))
	return m
}

// process.env as a whole (Object.keys(process.env), spreading it)
func TnEnvMap() *TnMap[string, string] {
	m := TnNewMap[string, string]()
	for _, kv := range os.Environ() {
		if i := strings.Index(kv, "="); i > 0 {
			m.Set(kv[:i], kv[i+1:])
		}
	}
	return m
}

func TnHasEnv(name string) bool {
	_, ok := os.LookupEnv(name)
	return ok
}`;

// Terminal size, raw mode and umask: one variant per target OS (nodeTtyOS@os)
const ttyHelper = `var tnStdinRaw bool

// process.stdout.columns / rows: 0 when the stream is not a terminal
func TnTtyColumns(f *os.File) float64 {
	cols, _, _ := tnTerminalSize(f)
	return float64(cols)
}

func TnTtyRows(f *os.File) float64 {
	_, rows, _ := tnTerminalSize(f)
	return float64(rows)
}

func TnTtyWindowSize(f *os.File) []float64 {
	cols, rows, _ := tnTerminalSize(f)
	return []float64{float64(cols), float64(rows)}
}

// process.stdin.setRawMode(mode): libuv's raw mode; throws when stdin is not a terminal
func TnTtySetRawMode(mode bool) {
	if !tnSetRawMode(os.Stdin, mode) {
		panic(TnNodeError("Error", "EINVAL", "setRawMode EINVAL"))
	}
	tnStdinRaw = mode
	tnResetStdio = func() { tnSetRawMode(os.Stdin, false) }
}

// process.umask(mask?): the previous mask (a number or an octal string)
func TnProcessUmask(mask ...interface{}) float64 {
	if len(mask) == 0 || mask[0] == nil {
		old := tnUmask(0)
		tnUmask(old)
		return float64(old)
	}
	var m int
	switch x := mask[0].(type) {
	case string:
		n, err := strconv.ParseInt(x, 8, 32)
		if err != nil {
			panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The argument 'mask' must be a 32-bit unsigned integer or an octal string. Received '" + x + "'"))
		}
		m = int(n)
	default:
		m = int(TnNumber(x))
	}
	return float64(tnUmask(m & 0o777))
}`;

// Linux: the asm-generic termios ioctls and flags (std syscall only has them
// for some architectures); PowerPC and MIPS number them differently
const linuxTtyHelper = `type tnWinsize struct {
	Row, Col, X, Y uint16
}

func tnTerminalSize(f *os.File) (int, int, bool) {
	var ws tnWinsize
	_, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), uintptr(syscall.TIOCGWINSZ), uintptr(unsafe.Pointer(&ws)))
	if errno != 0 || ws.Col == 0 {
		return 0, 0, false
	}
	return int(ws.Col), int(ws.Row), true
}

var tnSavedTermios *syscall.Termios

func tnSetRawMode(f *os.File, raw bool) bool {
	if strings.HasPrefix(runtime.GOARCH, "ppc") || strings.HasPrefix(runtime.GOARCH, "mips") {
		return false
	}
	var t syscall.Termios
	if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), 0x5401, uintptr(unsafe.Pointer(&t))); errno != 0 {
		return false
	}
	if raw {
		if tnSavedTermios == nil {
			saved := t
			tnSavedTermios = &saved
		}
		t.Iflag &^= 0x2 | 0x100 | 0x10 | 0x20 | 0x400
		t.Oflag |= 0x4
		t.Cflag |= 0x30
		t.Lflag &^= 0x8 | 0x2 | 0x8000 | 0x1
		t.Cc[6], t.Cc[5] = 1, 0
	} else if tnSavedTermios != nil {
		t = *tnSavedTermios
	}
	_, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), 0x5402, uintptr(unsafe.Pointer(&t)))
	return errno == 0
}

func tnUmask(mask int) int {
	return syscall.Umask(mask)
}`;

// macOS and FreeBSD: TIOCGETA / TIOCSETA
const bsdTtyHelper = `type tnWinsize struct {
	Row, Col, X, Y uint16
}

func tnTerminalSize(f *os.File) (int, int, bool) {
	var ws tnWinsize
	_, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), uintptr(syscall.TIOCGWINSZ), uintptr(unsafe.Pointer(&ws)))
	if errno != 0 || ws.Col == 0 {
		return 0, 0, false
	}
	return int(ws.Col), int(ws.Row), true
}

var tnSavedTermios *syscall.Termios

func tnSetRawMode(f *os.File, raw bool) bool {
	var t syscall.Termios
	if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), uintptr(syscall.TIOCGETA), uintptr(unsafe.Pointer(&t))); errno != 0 {
		return false
	}
	if raw {
		if tnSavedTermios == nil {
			saved := t
			tnSavedTermios = &saved
		}
		t.Iflag &^= syscall.BRKINT | syscall.ICRNL | syscall.INPCK | syscall.ISTRIP | syscall.IXON
		t.Oflag |= syscall.ONLCR
		t.Cflag |= syscall.CS8
		t.Lflag &^= syscall.ECHO | syscall.ICANON | syscall.IEXTEN | syscall.ISIG
		t.Cc[syscall.VMIN], t.Cc[syscall.VTIME] = 1, 0
	} else if tnSavedTermios != nil {
		t = *tnSavedTermios
	}
	_, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), uintptr(syscall.TIOCSETA), uintptr(unsafe.Pointer(&t)))
	return errno == 0
}

func tnUmask(mask int) int {
	return syscall.Umask(mask)
}`;

// Windows: the console API (there is no umask; Node returns 0)
const windowsTtyHelper = `var (
	tnTtyKernel32                   = syscall.NewLazyDLL("kernel32.dll")
	tnGetConsoleScreenBufferInfo    = tnTtyKernel32.NewProc("GetConsoleScreenBufferInfo")
	tnSetConsoleMode                = tnTtyKernel32.NewProc("SetConsoleMode")
	tnSavedConsoleMode           uint32
	tnConsoleModeSaved           bool
)

type tnConsoleScreenBufferInfo struct {
	Size, CursorPosition       [2]int16
	Attributes                 uint16
	Left, Top, Right, Bottom   int16
	MaximumWindowSize          [2]int16
}

func tnTerminalSize(f *os.File) (int, int, bool) {
	var info tnConsoleScreenBufferInfo
	ok, _, _ := tnGetConsoleScreenBufferInfo.Call(f.Fd(), uintptr(unsafe.Pointer(&info)))
	if ok == 0 {
		return 0, 0, false
	}
	return int(info.Right-info.Left) + 1, int(info.Bottom-info.Top) + 1, true
}

func tnSetRawMode(f *os.File, raw bool) bool {
	var mode uint32
	if syscall.GetConsoleMode(syscall.Handle(f.Fd()), &mode) != nil {
		return false
	}
	if raw {
		if !tnConsoleModeSaved {
			tnSavedConsoleMode, tnConsoleModeSaved = mode, true
		}
		// no ENABLE_ECHO_INPUT / LINE_INPUT / PROCESSED_INPUT; ENABLE_VIRTUAL_TERMINAL_INPUT
		mode = mode&^(0x4|0x2|0x1) | 0x200
	} else if tnConsoleModeSaved {
		mode = tnSavedConsoleMode
	}
	ok, _, _ := tnSetConsoleMode.Call(f.Fd(), uintptr(mode))
	return ok != 0
}

func tnUmask(mask int) int {
	return 0
}`;

const otherTtyHelper = `func tnTerminalSize(f *os.File) (int, int, bool) {
	return 0, 0, false
}

func tnSetRawMode(f *os.File, raw bool) bool {
	return false
}

func tnUmask(mask int) int {
	return 0
}`;

export function registerProcess(r: NodeRegistry): void {
  defineModule(r, 'process');
  r.globals['process'] = 'process';
  r.objects['process.stdout'] = true;
  r.objects['process.stderr'] = true;
  r.objects['process.stdin'] = true;
  r.objects['process.hrtime'] = true;
  r.objects['process.memoryUsage'] = true;
  defineHelper(
    r,
    'nodeProcess',
    ['fmt', 'math/big', 'os', 'runtime', 'strings', 'syscall', 'time'],
    ['error', 'orderedMap'],
    processHelper
  );
  defineClass(r, 'process.MemoryUsage', '*TnMemoryUsage', 'class', '', 'rss=float64; heapTotal=float64; heapUsed=float64; external=float64; arrayBuffers=float64', '', '');
  const use = () => r.helper('nodeProcess');
  defineHelper(r, 'nodeTtyOS@linux', ['os', 'runtime', 'strings', 'syscall', 'unsafe'], [], linuxTtyHelper);
  for (const goos of ['darwin', 'freebsd']) defineHelper(r, `nodeTtyOS@${goos}`, ['os', 'syscall', 'unsafe'], [], bsdTtyHelper);
  defineHelper(r, 'nodeTtyOS@windows', ['os', 'syscall', 'unsafe'], [], windowsTtyHelper);
  defineHelper(r, 'nodeTtyOS@other', ['os'], [], otherTtyHelper);
  defineHelper(r, 'nodeTty', ['os', 'strconv'], ['nodeTtyOS@os', 'nodeProcess', 'error', 'dynamic'], ttyHelper);
  const tty = () => r.helper('nodeTty');
  const value = (name: string, type: string, emit: () => string) => {
    r.values[`process.${name}`] = (_c: NodeCall) => emit();
    r.valueTypes[`process.${name}`] = type;
  };
  value('argv', '[]string', () => {
    use();
    return 'TnProcessArgv()';
  });
  value('execArgv', '[]string', () => '[]string{}');
  value('argv0', 'string', () => {
    r.pkg('os');
    return 'os.Args[0]';
  });
  value('execPath', 'string', () => {
    use();
    return 'TnProcessExecPath()';
  });
  value('platform', 'string', () => {
    r.helper('osPlatform');
    return 'TnOsPlatform()';
  });
  value('arch', 'string', () => {
    r.helper('nodeOs');
    return 'TnOsArch()';
  });
  value('pid', 'float64', () => {
    r.pkg('os');
    return 'float64(os.Getpid())';
  });
  value('ppid', 'float64', () => {
    r.pkg('os');
    return 'float64(os.Getppid())';
  });
  value('version', 'string', () => '"v24.0.0"');
  value('versions', '*TnMap[string, string]', () => {
    use();
    return 'TnProcessVersions()';
  });
  value('title', 'string', () => '"node"');
  value('exitCode', 'float64', () => {
    use();
    return 'tnExitCode';
  });
  value('env', '*TnMap[string, string]', () => {
    use();
    return 'TnEnvMap()';
  });
  value('stdout.isTTY', 'bool', () => {
    use();
    return 'TnIsTTY(os.Stdout)';
  });
  value('stderr.isTTY', 'bool', () => {
    use();
    return 'TnIsTTY(os.Stderr)';
  });
  value('stdin.isTTY', 'bool', () => {
    use();
    return 'TnIsTTY(os.Stdin)';
  });
  value('stdout.columns', 'float64', () => {
    tty();
    return 'TnTtyColumns(os.Stdout)';
  });
  value('stdout.rows', 'float64', () => {
    tty();
    return 'TnTtyRows(os.Stdout)';
  });
  value('stderr.columns', 'float64', () => {
    tty();
    return 'TnTtyColumns(os.Stderr)';
  });
  value('stderr.rows', 'float64', () => {
    tty();
    return 'TnTtyRows(os.Stderr)';
  });
  value('stdin.isRaw', 'bool', () => {
    tty();
    return 'tnStdinRaw';
  });
  value('stdout.fd', 'float64', () => 'float64(1)');
  value('stderr.fd', 'float64', () => 'float64(2)');
  value('stdin.fd', 'float64', () => 'float64(0)');
  r.functions['process.exitCode='] = (call: NodeCall) => {
    use();
    return `TnSetExitCode(${call.args[0]})`;
  };

  const fn = (name: string, result: string, emit: (call: NodeCall) => string) => {
    r.functions[`process.${name}`] = emit;
    r.results[`process.${name}`] = result;
  };
  fn('exit', '', (call: NodeCall) => {
    use();
    return `TnProcessExitWith(${call.args.slice(0, 1).join(', ')})`;
  });
  fn('cwd', 'string', (_c: NodeCall) => {
    r.pkg('os');
    return 'func() string { __d, _ := os.Getwd(); return __d }()';
  });
  fn('chdir', '', (call: NodeCall) => {
    use();
    return `TnProcessChdir(${call.args[0]})`;
  });
  fn('hrtime', '[]float64', (call: NodeCall) => {
    use();
    return `TnProcessHrtime(${call.args.join(', ')})`;
  });
  fn('hrtime.bigint', '*tnbig.Int', (_c: NodeCall) => {
    use();
    return 'TnProcessHrtimeBigint()';
  });
  fn('uptime', 'float64', (_c: NodeCall) => {
    use();
    return 'TnProcessUptime()';
  });
  fn('memoryUsage', '*TnMemoryUsage', (_c: NodeCall) => {
    use();
    return 'TnProcessMemoryUsage()';
  });
  fn('memoryUsage.rss', 'float64', (_c: NodeCall) => {
    use();
    return 'TnProcessMemoryUsage().rss';
  });
  fn('stdout.write', 'bool', (call: NodeCall) => {
    use();
    return `TnProcessWrite(os.Stdout, ${call.args[0]})`;
  });
  fn('stderr.write', 'bool', (call: NodeCall) => {
    use();
    return `TnProcessWrite(os.Stderr, ${call.args[0]})`;
  });
  for (const stream of ['stdout', 'stderr']) {
    const f = stream === 'stdout' ? 'os.Stdout' : 'os.Stderr';
    fn(`${stream}.getWindowSize`, '[]float64', (_c: NodeCall) => {
      tty();
      return `TnTtyWindowSize(${f})`;
    });
  }
  fn('stdin.setRawMode', '', (call: NodeCall) => {
    tty();
    return `TnTtySetRawMode(${call.args[0]})`;
  });
  fn('umask', 'float64', (call: NodeCall) => {
    tty();
    return `TnProcessUmask(${call.args.slice(0, 1).join(', ')})`;
  });
  fn('nextTick', '', (call: NodeCall) => {
    r.helper('timerWait');
    const rest = call.args.slice(1).join(', ');
    return `TnQueueMicrotask(func() { (${call.args[0]})(${rest}) })`;
  });
  fn('kill', 'bool', (call: NodeCall) => {
    use();
    return `TnProcessKill(${call.args.join(', ')})`;
  });
  fn('emitWarning', '', (call: NodeCall) => {
    use();
    return `TnProcessEmitWarning(${call.args[0]})`;
  });
  for (const id of ['getuid', 'getgid', 'geteuid', 'getegid']) {
    const goName = id === 'getuid' ? 'Getuid' : id === 'getgid' ? 'Getgid' : id === 'geteuid' ? 'Geteuid' : 'Getegid';
    fn(id, 'float64', (_c: NodeCall) => {
      r.pkg('os');
      return `float64(os.${goName}())`;
    });
  }
  setResults(r, 'process', '');
}
