// node:module (builtinModules, isBuiltin), node:v8 (heap statistics from Go's
// runtime, serialize / deserialize over the worker structured-clone codec) and
// node:sea (every TypeNative binary is a single executable)

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule } from './registry.js';

// require('node:module').builtinModules in Node 22 (node:-only modules such as
// node:test are left out, as in Node)
const moduleHelper = `// node:module
var tnBuiltinModules = []string{
	"_http_agent", "_http_client", "_http_common", "_http_incoming", "_http_outgoing", "_http_server",
	"_tls_common", "_tls_wrap", "assert", "assert/strict", "async_hooks",
	"buffer", "child_process", "cluster", "console", "constants", "crypto", "dgram",
	"diagnostics_channel", "dns", "dns/promises", "domain", "events", "fs", "fs/promises", "http",
	"http2", "https", "inspector", "inspector/promises", "module", "net", "os", "path", "path/posix",
	"path/win32", "perf_hooks", "process", "punycode", "querystring", "readline", "readline/promises",
	"repl", "stream", "stream/consumers", "stream/promises", "stream/web", "string_decoder", "sys",
	"timers", "timers/promises", "tls", "trace_events", "tty", "url", "util", "util/types", "v8",
	"vm", "wasi", "worker_threads", "zlib",
	"node:ffi", "node:sea", "node:sqlite", "node:test", "node:test/reporters",
}

// module.findPackageJSON(specifier, base): the nearest package.json at or
// above the specifier (relative to base; a bare name looks in node_modules)
func TnFindPackageJSON(specifier string, base string) interface{} {
	if strings.HasPrefix(base, "file:") {
		base = TnFileURLToPath(base)
	}
	dir := base
	if dir == "" {
		dir, _ = os.Getwd()
	} else if info, err := os.Stat(dir); err != nil || !info.IsDir() {
		dir = filepath.Dir(dir)
	}
	start := ""
	if strings.HasPrefix(specifier, "file:") {
		start = TnFileURLToPath(specifier)
	} else if filepath.IsAbs(specifier) {
		start = specifier
	} else if strings.HasPrefix(specifier, ".") {
		start = filepath.Join(dir, specifier)
	} else {
		for d := dir; ; d = filepath.Dir(d) {
			candidate := filepath.Join(d, "node_modules", specifier, "package.json")
			if _, err := os.Stat(candidate); err == nil {
				return candidate
			}
			if filepath.Dir(d) == d {
				return nil
			}
		}
	}
	for d := filepath.Clean(start); ; d = filepath.Dir(d) {
		candidate := filepath.Join(d, "package.json")
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
		if filepath.Dir(d) == d {
			return nil
		}
	}
}

// isBuiltin('fs') / isBuiltin('node:fs'); node:test, node:sqlite and node:sea
// exist only with the node: scheme
func TnIsBuiltin(name string) bool {
	switch name {
	case "node:ffi", "node:sea", "node:sqlite", "node:test", "node:test/reporters":
		return true
	}
	bare := strings.TrimPrefix(name, "node:")
	for _, m := range tnBuiltinModules {
		if m == bare {
			return true
		}
	}
	return false
}`;

const v8Helper = `// node:v8 heap statistics, from Go's runtime.MemStats
type TnHeapStatistics struct {
	total_heap_size             float64
	total_heap_size_executable  float64
	total_physical_size         float64
	total_available_size        float64
	used_heap_size              float64
	heap_size_limit             float64
	malloced_memory             float64
	peak_malloced_memory        float64
	does_zap_garbage            float64
	number_of_native_contexts   float64
	number_of_detached_contexts float64
	total_global_handles_size   float64
	used_global_handles_size    float64
	external_memory             float64
}

// The heap limit: GOMEMLIMIT / debug.SetMemoryLimit when set, else 4 GiB
// (V8's default on 64-bit systems)
func tnHeapLimit() float64 {
	if limit := debug.SetMemoryLimit(-1); limit < math.MaxInt64 {
		return float64(limit)
	}
	return 4 * 1024 * 1024 * 1024
}

// v8.getHeapSpaceStatistics(): Go's heap in V8's space names (old_space is
// the Go heap; the others have no counterpart and are empty)
type TnHeapSpaceInfo struct {
	space_name           string
	space_size           float64
	space_used_size      float64
	space_available_size float64
	physical_space_size  float64
}

func TnV8HeapSpaceStatistics() []*TnHeapSpaceInfo {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	out := []*TnHeapSpaceInfo{}
	for _, name := range []string{"read_only_space", "new_space", "old_space", "code_space", "shared_space", "trusted_space", "new_large_object_space", "large_object_space", "code_large_object_space", "shared_large_object_space", "trusted_large_object_space"} {
		space := &TnHeapSpaceInfo{space_name: name}
		if name == "old_space" {
			space.space_size = float64(m.HeapSys)
			space.space_used_size = float64(m.HeapAlloc)
			space.space_available_size = float64(m.HeapIdle)
			space.physical_space_size = float64(m.HeapInuse)
		}
		out = append(out, space)
	}
	return out
}

// v8.getHeapCodeStatistics(): no bytecode or script source in a Go binary
type TnHeapCodeStatistics struct {
	code_and_metadata_size      float64
	bytecode_and_metadata_size  float64
	external_script_source_size float64
	cpu_profiler_metadata_size  float64
}

func TnV8HeapCodeStatistics() *TnHeapCodeStatistics {
	return &TnHeapCodeStatistics{}
}

func TnV8HeapStatistics() *TnHeapStatistics {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	limit := tnHeapLimit()
	return &TnHeapStatistics{
		total_heap_size: float64(m.HeapSys), total_physical_size: float64(m.HeapInuse),
		total_available_size: math.Max(0, limit-float64(m.HeapAlloc)), used_heap_size: float64(m.HeapAlloc),
		heap_size_limit: limit, malloced_memory: float64(m.OtherSys), peak_malloced_memory: float64(m.OtherSys),
		number_of_native_contexts: 1,
	}
}

// v8.serialize / deserialize: the structured-clone codec workers use (JSON
// with type tags, behind a 0xFF version byte), not V8's wire format
func TnV8Serialize(v interface{}) []byte {
	data, err := json.Marshal(tnCloneEncode(v))
	if err != nil {
		panic(TnNodeError("Error", "ERR_INVALID_ARG_TYPE", err.Error()))
	}
	return append([]byte{0xFF}, data...)
}

func TnV8Deserialize(buf []byte) interface{} {
	var v interface{}
	if len(buf) == 0 || buf[0] != 0xFF || json.Unmarshal(buf[1:], &v) != nil {
		panic(TnNodeError("Error", "", "Unable to deserialize cloned data."))
	}
	return tnCloneDecode(v)
}`;

const seaHelper = `// node:sea: a TypeNative binary is a single executable without assets
func TnSeaGetAsset(key string, encoding ...string) interface{} {
	panic(TnNodeError("Error", "ERR_SINGLE_EXECUTABLE_APPLICATION_ASSET_NOT_FOUND", "Cannot find asset "+key+" for the single executable application"))
}`;

export function registerModuleV8(r: NodeRegistry): void {
  defineModule(r, 'module');
  defineHelper(r, 'nodeModule', ['os', 'path/filepath', 'strings'], ['nodeUrl'], moduleHelper);
  r.functions['module.findPackageJSON'] = (c: NodeCall) => {
    r.helper('nodeModule');
    const base = c.args[1] === undefined ? '""' : c.types[1] === 'string' ? c.args[1] : `TnJSString(${c.args[1]})`;
    return `TnFindPackageJSON(${c.types[0] === 'string' ? c.args[0] : `TnJSString(${c.args[0]})`}, ${base})`;
  };
  r.results['module.findPackageJSON'] = 'interface{}';
  r.values['module.builtinModules'] = (_c: NodeCall) => {
    r.helper('nodeModule');
    return 'append([]string{}, tnBuiltinModules...)';
  };
  r.valueTypes['module.builtinModules'] = '[]string';
  r.functions['module.isBuiltin'] = (c: NodeCall) => {
    r.helper('nodeModule');
    return `TnIsBuiltin(${c.args[0]})`;
  };
  r.results['module.isBuiltin'] = 'bool';
  // const require = createRequire(import.meta.url) is handled by the
  // transpiler (require('./x.json') reads the file at compile time)
  r.functions['module.createRequire'] = (_c: NodeCall) => 'nil';
  r.results['module.createRequire'] = 'interface{}';

  defineModule(r, 'v8');
  defineHelper(r, 'nodeV8', ['encoding/json', 'math', 'runtime', 'runtime/debug'], ['nodeClone', 'error'], v8Helper);
  defineClass(
    r,
    'v8.HeapInfo',
    '*TnHeapStatistics',
    'class',
    '',
    'total_heap_size=float64; total_heap_size_executable=float64; total_physical_size=float64; total_available_size=float64; used_heap_size=float64; heap_size_limit=float64; malloced_memory=float64; peak_malloced_memory=float64; does_zap_garbage=float64; number_of_native_contexts=float64; number_of_detached_contexts=float64; total_global_handles_size=float64; used_global_handles_size=float64; external_memory=float64',
    '',
    ''
  );
  r.functions['v8.getHeapStatistics'] = (_c: NodeCall) => {
    r.helper('nodeV8');
    return 'TnV8HeapStatistics()';
  };
  r.results['v8.getHeapStatistics'] = '*TnHeapStatistics';
  defineClass(r, 'v8.HeapSpaceInfo', '*TnHeapSpaceInfo', 'class', '', 'space_name=string; space_size=float64; space_used_size=float64; space_available_size=float64; physical_space_size=float64', '', '');
  defineClass(r, 'v8.HeapCodeStatistics', '*TnHeapCodeStatistics', 'class', '', 'code_and_metadata_size=float64; bytecode_and_metadata_size=float64; external_script_source_size=float64; cpu_profiler_metadata_size=float64', '', '');
  r.functions['v8.getHeapSpaceStatistics'] = (_c: NodeCall) => {
    r.helper('nodeV8');
    return 'TnV8HeapSpaceStatistics()';
  };
  r.results['v8.getHeapSpaceStatistics'] = '[]*TnHeapSpaceInfo';
  r.functions['v8.getHeapCodeStatistics'] = (_c: NodeCall) => {
    r.helper('nodeV8');
    return 'TnV8HeapCodeStatistics()';
  };
  r.results['v8.getHeapCodeStatistics'] = '*TnHeapCodeStatistics';
  r.functions['v8.serialize'] = (c: NodeCall) => {
    r.helper('nodeV8');
    return `TnV8Serialize(${c.args[0]})`;
  };
  r.results['v8.serialize'] = '[]byte';
  r.functions['v8.deserialize'] = (c: NodeCall) => {
    r.helper('nodeV8');
    return `TnV8Deserialize(${c.args[0]})`;
  };
  r.results['v8.deserialize'] = 'interface{}';

  defineModule(r, 'sea');
  r.functions['sea.isSea'] = (_c: NodeCall) => 'true';
  r.results['sea.isSea'] = 'bool';
  defineHelper(r, 'nodeSea', [], ['error'], seaHelper);
  for (const name of ['getAsset', 'getRawAsset', 'getAssetAsBlob']) {
    r.functions[`sea.${name}`] = (c: NodeCall) => {
      r.helper('nodeSea');
      return `TnSeaGetAsset(${c.args.join(', ')})`;
    };
    r.results[`sea.${name}`] = 'interface{}';
  }
}
