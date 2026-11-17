// node:wasi: WASI preview1 through wazero's host module. The import object's
// namespace links to it, and the instance gets the WASI's args, env,
// preopened directories and stdio (wazero keeps them per guest module).
import { defineClass, defineHelper, defineModule } from './registry.js';
const WAZERO = 'github.com/tetratelabs/wazero';
const wasiHelper = `// new WASI({ version, args, env, preopens, returnOnExit, stdin, stdout, stderr })
type TnWasi struct {
	args         []string
	env          [][2]string
	preopens     [][2]string // guest path, host path
	returnOnExit bool
	stdin        float64
	stdout       float64
	stderr       float64
	wasiImport   *TnMap[string, interface{}]
	started      bool
	abi          string // the import object's module name (preview1 or the legacy name)
}

// wasi.wasiImport objects → their WASI (the value identifies it when linked)
var tnWasiByImport = map[*TnMap[string, interface{}]]*TnWasi{}
var tnWasiLinked bool
var tnWasiLegacyLinked bool

func init() {
	tnWasmWasiLink = func(ns interface{}) (func(wazero.ModuleConfig) wazero.ModuleConfig, interface{}) {
		m, ok := ns.(*TnMap[string, interface{}])
		if !ok {
			return nil, nil
		}
		w := tnWasiByImport[m]
		if w == nil {
			return nil, nil
		}
		// wazero's WASI functions: one host module, the instances' imports
		// find by its name (wasi_snapshot_preview1); version 'unstable' links
		// the same functions under the legacy module name
		if !tnWasiLinked {
			if _, err := wazerowasi.Instantiate(tnWasmCtx, tnWasmRuntime()); err != nil {
				panic(tnWasmError("LinkError", err.Error()))
			}
			tnWasiLinked = true
		}
		if w.abi == "wasi_unstable" && !tnWasiLegacyLinked {
			builder := tnWasmRuntime().NewHostModuleBuilder("wasi_unstable")
			wazerowasi.NewFunctionExporter().ExportFunctions(builder)
			if _, err := builder.Instantiate(tnWasmCtx); err != nil {
				panic(tnWasmError("LinkError", err.Error()))
			}
			tnWasiLegacyLinked = true
		}
		return w.configure, w
	}
}

func tnWasiString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprint(v)
}

func tnWasiOption(options interface{}, name string) interface{} {
	if options == nil {
		return nil
	}
	return TnGet(options, name)
}

func TnNewWasi(options ...interface{}) *TnWasi {
	var o interface{}
	if len(options) > 0 {
		o = options[0]
	}
	version, isString := tnWasiOption(o, "version").(string)
	if !isString {
		received := "undefined"
		if v := tnWasiOption(o, "version"); v != nil {
			received = fmt.Sprintf("type %T", v)
		}
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The "+strconv.Quote("options.version")+" property must be of type string. Received "+received))
	}
	if version != "preview1" && version != "unstable" {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_VALUE", "The property 'options.version' unsupported WASI version. Received '"+version+"'"))
	}
	// the two ABIs have the same functions here; 'unstable' is the legacy name
	// guests import under
	abi := "wasi_snapshot_preview1"
	if version == "unstable" {
		abi = "wasi_unstable"
	}
	w := &TnWasi{returnOnExit: true, stdin: 0, stdout: 1, stderr: 2, abi: abi}
	if args := tnWasiOption(o, "args"); args != nil {
		rv := reflect.ValueOf(args)
		if rv.Kind() == reflect.Pointer {
			rv = rv.Elem()
		}
		if rv.Kind() == reflect.Slice {
			for i := 0; i < rv.Len(); i++ {
				w.args = append(w.args, tnWasiString(rv.Index(i).Interface()))
			}
		}
	}
	if env := tnWasiOption(o, "env"); env != nil {
		for _, k := range TnKeys(env) {
			w.env = append(w.env, [2]string{k, tnWasiString(TnGet(env, k))})
		}
	}
	if preopens := tnWasiOption(o, "preopens"); preopens != nil {
		for _, k := range TnKeys(preopens) {
			w.preopens = append(w.preopens, [2]string{k, tnWasiString(TnGet(preopens, k))})
		}
	}
	if v := tnWasiOption(o, "returnOnExit"); v != nil {
		w.returnOnExit = TnTruthy(v)
	}
	for name, fd := range map[string]*float64{"stdin": &w.stdin, "stdout": &w.stdout, "stderr": &w.stderr} {
		if v := tnWasiOption(o, name); v != nil {
			*fd = TnNumber(v)
		}
	}
	w.wasiImport = TnNewMap[string, interface{}]()
	tnWasiByImport[w.wasiImport] = w
	return w
}

func (w *TnWasi) Get_wasiImport() *TnMap[string, interface{}] { return w.wasiImport }

func (w *TnWasi) getImportObject() *TnMap[string, interface{}] {
	out := TnNewMap[string, interface{}]()
	out.Set(w.abi, w.wasiImport)
	return out
}

// The guest's WASI state; real clocks and randomness (wazero's defaults are
// deterministic fakes)
func (w *TnWasi) configure(cfg wazero.ModuleConfig) wazero.ModuleConfig {
	cfg = cfg.WithArgs(w.args...)
	for _, kv := range w.env {
		cfg = cfg.WithEnv(kv[0], kv[1])
	}
	fsc := wazero.NewFSConfig()
	for _, p := range w.preopens {
		fsc = fsc.WithDirMount(p[1], p[0])
	}
	return cfg.WithFSConfig(fsc).
		WithStdin(tnFile(w.stdin)).WithStdout(tnFile(w.stdout)).WithStderr(tnFile(w.stderr)).
		WithSysWalltime().WithSysNanotime().WithSysNanosleep().WithRandSource(cryptorand.Reader)
}

func tnWasiExport(inst *TnWasmInstance, name string, kind string) {
	panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The "+strconv.Quote("instance.exports."+name)+" property must be of type "+kind+". Received undefined"))
}

func (w *TnWasi) begin(inst *TnWasmInstance) {
	if w.started {
		panic(TnNodeError("Error", "ERR_WASI_ALREADY_STARTED", "WASI instance has already started"))
	}
	if inst.mod.ExportedMemory("memory") == nil {
		tnWasiExport(inst, "memory", "WebAssembly.Memory")
	}
	w.started = true
}

// Runs an entry point: proc_exit's code (0 when it returns), or, unless
// returnOnExit, exits the process with it
func (w *TnWasi) run(fn wazeroapi.Function) float64 {
	_, err := fn.Call(tnWasmCtx)
	if err == nil {
		return 0
	}
	var exit *wazerosys.ExitError
	if !tnWasmHasThrown && errors.As(err, &exit) {
		if w.returnOnExit {
			return float64(exit.ExitCode())
		}
		TnProcessExitWith(float64(exit.ExitCode()))
	}
	tnWasmFail(err, "RuntimeError")
	return 0
}

// wasi.start(instance): runs _start (a command)
func (w *TnWasi) start(inst *TnWasmInstance) float64 {
	fn := inst.mod.ExportedFunction("_start")
	if fn == nil {
		tnWasiExport(inst, "_start", "function")
	}
	if inst.mod.ExportedFunction("_initialize") != nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The "+strconv.Quote("instance.exports._initialize")+" property must be undefined"))
	}
	w.begin(inst)
	return w.run(fn)
}

// wasi.initialize(instance): runs _initialize, if any (a reactor)
func (w *TnWasi) initialize(inst *TnWasmInstance) {
	if inst.mod.ExportedFunction("_start") != nil {
		panic(TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The "+strconv.Quote("instance.exports._start")+" property must be undefined"))
	}
	w.begin(inst)
	if fn := inst.mod.ExportedFunction("_initialize"); fn != nil {
		w.run(fn)
	}
}`;
export function registerWasi(r) {
    defineModule(r, 'wasi');
    defineHelper(r, 'nodeWasi', [WAZERO, `${WAZERO}/api`, `${WAZERO}/sys`, `${WAZERO}/imports/wasi_snapshot_preview1`, 'crypto/rand', 'errors', 'fmt', 'reflect', 'strconv'], ['nodeWasm', 'nodeFs', 'nodeProcess', 'dynamic', 'orderedMap', 'error'], wasiHelper);
    defineClass(r, 'wasi.WASI', '*TnWasi', 'class', 'start=float64; initialize=; getImportObject=*TnMap[string, interface{}]', '', 'wasiImport=*TnMap[string, interface{}]', '');
    r.constructors['wasi.WASI'] = (c) => {
        r.helper('nodeWasi');
        return `TnNewWasi(${c.args.join(', ')})`;
    };
}
