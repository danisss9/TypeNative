// The WebAssembly global (JS API): modules compiled and run by wazero
// (github.com/tetratelabs/wazero: pure Go, no cgo — an optimizing compiler on
// amd64 / arm64, an interpreter elsewhere). node:wasi (wasi.ts) links its
// imports through the hook here.
import { defineClass, defineHelper, setResults } from './registry.js';
const WAZERO = 'github.com/tetratelabs/wazero';
const wasmHelper = `// WebAssembly: one wazero runtime per process. Every instance, import shim
// and standalone Memory / Global is a module of it under a unique name, so
// imports link by reference (a memory two instances share is one memory)
var tnWasmRT wazero.Runtime
var tnWasmOnce sync.Once
var tnWasmCtx = context.Background()
var tnWasmSeq int

func tnWasmRuntime() wazero.Runtime {
	tnWasmOnce.Do(func() {
		tnWasmRT = wazero.NewRuntimeWithConfig(tnWasmCtx, wazero.NewRuntimeConfig())
	})
	return tnWasmRT
}

func tnWasmName(kind string) string {
	tnWasmSeq++
	return "__tn_" + kind + "_" + strconv.Itoa(tnWasmSeq)
}

// WebAssembly.CompileError / LinkError / RuntimeError (and the TypeErrors /
// RangeErrors the JS API throws): errors named as JS names them
func tnWasmError(name string, message string) *TnError {
	return TnNodeError(name, "", message)
}

func TnWasmNewError(name string, message ...interface{}) *TnError {
	text := ""
	if len(message) > 0 && message[0] != nil {
		text = fmt.Sprint(message[0])
	}
	return tnWasmError(name, text)
}

// node:wasi's import object: a namespace value it made links to wazero's WASI
// host module, and configures the instance (args, env, preopens, stdio)
var tnWasmWasiLink func(ns interface{}) (func(wazero.ModuleConfig) wazero.ModuleConfig, interface{})

// --- The parts of the binary format the JS API describes (wazero's compiled
// modules don't list imported tables / globals, export kinds or custom sections)

type tnWasmImport struct {
	module, name string
	kind         byte
	desc         []byte // a table / memory / global's type, as encoded
	valType      wazeroapi.ValueType
	mutable      bool
}

type tnWasmExport struct {
	name  string
	kind  byte
	index int
}

type tnWasmCustom struct {
	name string
	data []byte
}

type tnWasmInfo struct {
	imports []tnWasmImport
	exports []tnWasmExport
	custom  []tnWasmCustom
	tables  []float64 // initial sizes: the imported tables, then the defined ones
}

type tnWasmReader struct {
	b   []byte
	pos int
}

func (r *tnWasmReader) byte1() byte {
	if r.pos >= len(r.b) {
		panic(tnWasmError("CompileError", "WebAssembly.Module(): unexpected end of module"))
	}
	c := r.b[r.pos]
	r.pos++
	return c
}

func (r *tnWasmReader) uleb() uint64 {
	var v uint64
	var shift uint
	for {
		c := r.byte1()
		if shift < 64 {
			v |= uint64(c&0x7f) << shift
		}
		if c&0x80 == 0 {
			return v
		}
		shift += 7
	}
}

func (r *tnWasmReader) bytes(n int) []byte {
	if n < 0 || r.pos+n > len(r.b) {
		panic(tnWasmError("CompileError", "WebAssembly.Module(): section extends past the end of the module"))
	}
	out := r.b[r.pos : r.pos+n]
	r.pos += n
	return out
}

func (r *tnWasmReader) name() string { return string(r.bytes(int(r.uleb()))) }

// A value type (a typed reference, (ref null? ht), carries a heap type)
func (r *tnWasmReader) valType() wazeroapi.ValueType {
	t := r.byte1()
	if t == 0x63 || t == 0x64 {
		r.uleb()
	}
	return wazeroapi.ValueType(t)
}

// Limits: the initial size (memory64's are LEBs too)
func (r *tnWasmReader) limits() float64 {
	flags := r.byte1()
	min := r.uleb()
	if flags&1 != 0 {
		r.uleb()
	}
	if flags&8 != 0 {
		r.uleb()
	}
	return float64(min)
}

func tnWasmParse(b []byte) *tnWasmInfo {
	if len(b) < 8 || b[0] != 0 || b[1] != 'a' || b[2] != 's' || b[3] != 'm' {
		panic(tnWasmError("CompileError", "WebAssembly.Module(): expected magic word 00 61 73 6d"))
	}
	info := &tnWasmInfo{}
	r := &tnWasmReader{b: b, pos: 8}
	for r.pos < len(b) {
		id := r.byte1()
		sec := &tnWasmReader{b: r.bytes(int(r.uleb()))}
		switch id {
		case 0:
			name := sec.name()
			info.custom = append(info.custom, tnWasmCustom{name: name, data: sec.b[sec.pos:]})
		case 2:
			n := int(sec.uleb())
			for i := 0; i < n; i++ {
				imp := tnWasmImport{module: sec.name(), name: sec.name(), kind: sec.byte1()}
				start := sec.pos
				switch imp.kind {
				case 0:
					sec.uleb()
				case 1:
					imp.valType = sec.valType()
					info.tables = append(info.tables, sec.limits())
				case 2:
					sec.limits()
				case 3:
					imp.valType = sec.valType()
					imp.mutable = sec.byte1() == 1
				case 4:
					sec.byte1()
					sec.uleb()
				}
				imp.desc = sec.b[start:sec.pos]
				info.imports = append(info.imports, imp)
			}
		case 4:
			n := int(sec.uleb())
			for i := 0; i < n; i++ {
				// (a table with an initializer expression: 0x40 0x00 first)
				if sec.pos < len(sec.b) && sec.b[sec.pos] == 0x40 {
					sec.pos += 2
				}
				sec.valType()
				info.tables = append(info.tables, sec.limits())
			}
		case 7:
			n := int(sec.uleb())
			for i := 0; i < n; i++ {
				e := tnWasmExport{name: sec.name(), kind: sec.byte1()}
				e.index = int(sec.uleb())
				info.exports = append(info.exports, e)
			}
		}
	}
	return info
}

var tnWasmKinds = []string{"function", "table", "memory", "global", "tag"}

func tnWasmKind(kind byte) string {
	if int(kind) < len(tnWasmKinds) {
		return tnWasmKinds[kind]
	}
	return "unknown"
}

// --- Encoding the small modules the linker generates

func tnWasmUleb(v uint64) []byte {
	var out []byte
	for {
		c := byte(v & 0x7f)
		v >>= 7
		if v == 0 {
			return append(out, c)
		}
		out = append(out, c|0x80)
	}
}

func tnWasmSleb(v int64) []byte {
	var out []byte
	for {
		c := byte(v & 0x7f)
		v >>= 7
		if (v == 0 && c&0x40 == 0) || (v == -1 && c&0x40 != 0) {
			return append(out, c)
		}
		out = append(out, c|0x80)
	}
}

func tnWasmEncName(s string) []byte {
	return append(tnWasmUleb(uint64(len(s))), s...)
}

func tnWasmSection(out []byte, id byte, n int, body []byte) []byte {
	content := append(tnWasmUleb(uint64(n)), body...)
	out = append(out, id)
	out = append(out, tnWasmUleb(uint64(len(content)))...)
	return append(out, content...)
}

func tnWasmHeader() []byte { return []byte{0, 'a', 's', 'm', 1, 0, 0, 0} }

// One import of a shim: where it comes from and the name it is re-exported as
type tnWasmShimItem struct {
	module, name    string
	kind            byte
	desc            []byte
	params, results []wazeroapi.ValueType
	export          string
}

// A module importing each item and exporting it again under the name the
// importing module expects: what a namespace mixing JS functions with
// memories / globals / tables of other modules resolves to
func tnWasmEncodeShim(items []tnWasmShimItem) []byte {
	var types, imports, exports []byte
	ntypes := 0
	counts := map[byte]int{}
	for _, it := range items {
		imports = append(imports, tnWasmEncName(it.module)...)
		imports = append(imports, tnWasmEncName(it.name)...)
		imports = append(imports, it.kind)
		if it.kind == 0 {
			types = append(types, 0x60)
			types = append(types, tnWasmUleb(uint64(len(it.params)))...)
			for _, p := range it.params {
				types = append(types, byte(p))
			}
			types = append(types, tnWasmUleb(uint64(len(it.results)))...)
			for _, p := range it.results {
				types = append(types, byte(p))
			}
			imports = append(imports, tnWasmUleb(uint64(ntypes))...)
			ntypes++
		} else {
			imports = append(imports, it.desc...)
		}
		exports = append(exports, tnWasmEncName(it.export)...)
		exports = append(exports, it.kind)
		exports = append(exports, tnWasmUleb(uint64(counts[it.kind]))...)
		counts[it.kind]++
	}
	out := tnWasmHeader()
	if ntypes > 0 {
		out = tnWasmSection(out, 1, ntypes, types)
	}
	out = tnWasmSection(out, 2, len(items), imports)
	return tnWasmSection(out, 7, len(items), exports)
}

// A module defining one memory / global (section id, its one entry) exported
// as "v": a standalone new WebAssembly.Memory / Global
func tnWasmStandalone(section byte, entry []byte, kind byte) wazeroapi.Module {
	out := tnWasmSection(tnWasmHeader(), section, 1, entry)
	out = tnWasmSection(out, 7, 1, append(tnWasmEncName("v"), kind, 0))
	mod, err := tnWasmRuntime().InstantiateWithConfig(tnWasmCtx, out, wazero.NewModuleConfig().WithName(tnWasmName("value")).WithStartFunctions())
	if err != nil {
		panic(tnWasmError("RangeError", err.Error()))
	}
	return mod
}

// --- Values crossing between JS and wasm

// externref values: JS values wasm holds by index
var tnWasmRefs = []interface{}{nil}

func tnWasmToJS(t wazeroapi.ValueType, v uint64) interface{} {
	switch t {
	case wazeroapi.ValueTypeI32:
		return float64(int32(uint32(v)))
	case wazeroapi.ValueTypeI64:
		return tnbig.NewInt(int64(v))
	case wazeroapi.ValueTypeF32:
		return float64(math.Float32frombits(uint32(v)))
	case wazeroapi.ValueTypeF64:
		return math.Float64frombits(v)
	case wazeroapi.ValueTypeExternref:
		if v == 0 || v >= uint64(len(tnWasmRefs)) {
			return nil
		}
		return tnWasmRefs[v]
	}
	return nil
}

// ToInt32: modulo 2^32 (NaN and the infinities are 0)
func tnWasmToInt32(f float64) int32 {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}
	return int32(uint32(int64(math.Mod(math.Trunc(f), 4294967296))))
}

var tnWasmMask64 = new(tnbig.Int).SetUint64(math.MaxUint64)

func tnWasmFromJS(t wazeroapi.ValueType, v interface{}) uint64 {
	switch t {
	case wazeroapi.ValueTypeI32:
		return uint64(uint32(tnWasmToInt32(TnNumber(v))))
	case wazeroapi.ValueTypeI64:
		if v == nil {
			panic(tnWasmError("TypeError", "Cannot convert undefined to a BigInt"))
		}
		// (BigInt.asUintN(64, v): the two's complement bits)
		return new(tnbig.Int).And(TnToBigInt(v), tnWasmMask64).Uint64()
	case wazeroapi.ValueTypeF32:
		return uint64(math.Float32bits(float32(TnNumber(v))))
	case wazeroapi.ValueTypeF64:
		return math.Float64bits(TnNumber(v))
	case wazeroapi.ValueTypeExternref:
		if v == nil {
			return 0
		}
		tnWasmRefs = append(tnWasmRefs, v)
		return uint64(len(tnWasmRefs) - 1)
	}
	return 0
}

func tnWasmIsFunc(v interface{}) bool {
	return v != nil && reflect.ValueOf(v).Kind() == reflect.Func
}

// A JS function's result as the values of a multi-value return
func tnWasmValues(v interface{}) []interface{} {
	if list, ok := v.([]interface{}); ok {
		return list
	}
	rv := reflect.ValueOf(v)
	if v == nil || rv.Kind() != reflect.Slice {
		panic(tnWasmError("TypeError", "multi-return value must be iterable"))
	}
	out := make([]interface{}, rv.Len())
	for i := range out {
		out[i] = rv.Index(i).Interface()
	}
	return out
}

// A JS exception thrown by an imported function: wazero unwinds the wasm
// frames (the panic it recovers is tnWasmHostThrow) and the export call that
// entered wasm throws the original value again
var tnWasmThrown interface{}
var tnWasmHasThrown bool

type tnWasmHostThrow struct{}

func tnWasmHostFunc(fn interface{}, params, results []wazeroapi.ValueType) wazeroapi.GoModuleFunc {
	return func(ctx context.Context, mod wazeroapi.Module, stack []uint64) {
		defer func() {
			if r := recover(); r != nil {
				tnWasmThrown, tnWasmHasThrown = r, true
				panic(tnWasmHostThrow{})
			}
		}()
		args := make([]interface{}, len(params))
		for i, t := range params {
			args[i] = tnWasmToJS(t, stack[i])
		}
		result := TnCallValue(fn, args...)
		switch len(results) {
		case 0:
		case 1:
			stack[0] = tnWasmFromJS(results[0], result)
		default:
			values := tnWasmValues(result)
			for i, t := range results {
				var v interface{}
				if i < len(values) {
					v = values[i]
				}
				stack[i] = tnWasmFromJS(t, v)
			}
		}
	}
}

// A failed wazero call as the JS exception: the value an import threw, a
// RuntimeError for a trap (its message as V8 words most), else name
func tnWasmFail(err error, name string) {
	if tnWasmHasThrown {
		v := tnWasmThrown
		tnWasmThrown, tnWasmHasThrown = nil, false
		panic(v)
	}
	msg := err.Error()
	if i := strings.Index(msg, "wasm error: "); i >= 0 {
		msg = msg[i+len("wasm error: "):]
		if j := strings.IndexByte(msg, '\\n'); j >= 0 {
			msg = msg[:j]
		}
		panic(tnWasmError("RuntimeError", msg))
	}
	panic(tnWasmError(name, msg))
}

// An exported function as a JS function: numbers / BigInts in, a number /
// BigInt (an array of them for several results, undefined for none) out
func tnWasmExportFunc(fn wazeroapi.Function) func(args ...interface{}) interface{} {
	def := fn.Definition()
	params, results := def.ParamTypes(), def.ResultTypes()
	size := len(params)
	if len(results) > size {
		size = len(results)
	}
	return func(args ...interface{}) interface{} {
		stack := make([]uint64, size)
		for i, t := range params {
			var a interface{}
			if i < len(args) {
				a = args[i]
			}
			stack[i] = tnWasmFromJS(t, a)
		}
		if err := fn.CallWithStack(tnWasmCtx, stack); err != nil {
			tnWasmFail(err, "RuntimeError")
		}
		switch len(results) {
		case 0:
			return nil
		case 1:
			return tnWasmToJS(results[0], stack[0])
		}
		out := make([]interface{}, len(results))
		for i, t := range results {
			out[i] = tnWasmToJS(t, stack[i])
		}
		return out
	}
}

// --- The JS API's objects

type TnWasmModule struct {
	info     *tnWasmInfo
	compiled wazero.CompiledModule
}

type TnWasmInstance struct {
	mod     wazeroapi.Module
	module  *TnWasmModule
	exports *TnMap[string, interface{}]
	// the node:wasi instance whose import object it was linked with
	wasi interface{}
}

func (i *TnWasmInstance) Get_exports() *TnMap[string, interface{}] { return i.exports }

// { module, instance }: WebAssembly.instantiate(bytes)'s result
type TnWasmInstantiated struct {
	module   *TnWasmModule
	instance *TnWasmInstance
}

type TnWasmImportDescriptor struct {
	module string
	name   string
	kind   string
}

type TnWasmExportDescriptor struct {
	name string
	kind string
}

// A memory: owner / name are the module exporting it (what imports link to)
type TnWasmMemory struct {
	owner, name string
	mem         wazeroapi.Memory
}

// memory.buffer: a view of the memory's bytes (after grow, a new one)
func (m *TnWasmMemory) Get_buffer() []byte {
	b, _ := m.mem.Read(0, m.mem.Size())
	if b == nil {
		b = []byte{}
	}
	return b
}

func (m *TnWasmMemory) grow(delta float64) float64 {
	prev, ok := m.mem.Grow(uint32(delta))
	if !ok {
		panic(tnWasmError("RangeError", "WebAssembly.Memory.grow(): Maximum memory size exceeded"))
	}
	return float64(prev)
}

type TnWasmGlobal struct {
	owner, name string
	g           wazeroapi.Global
}

func (g *TnWasmGlobal) Get_value() interface{} { return tnWasmToJS(g.g.Type(), g.g.Get()) }

func (g *TnWasmGlobal) Set_value(v interface{}) {
	mg, ok := g.g.(wazeroapi.MutableGlobal)
	if !ok {
		panic(tnWasmError("TypeError", "WebAssembly.Global.value: Can't set the value of an immutable global."))
	}
	mg.Set(tnWasmFromJS(g.g.Type(), v))
}

func (g *TnWasmGlobal) valueOf() interface{} { return g.Get_value() }

// A table: exported and imported again (wazero has no API to read or write one)
type TnWasmTable struct {
	owner, name string
	length      float64
}

func (t *TnWasmTable) Get_length() float64 { return t.length }

func tnWasmNoTables(what string) *TnError {
	return TnNodeError("Error", "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM", what+" is not supported: TypeNative's WebAssembly runtime (wazero) does not expose tables")
}

func (t *TnWasmTable) get(index float64) interface{} {
	panic(tnWasmNoTables("WebAssembly.Table.prototype.get"))
}

func (t *TnWasmTable) set(index float64, value ...interface{}) {
	panic(tnWasmNoTables("WebAssembly.Table.prototype.set"))
}

func (t *TnWasmTable) grow(delta float64, value ...interface{}) float64 {
	panic(tnWasmNoTables("WebAssembly.Table.prototype.grow"))
}

func TnNewWasmTable(descriptor interface{}, value ...interface{}) *TnWasmTable {
	panic(tnWasmNoTables("new WebAssembly.Table()"))
}

// A BufferSource's bytes (a Uint8Array / Buffer / ArrayBuffer, or a view)
func tnWasmBytes(src interface{}, where string) []byte {
	switch b := src.(type) {
	case []byte:
		return b
	case *[]byte:
		if b != nil {
			return *b
		}
	case interface {
		Get_buffer() []byte
		Get_byteOffset() float64
		Get_byteLength() float64
	}:
		buf := b.Get_buffer()
		off := int(b.Get_byteOffset())
		return buf[off : off+int(b.Get_byteLength())]
	}
	panic(tnWasmError("TypeError", where+": Argument 0 must be a buffer source"))
}

func TnNewWasmModule(src interface{}) *TnWasmModule {
	b := tnWasmBytes(src, "WebAssembly.Module()")
	compiled, err := tnWasmRuntime().CompileModule(tnWasmCtx, b)
	if err != nil {
		panic(tnWasmError("CompileError", "WebAssembly.Module(): "+err.Error()))
	}
	return &TnWasmModule{info: tnWasmParse(b), compiled: compiled}
}

func TnWasmValidate(src interface{}) bool {
	b := tnWasmBytes(src, "WebAssembly.validate()")
	compiled, err := tnWasmRuntime().CompileModule(tnWasmCtx, b)
	if err != nil {
		return false
	}
	compiled.Close(tnWasmCtx)
	return true
}

func TnWasmModuleImports(m *TnWasmModule) []*TnWasmImportDescriptor {
	out := []*TnWasmImportDescriptor{}
	for _, imp := range m.info.imports {
		out = append(out, &TnWasmImportDescriptor{module: imp.module, name: imp.name, kind: tnWasmKind(imp.kind)})
	}
	return out
}

func TnWasmModuleExports(m *TnWasmModule) []*TnWasmExportDescriptor {
	out := []*TnWasmExportDescriptor{}
	for _, e := range m.info.exports {
		out = append(out, &TnWasmExportDescriptor{name: e.name, kind: tnWasmKind(e.kind)})
	}
	return out
}

func TnWasmModuleCustomSections(m *TnWasmModule, name string) [][]byte {
	out := [][]byte{}
	for _, c := range m.info.custom {
		if c.name == name {
			out = append(out, append([]byte{}, c.data...))
		}
	}
	return out
}

// new WebAssembly.Memory({ initial, maximum })
func TnNewWasmMemory(descriptor interface{}) *TnWasmMemory {
	initial := TnGet(descriptor, "initial")
	if initial == nil {
		panic(tnWasmError("TypeError", "WebAssembly.Memory(): Property 'initial' is required"))
	}
	limits := []byte{0}
	limits = append(limits, tnWasmUleb(uint64(TnNumber(initial)))...)
	if maximum := TnGet(descriptor, "maximum"); maximum != nil {
		if TnNumber(maximum) < TnNumber(initial) {
			panic(tnWasmError("RangeError", "WebAssembly.Memory(): Property 'maximum': value is below the lower bound"))
		}
		limits[0] = 1
		limits = append(limits, tnWasmUleb(uint64(TnNumber(maximum)))...)
	}
	mod := tnWasmStandalone(5, limits, 2)
	return &TnWasmMemory{owner: mod.Name(), name: "v", mem: mod.ExportedMemory("v")}
}

var tnWasmValueTypes = map[string]wazeroapi.ValueType{
	"i32": wazeroapi.ValueTypeI32, "i64": wazeroapi.ValueTypeI64,
	"f32": wazeroapi.ValueTypeF32, "f64": wazeroapi.ValueTypeF64,
}

// A global of type t holding v (a constant initializer)
func tnWasmNewGlobal(t wazeroapi.ValueType, mutable bool, v interface{}) *TnWasmGlobal {
	entry := []byte{byte(t), 0}
	if mutable {
		entry[1] = 1
	}
	switch t {
	case wazeroapi.ValueTypeI32:
		entry = append(entry, 0x41)
		entry = append(entry, tnWasmSleb(int64(tnWasmToInt32(TnNumber(v))))...)
	case wazeroapi.ValueTypeI64:
		var n int64
		if v != nil {
			n = int64(tnWasmFromJS(t, v))
		}
		entry = append(entry, 0x42)
		entry = append(entry, tnWasmSleb(n)...)
	case wazeroapi.ValueTypeF32:
		var f float64
		if v != nil {
			f = TnNumber(v)
		}
		bits := math.Float32bits(float32(f))
		entry = append(entry, 0x43, byte(bits), byte(bits>>8), byte(bits>>16), byte(bits>>24))
	case wazeroapi.ValueTypeF64:
		var f float64
		if v != nil {
			f = TnNumber(v)
		}
		bits := math.Float64bits(f)
		entry = append(entry, 0x44)
		for i := 0; i < 8; i++ {
			entry = append(entry, byte(bits>>(8*i)))
		}
	default:
		panic(tnWasmError("TypeError", "WebAssembly.Global(): only i32, i64, f32 and f64 globals are supported"))
	}
	entry = append(entry, 0x0b)
	mod := tnWasmStandalone(6, entry, 3)
	return &TnWasmGlobal{owner: mod.Name(), name: "v", g: mod.ExportedGlobal("v")}
}

// new WebAssembly.Global({ value, mutable }, v)
func TnNewWasmGlobal(descriptor interface{}, value ...interface{}) *TnWasmGlobal {
	name, _ := TnGet(descriptor, "value").(string)
	t, ok := tnWasmValueTypes[name]
	if !ok {
		panic(tnWasmError("TypeError", "WebAssembly.Global(): Descriptor property 'value' must be a WebAssembly type"))
	}
	var v interface{}
	if len(value) > 0 {
		v = value[0]
	}
	return tnWasmNewGlobal(t, TnTruthy(TnGet(descriptor, "mutable")), v)
}

// One import namespace (a JS object) as a module wazero links: a shim
// re-exporting a host module's functions (the JS ones) and other modules'
// memories / globals / tables (wazero's import resolver takes compiled
// modules only, not host modules)
func tnWasmLinkNamespace(m *TnWasmModule, ns string, indices []int, nsObj interface{}, funcDefs map[int]wazeroapi.FunctionDefinition) wazeroapi.Module {
	rt := tnWasmRuntime()
	hostName := tnWasmName("host")
	var builder wazero.HostModuleBuilder
	var shim []tnWasmShimItem
	seen := map[string]bool{}
	for _, i := range indices {
		imp := m.info.imports[i]
		if seen[imp.name] {
			continue
		}
		seen[imp.name] = true
		v := TnGet(nsObj, imp.name)
		where := "WebAssembly.Instance(): Import #" + strconv.Itoa(i) + " " + strconv.Quote(ns) + " " + strconv.Quote(imp.name)
		item := tnWasmShimItem{kind: imp.kind, desc: imp.desc, export: imp.name}
		switch imp.kind {
		case 0:
			if !tnWasmIsFunc(v) {
				panic(tnWasmError("LinkError", where+": function import requires a callable"))
			}
			def := funcDefs[i]
			if builder == nil {
				builder = rt.NewHostModuleBuilder(hostName)
			}
			builder.NewFunctionBuilder().WithGoModuleFunction(tnWasmHostFunc(v, def.ParamTypes(), def.ResultTypes()), def.ParamTypes(), def.ResultTypes()).Export(imp.name)
			item.module, item.name = hostName, imp.name
			item.params, item.results = def.ParamTypes(), def.ResultTypes()
		case 1:
			t, ok := v.(*TnWasmTable)
			if !ok {
				panic(tnWasmError("LinkError", where+": table import requires a WebAssembly.Table"))
			}
			item.module, item.name = t.owner, t.name
		case 2:
			mem, ok := v.(*TnWasmMemory)
			if !ok {
				panic(tnWasmError("LinkError", where+": memory import must be a WebAssembly.Memory object"))
			}
			item.module, item.name = mem.owner, mem.name
		case 3:
			g, ok := v.(*TnWasmGlobal)
			if !ok {
				_, isNum := v.(float64)
				_, isBig := v.(*tnbig.Int)
				if imp.mutable || (!isNum && !isBig) {
					panic(tnWasmError("LinkError", where+": global import must be a number, valid Wasm reference, or WebAssembly.Global object"))
				}
				g = tnWasmNewGlobal(imp.valType, false, v)
			}
			item.module, item.name = g.owner, g.name
		default:
			panic(tnWasmError("LinkError", where+": tag imports are not supported"))
		}
		shim = append(shim, item)
	}
	if builder != nil {
		if _, err := builder.Instantiate(tnWasmCtx); err != nil {
			panic(tnWasmError("LinkError", err.Error()))
		}
	}
	mod, err := rt.InstantiateWithConfig(tnWasmCtx, tnWasmEncodeShim(shim), wazero.NewModuleConfig().WithName(tnWasmName("shim")).WithStartFunctions())
	if err != nil {
		tnWasmFail(err, "LinkError")
	}
	return mod
}

func tnWasmArg(args []interface{}) interface{} {
	if len(args) > 0 {
		return args[0]
	}
	return nil
}

// new WebAssembly.Instance(module, importObject)
func TnNewWasmInstance(m *TnWasmModule, importObject ...interface{}) *TnWasmInstance {
	imports := tnWasmArg(importObject)
	rt := tnWasmRuntime()
	// imports by namespace, in order; the imported functions' signatures
	order := []string{}
	groups := map[string][]int{}
	funcDefs := map[int]wazeroapi.FunctionDefinition{}
	defs := m.compiled.ImportedFunctions()
	fi := 0
	for i, imp := range m.info.imports {
		if _, ok := groups[imp.module]; !ok {
			order = append(order, imp.module)
		}
		groups[imp.module] = append(groups[imp.module], i)
		if imp.kind == 0 && fi < len(defs) {
			funcDefs[i] = defs[fi]
			fi++
		}
	}
	if len(order) > 0 && imports == nil {
		panic(tnWasmError("TypeError", "WebAssembly.Instance(): Imports argument must be present and must be an object"))
	}
	resolved := map[string]wazeroapi.Module{}
	var wasi interface{}
	var configure func(wazero.ModuleConfig) wazero.ModuleConfig
	for _, ns := range order {
		nsObj := TnGet(imports, ns)
		if nsObj == nil {
			panic(tnWasmError("TypeError", "WebAssembly.Instance(): Import #"+strconv.Itoa(groups[ns][0])+" "+strconv.Quote(ns)+": module is not an object or function"))
		}
		if tnWasmWasiLink != nil {
			// (wazero's WASI host module, found by its name)
			if conf, owner := tnWasmWasiLink(nsObj); conf != nil {
				configure, wasi = conf, owner
				continue
			}
		}
		resolved[ns] = tnWasmLinkNamespace(m, ns, groups[ns], nsObj, funcDefs)
	}
	cfg := wazero.NewModuleConfig().WithName(tnWasmName("instance")).WithStartFunctions()
	if configure != nil {
		cfg = configure(cfg)
	}
	ctx := wazeroexp.WithImportResolver(tnWasmCtx, func(name string) wazeroapi.Module {
		if mod, ok := resolved[name]; ok {
			return mod
		}
		return nil
	})
	mod, err := rt.InstantiateModule(ctx, m.compiled, cfg)
	if err != nil {
		tnWasmFail(err, "LinkError")
	}
	inst := &TnWasmInstance{mod: mod, module: m, wasi: wasi}
	exports := TnNewMap[string, interface{}]()
	for _, e := range m.info.exports {
		switch e.kind {
		case 0:
			if f := mod.ExportedFunction(e.name); f != nil {
				exports.Set(e.name, tnWasmExportFunc(f))
			}
		case 1:
			length := 0.0
			if e.index < len(m.info.tables) {
				length = m.info.tables[e.index]
			}
			exports.Set(e.name, &TnWasmTable{owner: mod.Name(), name: e.name, length: length})
		case 2:
			if mem := mod.ExportedMemory(e.name); mem != nil {
				exports.Set(e.name, &TnWasmMemory{owner: mod.Name(), name: e.name, mem: mem})
			}
		case 3:
			if g := mod.ExportedGlobal(e.name); g != nil {
				exports.Set(e.name, &TnWasmGlobal{owner: mod.Name(), name: e.name, g: g})
			}
		}
	}
	inst.exports = exports
	return inst
}

// WebAssembly.compile / instantiate: promises settled before they return (the
// work runs on the loop, so a start function's imports run as JS)
func TnWasmCompile(src interface{}) chan *TnWasmModule {
	ch := make(chan *TnWasmModule, 1)
	func() {
		defer TnRejectExecutor(ch)
		ch <- TnNewWasmModule(src)
	}()
	return ch
}

func TnWasmInstantiate(src interface{}, importObject ...interface{}) chan *TnWasmInstantiated {
	ch := make(chan *TnWasmInstantiated, 1)
	func() {
		defer TnRejectExecutor(ch)
		m, ok := src.(*TnWasmModule)
		if !ok {
			m = TnNewWasmModule(src)
		}
		ch <- &TnWasmInstantiated{module: m, instance: TnNewWasmInstance(m, importObject...)}
	}()
	return ch
}

func TnWasmInstantiateModule(m *TnWasmModule, importObject ...interface{}) chan *TnWasmInstance {
	ch := make(chan *TnWasmInstance, 1)
	func() {
		defer TnRejectExecutor(ch)
		ch <- TnNewWasmInstance(m, importObject...)
	}()
	return ch
}`;
// WebAssembly.compileStreaming / instantiateStreaming — a helper of its own,
// since it names the fetch classes (a Response is its only source)
const wasmStreamingHelper = `// The "source" argument's Received description, as Node formats it
func tnWasmReceived(src interface{}) string {
	switch s := src.(type) {
	case string:
		return "type string (" + strconv.Quote(s) + ")"
	case bool:
		if s {
			return "type boolean (true)"
		}
		return "type boolean (false)"
	case float64:
		return "type number (" + TnNumStr(s) + ")"
	}
	if src == nil {
		return "type null"
	}
	return "an instance of Object"
}

// A Response — or a promise of one — with the MIME type application/wasm is
// read, then compiled / instantiated, as the spec runs it
func tnWasmResponseBytes[T any](r *TnResponse, out chan T, deliver func([]byte)) {
	TnLoopPost(func() {
		mime := r.headers.get("content-type")
		if mime == nil || *mime != "application/wasm" {
			shown := "null"
			if mime != nil {
				shown = *mime
			}
			e := TnNodeError("TypeError", "ERR_WEBASSEMBLY_RESPONSE", "WebAssembly response has unsupported MIME type '"+shown+"'")
			TnReject(out, e)
			return
		}
		body := r.arrayBuffer()
		TnLoopRef()
		go func() {
			defer TnLoopUnref()
			var data []byte
			var failure interface{}
			func() {
				defer func() {
					if rec := recover(); rec != nil {
						failure = rec
					}
				}()
				v, reason, rejected := tnSettle(body)
				if rejected {
					failure = reason
					return
				}
				data = v
			}()
			TnLoopPost(func() {
				if failure != nil {
					TnReject(out, failure)
					return
				}
				func() {
					defer func() {
						if rec := recover(); rec != nil {
							TnReject(out, rec)
						}
					}()
					deliver(data)
				}()
			})
		}()
	})
}

// (a promise's value: still a Response, or a promise of one — Promise.resolve
// of an any makes an interface{} channel)
func tnWasmStreamingValue[T any](v interface{}, out chan T, deliver func([]byte)) {
	switch s := v.(type) {
	case *TnResponse:
		tnWasmResponseBytes(s, out, deliver)
	case chan interface{}:
		TnLoopRef()
		go func() {
			defer TnLoopUnref()
			val, reason, rejected := tnSettle(s)
			if rejected {
				TnReject(out, reason)
				return
			}
			tnWasmStreamingValue(val, out, deliver)
		}()
	default:
		TnReject(out, tnWasmStreamingTypeError(v))
	}
}

func tnWasmStreamingTypeError(src interface{}) *TnError {
	return TnNodeError("TypeError", "ERR_INVALID_ARG_TYPE", "The "+strconv.Quote("source")+" argument must be an instance of Response or an Promise resolving to Response. Received "+tnWasmReceived(src))
}

func tnWasmStreamingBytes[T any](src interface{}, out chan T, deliver func([]byte)) {
	switch s := src.(type) {
	case *TnResponse:
		tnWasmResponseBytes(s, out, deliver)
	case chan *TnResponse:
		TnLoopRef()
		go func() {
			defer TnLoopUnref()
			val, reason, rejected := tnSettle(s)
			if rejected {
				TnReject(out, reason)
				return
			}
			tnWasmResponseBytes(val, out, deliver)
		}()
	case chan interface{}:
		tnWasmStreamingValue(s, out, deliver)
	default:
		TnReject(out, tnWasmStreamingTypeError(src))
	}
}

func TnWasmCompileStreaming(src interface{}) chan *TnWasmModule {
	ch := make(chan *TnWasmModule, 1)
	tnWasmStreamingBytes(src, ch, func(b []byte) {
		TnAsyncSend(ch, TnNewWasmModule(b))
	})
	return ch
}

func TnWasmInstantiateStreaming(src interface{}, importObject ...interface{}) chan *TnWasmInstantiated {
	ch := make(chan *TnWasmInstantiated, 1)
	tnWasmStreamingBytes(src, ch, func(b []byte) {
		m := TnNewWasmModule(b)
		TnAsyncSend(ch, &TnWasmInstantiated{module: m, instance: TnNewWasmInstance(m, importObject...)})
	})
	return ch
}`;
export function registerWebAssembly(r) {
    defineHelper(r, 'nodeWasm', [WAZERO, `${WAZERO}/api`, `${WAZERO}/experimental`, 'context', 'fmt', 'math', 'math/big', 'reflect', 'strconv', 'strings', 'sync'], ['dynamic', 'orderedMap', 'error', 'bigint', 'promise'], wasmHelper);
    const use = () => r.helper('nodeWasm');
    defineHelper(r, 'nodeWasmStreaming', ['strconv'], ['nodeWasm', 'nodeFetch', 'eventLoop', 'dynamic', 'promise'], wasmStreamingHelper);
    r.globals['WebAssembly'] = 'WebAssembly';
    r.objects['WebAssembly'] = true;
    defineClass(r, 'WebAssembly.Module', '*TnWasmModule', 'class', '', '', '', '');
    defineClass(r, 'WebAssembly.Instance', '*TnWasmInstance', 'class', '', '', 'exports=*TnMap[string, interface{}]', '');
    // (a plain object: exports.size is an export, not a Map's size)
    r.records['WebAssembly.Instance#exports'] = true;
    defineClass(r, 'WebAssembly.Memory', '*TnWasmMemory', 'class', 'grow=float64', '', 'buffer=[]byte', '');
    defineClass(r, 'WebAssembly.Global', '*TnWasmGlobal', 'class', 'valueOf=interface{}', '', 'value=interface{}', 'value');
    defineClass(r, 'WebAssembly.Table', '*TnWasmTable', 'class', 'get=interface{}; set=; grow=float64', '', 'length=float64', '');
    defineClass(r, 'WebAssembly.WebAssemblyInstantiatedSource', '*TnWasmInstantiated', 'class', '', 'module=*TnWasmModule; instance=*TnWasmInstance', '', '');
    defineClass(r, 'WebAssembly.ModuleImportDescriptor', '*TnWasmImportDescriptor', 'class', '', 'module=string; name=string; kind=string', '', '');
    defineClass(r, 'WebAssembly.ModuleExportDescriptor', '*TnWasmExportDescriptor', 'class', '', 'name=string; kind=string', '', '');
    r.constructors['WebAssembly.Module'] = (c) => {
        use();
        return `TnNewWasmModule(${c.args.join(', ')})`;
    };
    r.constructors['WebAssembly.Instance'] = (c) => {
        use();
        return `TnNewWasmInstance(${c.args.join(', ')})`;
    };
    r.constructors['WebAssembly.Memory'] = (c) => {
        use();
        return `TnNewWasmMemory(${c.args.join(', ')})`;
    };
    r.constructors['WebAssembly.Global'] = (c) => {
        use();
        return `TnNewWasmGlobal(${c.args.join(', ')})`;
    };
    r.constructors['WebAssembly.Table'] = (c) => {
        use();
        return `TnNewWasmTable(${c.args.join(', ')})`;
    };
    // CompileError / LinkError / RuntimeError: *TnError values named as JS
    // names them (instanceof checks the name); they share *TnError's tables
    const errnoKey = r.classByGoType['*TnError'];
    for (const name of ['CompileError', 'LinkError', 'RuntimeError']) {
        const key = `WebAssembly.${name}`;
        defineClass(r, key, '*TnError', 'class', '', 'message=string', 'name=string; stack=string; cause=interface{}', '');
        r.constructors[key] = (c) => {
            use();
            return `TnWasmNewError(${['"' + name + '"'].concat(c.args).join(', ')})`;
        };
    }
    if (errnoKey)
        r.classByGoType['*TnError'] = errnoKey;
    r.functions['WebAssembly.validate'] = (c) => {
        use();
        return `TnWasmValidate(${c.args.join(', ')})`;
    };
    r.functions['WebAssembly.compile'] = (c) => {
        use();
        return `TnWasmCompile(${c.args.join(', ')})`;
    };
    // instantiate(bytes, imports) → { module, instance }; instantiate(module, imports) → instance
    r.functions['WebAssembly.instantiate'] = (c) => {
        use();
        const fn = c.types[0] === '*TnWasmModule' ? 'TnWasmInstantiateModule' : 'TnWasmInstantiate';
        return `${fn}(${c.args.join(', ')})`;
    };
    r.typers['WebAssembly.instantiate'] = (c) => (c.types[0] === '*TnWasmModule' ? 'chan *TnWasmInstance' : 'chan *TnWasmInstantiated');
    // compileStreaming / instantiateStreaming(Response | Promise<Response>) —
    // the fetch classes (TnResponse) come with the streaming helper's requires
    r.functions['WebAssembly.compileStreaming'] = (c) => {
        r.helper('nodeWasmStreaming');
        return `TnWasmCompileStreaming(${c.args.join(', ')})`;
    };
    r.results['WebAssembly.compileStreaming'] = 'chan *TnWasmModule';
    r.functions['WebAssembly.instantiateStreaming'] = (c) => {
        r.helper('nodeWasmStreaming');
        return `TnWasmInstantiateStreaming(${c.args.join(', ')})`;
    };
    r.results['WebAssembly.instantiateStreaming'] = 'chan *TnWasmInstantiated';
    r.functions['WebAssembly.Module.imports'] = (c) => {
        use();
        return `TnWasmModuleImports(${c.args.join(', ')})`;
    };
    r.functions['WebAssembly.Module.exports'] = (c) => {
        use();
        return `TnWasmModuleExports(${c.args.join(', ')})`;
    };
    r.functions['WebAssembly.Module.customSections'] = (c) => {
        use();
        return `TnWasmModuleCustomSections(${c.args.join(', ')})`;
    };
    setResults(r, 'WebAssembly', 'validate=bool; compile=chan *TnWasmModule; Module.imports=[]*TnWasmImportDescriptor; Module.exports=[]*TnWasmExportDescriptor; Module.customSections=[][]byte');
}
