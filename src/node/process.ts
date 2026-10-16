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

// The end of main: exit with process.exitCode
func TnProcessExit() {
	tnRunBeforeExit(tnExitCode)
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
}

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
