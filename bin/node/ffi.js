// node:ffi — loads shared libraries and calls their C functions (Node 26).
// Without cgo: syscall's LoadLibrary / GetProcAddress / NewCallback on
// Windows, the vendored github.com/ebitengine/purego (dlopen / dlsym and
// callback trampolines in pure Go) elsewhere. Calls are built per signature
// with reflect.FuncOf and purego.RegisterFunc, so mixed integer / float
// arguments follow the platform C ABI. getCurrentEventLoop has no uv_loop_t to
// return (🚫).
import { defineClass, defineHelper, defineModule, setResults } from './registry.js';
const PUREGO = 'github.com/ebitengine/purego';
const ffiHelper = `// node:ffi
const (
	tnFfiVoid = iota
	tnFfiI8
	tnFfiU8
	tnFfiI16
	tnFfiU16
	tnFfiI32
	tnFfiU32
	tnFfiI64
	tnFfiU64
	tnFfiF32
	tnFfiF64
	tnFfiPtr
)

var tnFfiTypeNames = map[string]int{
	"void": tnFfiVoid, "char": tnFfiI8, "i8": tnFfiI8, "int8": tnFfiI8, "bool": tnFfiU8, "u8": tnFfiU8, "uint8": tnFfiU8,
	"i16": tnFfiI16, "int16": tnFfiI16, "u16": tnFfiU16, "uint16": tnFfiU16, "i32": tnFfiI32, "int32": tnFfiI32,
	"u32": tnFfiU32, "uint32": tnFfiU32, "i64": tnFfiI64, "int64": tnFfiI64, "u64": tnFfiU64, "uint64": tnFfiU64,
	"float": tnFfiF32, "f32": tnFfiF32, "float32": tnFfiF32, "double": tnFfiF64, "f64": tnFfiF64, "float64": tnFfiF64,
	"pointer": tnFfiPtr, "ptr": tnFfiPtr, "function": tnFfiPtr, "buffer": tnFfiPtr, "arraybuffer": tnFfiPtr,
	"string": tnFfiPtr, "str": tnFfiPtr,
}

// How argument errors name each kind ("Argument 0 must be an int32")
var tnFfiKindNames = []string{"void", "an int8", "a uint8", "an int16", "a uint16", "an int32", "a uint32", "an int64", "a uint64", "a float", "a double", "a pointer"}

var tnFfiGoTypes = []reflect.Type{nil, reflect.TypeOf(int8(0)), reflect.TypeOf(uint8(0)), reflect.TypeOf(int16(0)),
	reflect.TypeOf(uint16(0)), reflect.TypeOf(int32(0)), reflect.TypeOf(uint32(0)), reflect.TypeOf(int64(0)),
	reflect.TypeOf(uint64(0)), reflect.TypeOf(float32(0)), reflect.TypeOf(float64(0)), reflect.TypeOf(uintptr(0))}

var tnFfiIntRanges = [][2]float64{{}, {-128, 127}, {0, 255}, {-32768, 32767}, {0, 65535}, {-2147483648, 2147483647}, {0, 4294967295}}

const tnFfiMaxSafe = 9007199254740991

type tnFfiSig struct {
	ret  int
	args []int
}

func (s *tnFfiSig) key() string {
	b := []byte{byte(s.ret)}
	for _, a := range s.args {
		b = append(b, byte(a))
	}
	return string(b)
}

func tnFfiTypeErr(code, msg string) *TnError { return TnNodeError("TypeError", code, msg) }

func tnFfiIsObject(v interface{}) bool {
	if v == nil {
		return false
	}
	switch v.(type) {
	case string, float64, bool, *tnbig.Int:
		return false
	}
	return reflect.ValueOf(v).Kind() != reflect.Func
}

func tnFfiList(v interface{}) ([]interface{}, bool) {
	if list, ok := v.([]interface{}); ok {
		return list, true
	}
	rv := reflect.ValueOf(v)
	if v == nil || rv.Kind() != reflect.Slice {
		return nil, false
	}
	if _, isBytes := v.([]byte); isBytes {
		return nil, false
	}
	out := make([]interface{}, rv.Len())
	for i := range out {
		out[i] = rv.Index(i).Interface()
	}
	return out, true
}

func tnFfiParseType(v interface{}) int {
	if s, ok := v.(string); ok {
		if k, known := tnFfiTypeNames[s]; known {
			return k
		}
	}
	panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Unsupported FFI type: "+TnFormat(v)))
}

// { arguments: [...], return: '...' } (both optional: void ())
func tnFfiParseSig(name string, sig interface{}) *tnFfiSig {
	if !tnFfiIsObject(sig) {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "Function signature must be an object"))
	}
	s := &tnFfiSig{}
	if ret := TnGetValue(sig, "return"); ret != nil {
		s.ret = tnFfiParseType(ret)
	}
	if args := TnGetValue(sig, "arguments"); args != nil {
		list, ok := tnFfiList(args)
		if !ok {
			panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "Arguments list of function "+name+" must be an array"))
		}
		for i, a := range list {
			k := tnFfiParseType(a)
			if k == tnFfiVoid {
				panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Argument "+strconv.Itoa(i)+" of function "+name+" must not be 'void'; use an empty array for no-argument functions"))
			}
			s.args = append(s.args, k)
		}
	}
	return s
}

// The bytes behind a typed array / DataView (their element slice, synced
// with a resized buffer first)
func tnFfiViewAddr(v interface{}) (uintptr, bool) {
	rv := reflect.ValueOf(v)
	if v == nil || rv.Kind() != reflect.Pointer || rv.IsNil() || rv.Elem().Kind() != reflect.Struct {
		return 0, false
	}
	name := rv.Type().Elem().Name()
	if !strings.HasPrefix(name, "TnTypedArray[") && name != "TnBigIntArray" && name != "TnDataView" {
		return 0, false
	}
	if m := rv.MethodByName("Get_byteLength"); m.IsValid() {
		m.Call(nil)
	}
	for _, field := range []string{"data", "view"} {
		if f := rv.Elem().FieldByName(field); f.IsValid() && f.Kind() == reflect.Slice {
			return f.Pointer(), true
		}
	}
	return 0, false
}

func tnFfiBytesAddr(b []byte) uintptr { return uintptr(unsafe.Pointer(unsafe.SliceData(b))) }

// A pointer argument: a bigint address, a string (copied with a NUL), a
// Buffer / ArrayBuffer / typed array (its memory), null / undefined (NULL)
func tnFfiPtrArg(v interface{}, keep *[]interface{}) (uintptr, bool) {
	switch x := v.(type) {
	case nil:
		return 0, true
	case *tnbig.Int:
		if x.Sign() < 0 || x.BitLen() > 64 {
			return 0, false
		}
		return uintptr(x.Uint64()), true
	case string:
		b := append([]byte(x), 0)
		*keep = append(*keep, b)
		return tnFfiBytesAddr(b), true
	case []byte:
		*keep = append(*keep, x)
		return tnFfiBytesAddr(x), true
	}
	if p, ok := tnFfiViewAddr(v); ok {
		*keep = append(*keep, v)
		return p, true
	}
	return 0, false
}

func tnFfiArgError(i int, k int) *TnError {
	if k == tnFfiPtr {
		return tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Argument "+strconv.Itoa(i)+" must be a buffer, an ArrayBuffer, a string, or a bigint")
	}
	return tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Argument "+strconv.Itoa(i)+" must be "+tnFfiKindNames[k])
}

// A JS value as an integer of kind k (numbers must be integers in range;
// 64-bit kinds also take bigints and safe-integer numbers)
func tnFfiInt(v interface{}, k int) (uint64, bool) {
	switch k {
	case tnFfiI64, tnFfiU64:
		switch x := v.(type) {
		case float64:
			if x != math.Trunc(x) || math.Abs(x) > tnFfiMaxSafe || (k == tnFfiU64 && x < 0) {
				return 0, false
			}
			return uint64(int64(x)), true
		case *tnbig.Int:
			if k == tnFfiI64 && x.IsInt64() {
				return uint64(x.Int64()), true
			}
			if k == tnFfiU64 && x.IsUint64() {
				return x.Uint64(), true
			}
		}
		return 0, false
	}
	f, ok := v.(float64)
	if !ok || f != math.Trunc(f) || f < tnFfiIntRanges[k][0] || f > tnFfiIntRanges[k][1] {
		return 0, false
	}
	return uint64(int64(f)), true
}

func tnFfiArg(k int, v interface{}, i int, keep *[]interface{}) reflect.Value {
	t := tnFfiGoTypes[k]
	switch k {
	case tnFfiF32, tnFfiF64:
		f, ok := v.(float64)
		if !ok {
			panic(tnFfiArgError(i, k))
		}
		return reflect.ValueOf(f).Convert(t)
	case tnFfiPtr:
		p, ok := tnFfiPtrArg(v, keep)
		if !ok {
			panic(tnFfiArgError(i, k))
		}
		return reflect.ValueOf(p)
	}
	u, ok := tnFfiInt(v, k)
	if !ok {
		panic(tnFfiArgError(i, k))
	}
	switch k {
	case tnFfiI8, tnFfiI16, tnFfiI32, tnFfiI64:
		return reflect.ValueOf(int64(u)).Convert(t)
	}
	return reflect.ValueOf(u).Convert(t)
}

// A native result of kind k as a JS value
func tnFfiResult(k int, v reflect.Value) interface{} {
	switch k {
	case tnFfiVoid:
		return nil
	case tnFfiI8, tnFfiI16, tnFfiI32:
		return float64(v.Int())
	case tnFfiU8, tnFfiU16, tnFfiU32:
		return float64(v.Uint())
	case tnFfiI64:
		return tnbig.NewInt(v.Int())
	case tnFfiU64, tnFfiPtr:
		return new(tnbig.Int).SetUint64(v.Uint())
	}
	return v.Float()
}

func tnFfiPointerOf(v interface{}) uintptr {
	b, ok := v.(*tnbig.Int)
	if !ok {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "The pointer must be a bigint"))
	}
	if b.Sign() < 0 || b.BitLen() > 64 {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "The pointer must be a non-negative bigint"))
	}
	return uintptr(b.Uint64())
}

// --- Libraries

type tnFfiFunc struct {
	sig  *tnFfiSig
	call reflect.Value
	fn   func(args ...interface{}) interface{}
}

type tnFfiCallback struct {
	sig    *tnFfiSig
	fn     interface{}
	active bool
}

type TnFfiLibrary struct {
	path      string
	handle    uintptr
	closed    bool
	symbols   map[string]interface{}
	funcs     map[string]*tnFfiFunc
	callbacks map[uintptr]*tnFfiCallback
}

func tnFfiFail(what string, err error) *TnError {
	return TnNodeError("Error", "ERR_FFI_CALL_FAILED", what+" failed: "+tnFfiErrText(err))
}

func TnNewFfiLibrary(path interface{}) *TnFfiLibrary {
	p, isString := path.(string)
	if !isString && (path != nil || !tnFfiCanOpenSelf) {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "Library path must be a string"))
	}
	h, err := tnFfiOpen(p, path == nil)
	if err != nil {
		panic(tnFfiFail("dlopen", err))
	}
	return &TnFfiLibrary{path: p, handle: h, symbols: map[string]interface{}{}, funcs: map[string]*tnFfiFunc{}, callbacks: map[uintptr]*tnFfiCallback{}}
}

func (l *TnFfiLibrary) Get_path() string { return l.path }

func (l *TnFfiLibrary) Get_symbols() interface{} { return l.getSymbols() }

func (l *TnFfiLibrary) checkOpen() {
	if l.closed {
		panic(TnNodeError("Error", "ERR_FFI_LIBRARY_CLOSED", "Library is closed"))
	}
}

func (l *TnFfiLibrary) close() {
	if l.closed {
		return
	}
	l.closed = true
	for _, cb := range l.callbacks {
		cb.active = false
	}
	tnFfiClose(l.handle)
}

func (l *TnFfiLibrary) __dispose() { l.close() }

func (l *TnFfiLibrary) symbol(name interface{}) uintptr {
	s, ok := name.(string)
	if !ok {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "Symbol name must be a string"))
	}
	l.checkOpen()
	if v, ok := l.symbols[s]; ok {
		return uintptr(v.(*tnbig.Int).Uint64())
	}
	addr, err := tnFfiSym(l.handle, s)
	if err != nil {
		panic(tnFfiFail("dlsym", err))
	}
	l.symbols[s] = new(tnbig.Int).SetUint64(uint64(addr))
	return addr
}

func (l *TnFfiLibrary) getSymbol(name interface{}) *tnbig.Int {
	return new(tnbig.Int).SetUint64(uint64(l.symbol(name)))
}

func (l *TnFfiLibrary) getSymbols() interface{} {
	out := map[string]interface{}{}
	for k, v := range l.symbols {
		out[k] = v
	}
	return out
}

// Wrappers' .pointer, read through TnGet (a Go func carries no properties)
var tnFfiPointers sync.Map

func tnFfiFuncProp(obj interface{}, key string) (interface{}, bool) {
	if key != "pointer" || obj == nil || reflect.ValueOf(obj).Kind() != reflect.Func {
		return nil, false
	}
	if v, ok := tnFfiPointers.Load((*[2]unsafe.Pointer)(unsafe.Pointer(&obj))[1]); ok {
		return v, true
	}
	return nil, false
}

func init() { tnFuncPropHooks = append(tnFuncPropHooks, tnFfiFuncProp) }

func (l *TnFfiLibrary) getFunction(name interface{}, sigValue ...interface{}) interface{} {
	var sv interface{}
	if len(sigValue) > 0 {
		sv = sigValue[0]
	}
	s, _ := name.(string)
	sig := tnFfiParseSig(s, sv)
	addr := l.symbol(name)
	if f, ok := l.funcs[s]; ok {
		if f.sig.key() != sig.key() {
			panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Function "+s+" was already requested with a different signature"))
		}
		return f.fn
	}
	in := make([]reflect.Type, len(sig.args))
	for i, a := range sig.args {
		in[i] = tnFfiGoTypes[a]
	}
	var out []reflect.Type
	if sig.ret != tnFfiVoid {
		out = []reflect.Type{tnFfiGoTypes[sig.ret]}
	}
	call := reflect.New(reflect.FuncOf(in, out, false))
	tnFfiRegister(call.Interface(), addr)
	f := &tnFfiFunc{sig: sig, call: call.Elem()}
	f.fn = func(args ...interface{}) interface{} {
		l.checkOpen()
		if len(args) != len(sig.args) {
			panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Invalid argument count: expected "+strconv.Itoa(len(sig.args))+", got "+strconv.Itoa(len(args))))
		}
		var keep []interface{}
		values := make([]reflect.Value, len(args))
		for i, a := range args {
			values[i] = tnFfiArg(sig.args[i], a, i, &keep)
		}
		results := f.call.Call(values)
		runtime.KeepAlive(keep)
		tnFfiRethrow()
		if sig.ret == tnFfiVoid {
			return nil
		}
		return tnFfiResult(sig.ret, results[0])
	}
	tnFfiPointers.Store((*[2]unsafe.Pointer)(unsafe.Pointer(&[]interface{}{f.fn}[0]))[1], new(tnbig.Int).SetUint64(uint64(addr)))
	l.funcs[s] = f
	return f.fn
}

// getFunctions(definitions) resolves each; getFunctions() lists the wrappers so far
func (l *TnFfiLibrary) getFunctions(defs ...interface{}) interface{} {
	out := map[string]interface{}{}
	if len(defs) == 0 || defs[0] == nil {
		for name, f := range l.funcs {
			out[name] = f.fn
		}
		return out
	}
	for _, name := range TnKeys(defs[0]) {
		out[name] = l.getFunction(name, TnGet(defs[0], name))
	}
	return out
}

// --- Callbacks: a JS function behind a native function pointer. A throw
// can't unwind through C frames: it is held and rethrown once the native
// call that ran the callback returns

var tnFfiThrown interface{}
var tnFfiHasThrown bool

func tnFfiRethrow() {
	if tnFfiHasThrown {
		v := tnFfiThrown
		tnFfiThrown, tnFfiHasThrown = nil, false
		panic(v)
	}
}

// A native callback argument (an integer register, or a float) as a JS value
func tnFfiCallbackArg(k int, v reflect.Value) interface{} {
	switch k {
	case tnFfiF32, tnFfiF64:
		return v.Float()
	}
	u := uint64(v.Uint())
	switch k {
	case tnFfiI8:
		return float64(int8(u))
	case tnFfiU8:
		return float64(uint8(u))
	case tnFfiI16:
		return float64(int16(u))
	case tnFfiU16:
		return float64(uint16(u))
	case tnFfiI32:
		return float64(int32(u))
	case tnFfiU32:
		return float64(uint32(u))
	case tnFfiI64:
		return tnbig.NewInt(int64(u))
	}
	return new(tnbig.Int).SetUint64(u)
}

func tnFfiCallbackResult(k int, v interface{}, t reflect.Type) reflect.Value {
	switch k {
	case tnFfiF32, tnFfiF64:
		f, _ := v.(float64)
		return reflect.ValueOf(f).Convert(t)
	case tnFfiPtr:
		var keep []interface{}
		p, _ := tnFfiPtrArg(v, &keep)
		return reflect.ValueOf(p).Convert(t)
	}
	if f, ok := v.(float64); ok {
		return reflect.ValueOf(uint64(int64(f))).Convert(t)
	}
	if b, ok := v.(*tnbig.Int); ok {
		return reflect.ValueOf(new(tnbig.Int).And(b, new(tnbig.Int).SetUint64(math.MaxUint64)).Uint64()).Convert(t)
	}
	if v == true {
		return reflect.ValueOf(uint64(1)).Convert(t)
	}
	return reflect.Zero(t)
}

// registerCallback(fn) is void (); registerCallback(signature, fn)
func (l *TnFfiLibrary) registerCallback(a interface{}, rest ...interface{}) *tnbig.Int {
	var fn, sigValue interface{}
	if len(rest) > 0 {
		sigValue, fn = a, rest[0]
	} else {
		fn = a
	}
	if fn == nil || reflect.ValueOf(fn).Kind() != reflect.Func || (sigValue != nil && !tnFfiIsObject(sigValue)) {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "First argument must be a function or a signature object"))
	}
	sig := &tnFfiSig{}
	if sigValue != nil {
		sig = tnFfiParseSig("callback", sigValue)
	}
	l.checkOpen()
	word := reflect.TypeOf(uintptr(0))
	in := make([]reflect.Type, len(sig.args))
	for i, k := range sig.args {
		in[i] = tnFfiCallbackType(k, word)
	}
	// (one result word even for void: syscall.NewCallback requires it)
	out := []reflect.Type{word}
	if sig.ret != tnFfiVoid {
		out[0] = tnFfiCallbackType(sig.ret, word)
	}
	cb := &tnFfiCallback{sig: sig, fn: fn, active: true}
	impl := reflect.MakeFunc(reflect.FuncOf(in, out, false), func(values []reflect.Value) (results []reflect.Value) {
		results = []reflect.Value{reflect.Zero(out[0])}
		if !cb.active || tnFfiHasThrown {
			return results
		}
		defer func() {
			if r := recover(); r != nil {
				tnFfiThrown, tnFfiHasThrown = r, true
			}
		}()
		args := make([]interface{}, len(values))
		for i, v := range values {
			args[i] = tnFfiCallbackArg(sig.args[i], v)
		}
		result := TnCallValue(cb.fn, args...)
		if sig.ret != tnFfiVoid {
			results[0] = tnFfiCallbackResult(sig.ret, result, out[0])
		}
		return results
	})
	ptr := tnFfiNewCallback(impl.Interface())
	l.callbacks[ptr] = cb
	return new(tnbig.Int).SetUint64(uint64(ptr))
}

func (l *TnFfiLibrary) callback(pointer interface{}) uintptr {
	p := tnFfiPointerOf(pointer)
	if cb, ok := l.callbacks[p]; !ok || !cb.active {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Callback not found"))
	}
	return p
}

// (the trampoline itself can't be freed: it turns into a no-op that
// returns zero)
func (l *TnFfiLibrary) unregisterCallback(pointer interface{}) {
	p := l.callback(pointer)
	l.callbacks[p].active = false
	delete(l.callbacks, p)
}

// Callbacks stay strongly referenced (no weak JS functions in Go)
func (l *TnFfiLibrary) refCallback(pointer interface{})   { l.callback(pointer) }
func (l *TnFfiLibrary) unrefCallback(pointer interface{}) { l.callback(pointer) }

// --- dlopen / dlclose / dlsym

type TnFfiOpened struct {
	lib       *TnFfiLibrary
	functions interface{}
}

func (o *TnFfiOpened) Get_lib() *TnFfiLibrary                          { return o.lib }
func (o *TnFfiOpened) Get_functions() interface{}                   { return o.functions }
func (o *TnFfiOpened) __dispose()                                       { o.lib.close() }

func TnFfiDlopen(path interface{}, defs ...interface{}) *TnFfiOpened {
	lib := TnNewFfiLibrary(path)
	o := &TnFfiOpened{lib: lib, functions: map[string]interface{}{}}
	if len(defs) > 0 && defs[0] != nil {
		o.functions = lib.getFunctions(defs[0])
	}
	return o
}

func TnFfiDlclose(lib *TnFfiLibrary)                         { lib.close() }
func TnFfiDlsym(lib *TnFfiLibrary, name interface{}) *tnbig.Int { return lib.getSymbol(name) }

// --- Raw memory

func tnFfiAt(pointer interface{}, offset []interface{}) unsafe.Pointer {
	p := tnFfiPointerOf(pointer)
	off := 0.0
	if len(offset) > 0 && offset[0] != nil {
		o, ok := offset[0].(float64)
		if !ok || o != math.Trunc(o) || o < 0 {
			panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "The offset must be a non-negative integer"))
		}
		off = o
	}
	if p == 0 {
		panic(TnNodeError("Error", "ERR_FFI_INVALID_POINTER", "Cannot dereference a null pointer"))
	}
	return unsafe.Add(unsafe.Pointer(p), int(off))
}

func tnFfiSetValue(v interface{}, k int) uint64 {
	if k == tnFfiF32 || k == tnFfiF64 {
		f, ok := v.(float64)
		if !ok {
			panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Value must be "+tnFfiKindNames[k]))
		}
		if k == tnFfiF32 {
			return uint64(math.Float32bits(float32(f)))
		}
		return math.Float64bits(f)
	}
	u, ok := tnFfiInt(v, k)
	if !ok {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Value must be "+tnFfiKindNames[k]))
	}
	return u
}

func TnFfiGetInt8(p interface{}, off ...interface{}) float64  { return float64(*(*int8)(tnFfiAt(p, off))) }
func TnFfiGetUint8(p interface{}, off ...interface{}) float64 { return float64(*(*uint8)(tnFfiAt(p, off))) }
func TnFfiGetInt16(p interface{}, off ...interface{}) float64 { return float64(*(*int16)(tnFfiAt(p, off))) }
func TnFfiGetUint16(p interface{}, off ...interface{}) float64 {
	return float64(*(*uint16)(tnFfiAt(p, off)))
}
func TnFfiGetInt32(p interface{}, off ...interface{}) float64 { return float64(*(*int32)(tnFfiAt(p, off))) }
func TnFfiGetUint32(p interface{}, off ...interface{}) float64 {
	return float64(*(*uint32)(tnFfiAt(p, off)))
}
func TnFfiGetInt64(p interface{}, off ...interface{}) *tnbig.Int {
	return tnbig.NewInt(*(*int64)(tnFfiAt(p, off)))
}
func TnFfiGetUint64(p interface{}, off ...interface{}) *tnbig.Int {
	return new(tnbig.Int).SetUint64(*(*uint64)(tnFfiAt(p, off)))
}
func TnFfiGetFloat32(p interface{}, off ...interface{}) float64 {
	return float64(*(*float32)(tnFfiAt(p, off)))
}
func TnFfiGetFloat64(p interface{}, off ...interface{}) float64 { return *(*float64)(tnFfiAt(p, off)) }

func TnFfiSet(k int, p interface{}, off interface{}, v interface{}) {
	at := tnFfiAt(p, []interface{}{off})
	u := tnFfiSetValue(v, k)
	switch k {
	case tnFfiI8, tnFfiU8:
		*(*uint8)(at) = uint8(u)
	case tnFfiI16, tnFfiU16:
		*(*uint16)(at) = uint16(u)
	case tnFfiI32, tnFfiU32, tnFfiF32:
		*(*uint32)(at) = uint32(u)
	default:
		*(*uint64)(at) = u
	}
}

// Reads a NUL-terminated UTF-8 string (null for a NULL pointer)
func TnFfiToString(pointer interface{}) interface{} {
	if _, ok := pointer.(*tnbig.Int); !ok {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "The first argument must be a bigint"))
	}
	p := tnFfiPointerOf(pointer)
	if p == 0 {
		return nil
	}
	n := 0
	for *(*byte)(unsafe.Add(unsafe.Pointer(p), n)) != 0 {
		n++
	}
	return string(unsafe.Slice((*byte)(unsafe.Pointer(p)), n))
}

func tnFfiMemory(pointer interface{}, length interface{}, what string) []byte {
	p := tnFfiPointerOf(pointer)
	n, ok := length.(float64)
	if !ok || n != math.Trunc(n) || n < 0 {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "The length must be a non-negative integer"))
	}
	if p == 0 {
		panic(TnNodeError("Error", "ERR_FFI_INVALID_POINTER", "Cannot create "+what+" from a null pointer"))
	}
	return unsafe.Slice((*byte)(unsafe.Pointer(p)), int(n))
}

// copy (the default) owns its bytes; copy: false is a view on native memory
func TnFfiToBuffer(pointer interface{}, length interface{}, copyBytes ...interface{}) []byte {
	b := tnFfiMemory(pointer, length, "a buffer")
	if len(copyBytes) > 0 && copyBytes[0] == false {
		return b
	}
	return append([]byte{}, b...)
}

func TnFfiToArrayBuffer(pointer interface{}, length interface{}, copyBytes ...interface{}) []byte {
	b := tnFfiMemory(pointer, length, "an ArrayBuffer")
	if len(copyBytes) > 0 && copyBytes[0] == false {
		return b
	}
	return append([]byte{}, b...)
}

func tnFfiExport(data []byte, pointer interface{}, length interface{}) {
	n, ok := length.(float64)
	if !ok || n != math.Trunc(n) || n < 0 {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "The length must be a non-negative integer"))
	}
	tnFfiMemory(pointer, float64(0), "a buffer")
	if n < float64(len(data)) {
		panic(TnNodeError("RangeError", "ERR_OUT_OF_RANGE", "The value of \\"len\\" is out of range. It must be >= "+strconv.Itoa(len(data))+". Received "+TnFormat(n)))
	}
	copy(unsafe.Slice((*byte)(unsafe.Pointer(tnFfiPointerOf(pointer))), len(data)), data)
}

// exportString appends a NUL terminator (two bytes for UTF-16)
func TnFfiExportString(s string, pointer interface{}, length interface{}, encoding ...string) {
	enc := "utf8"
	if len(encoding) > 0 && encoding[0] != "" {
		enc = encoding[0]
	}
	data := TnBufferFrom(s, enc)
	switch strings.ToLower(enc) {
	case "utf16le", "utf-16le", "ucs2", "ucs-2":
		data = append(data, 0, 0)
	default:
		data = append(data, 0)
	}
	tnFfiExport(data, pointer, length)
}

func TnFfiExportBytes(data interface{}, pointer interface{}, length interface{}) {
	b, ok := data.([]byte)
	if !ok {
		if p, isView := tnFfiViewAddr(data); isView {
			n := int(TnNumber(TnGet(data, "byteLength")))
			b = unsafe.Slice((*byte)(unsafe.Pointer(p)), n)
		}
	}
	tnFfiExport(b, pointer, length)
	runtime.KeepAlive(data)
}

// The address of JS-managed bytes (Go's heap doesn't move them)
func TnFfiGetRawPointer(source interface{}) *tnbig.Int {
	var keep []interface{}
	switch source.(type) {
	case nil, string, *tnbig.Int:
	default:
		if p, ok := tnFfiPtrArg(source, &keep); ok {
			return new(tnbig.Int).SetUint64(uint64(p))
		}
	}
	panic(tnFfiTypeErr("ERR_INVALID_ARG_TYPE", "The first argument must be a Buffer, ArrayBuffer, SharedArrayBuffer, or ArrayBufferView"))
}`;
// Windows: kernel32's LoadLibrary / GetProcAddress, syscall.NewCallback
// (integer arguments only, at most ~2000 callbacks per process)
const ffiWindows = `// node:ffi (Windows)
const tnFfiSuffix = "dll"
const tnFfiCanOpenSelf = false

func tnFfiOpen(path string, self bool) (uintptr, error) {
	h, err := syscall.LoadLibrary(path)
	return uintptr(h), err
}

func tnFfiSym(h uintptr, name string) (uintptr, error) {
	return syscall.GetProcAddress(syscall.Handle(h), name)
}

func tnFfiClose(h uintptr) { syscall.FreeLibrary(syscall.Handle(h)) }

// (Node prints FormatMessage's text as is, with its line break)
func tnFfiErrText(err error) string { return err.Error() + "\\r\\n" }

func tnFfiRegister(fptr interface{}, addr uintptr) { purego.RegisterFunc(fptr, addr) }

func tnFfiCallbackType(k int, word reflect.Type) reflect.Type {
	if k == tnFfiF32 || k == tnFfiF64 {
		panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Callbacks with float or double arguments or results are not supported on Windows"))
	}
	return word
}

func tnFfiNewCallback(fn interface{}) uintptr { return syscall.NewCallback(fn) }`;
// Unix: dlopen through purego (RTLD_DEFAULT for null: the process image)
const ffiUnix = (suffix) => `// node:ffi (Unix)
const tnFfiSuffix = "${suffix}"
const tnFfiCanOpenSelf = true

func tnFfiOpen(path string, self bool) (uintptr, error) {
	if self {
		return purego.RTLD_DEFAULT, nil
	}
	return purego.Dlopen(path, purego.RTLD_LAZY|purego.RTLD_LOCAL)
}

func tnFfiSym(h uintptr, name string) (uintptr, error) { return purego.Dlsym(h, name) }

func tnFfiClose(h uintptr) {
	if h != purego.RTLD_DEFAULT {
		purego.Dlclose(h)
	}
}

func tnFfiErrText(err error) string { return err.Error() }

func tnFfiRegister(fptr interface{}, addr uintptr) { purego.RegisterFunc(fptr, addr) }

func tnFfiCallbackType(k int, word reflect.Type) reflect.Type {
	if k == tnFfiF32 || k == tnFfiF64 {
		return tnFfiGoTypes[k]
	}
	return word
}

func tnFfiNewCallback(fn interface{}) (ptr uintptr) {
	defer func() {
		if r := recover(); r != nil {
			panic(tnFfiTypeErr("ERR_INVALID_ARG_VALUE", "Unsupported callback signature: "+TnFormat(r)))
		}
	}()
	return purego.NewCallback(fn)
}`;
// Other targets (BSDs: purego's fakecgo needs cgo there; wasm, plan9, …): no
// dynamic loader
const ffiOther = `// node:ffi (unsupported target)
const tnFfiSuffix = "so"
const tnFfiCanOpenSelf = false

func tnFfiUnsupported() *TnError {
	return TnNodeError("Error", "ERR_FFI_CALL_FAILED", "dlopen failed: dynamic libraries are not supported on "+runtime.GOOS)
}

func tnFfiOpen(path string, self bool) (uintptr, error) { panic(tnFfiUnsupported()) }
func tnFfiSym(h uintptr, name string) (uintptr, error)  { panic(tnFfiUnsupported()) }
func tnFfiClose(h uintptr)                              {}
func tnFfiErrText(err error) string                     { return err.Error() }
func tnFfiRegister(fptr interface{}, addr uintptr)      { panic(tnFfiUnsupported()) }
func tnFfiCallbackType(k int, word reflect.Type) reflect.Type { return word }
func tnFfiNewCallback(fn interface{}) uintptr           { panic(tnFfiUnsupported()) }`;
const FFI_TYPES = {
    VOID: 'void',
    POINTER: 'pointer',
    BUFFER: 'buffer',
    ARRAY_BUFFER: 'arraybuffer',
    FUNCTION: 'function',
    BOOL: 'bool',
    CHAR: 'char',
    STRING: 'string',
    FLOAT: 'float',
    DOUBLE: 'double',
    INT_8: 'int8',
    UINT_8: 'uint8',
    INT_16: 'int16',
    UINT_16: 'uint16',
    INT_32: 'int32',
    UINT_32: 'uint32',
    INT_64: 'int64',
    UINT_64: 'uint64',
    FLOAT_32: 'float32',
    FLOAT_64: 'float64'
};
export function registerFfi(r) {
    defineModule(r, 'ffi');
    defineHelper(r, 'nodeFfiOS@windows', [PUREGO, 'reflect', 'syscall'], [], ffiWindows);
    for (const goos of ['linux', 'android'])
        defineHelper(r, `nodeFfiOS@${goos}`, [PUREGO, 'reflect'], [], ffiUnix('so'));
    for (const goos of ['darwin', 'ios'])
        defineHelper(r, `nodeFfiOS@${goos}`, [PUREGO, 'reflect'], [], ffiUnix('dylib'));
    defineHelper(r, 'nodeFfiOS@other', ['reflect', 'runtime'], [], ffiOther);
    defineHelper(r, 'nodeFfi', ['math', 'math/big', 'reflect', 'runtime', 'strconv', 'strings', 'sync', 'unsafe'], ['dynamic', 'error', 'bigint', 'orderedMap', 'buffer', 'nodeFfiOS@os'], ffiHelper);
    const use = () => r.helper('nodeFfi');
    const fn = (name, goFn) => {
        r.functions[`ffi.${name}`] = (c) => {
            use();
            return `${goFn}(${c.args.join(', ')})`;
        };
    };
    defineClass(r, 'ffi.DynamicLibrary', '*TnFfiLibrary', 'class', 'close=; __dispose=; getFunction=interface{}; getFunctions=interface{}; getSymbol=*tnbig.Int; getSymbols=interface{}; registerCallback=*tnbig.Int; unregisterCallback=; refCallback=; unrefCallback=', '', 'path=string; symbols=interface{}', '');
    r.constructors['ffi.DynamicLibrary'] = (c) => {
        use();
        return `TnNewFfiLibrary(${c.args.slice(0, 1).join(', ')})`;
    };
    defineClass(r, 'ffi.DynamicLibraryResult', '*TnFfiOpened', 'class', '__dispose=', '', 'lib=*TnFfiLibrary; functions=interface{}', '');
    fn('dlopen', 'TnFfiDlopen');
    fn('dlclose', 'TnFfiDlclose');
    fn('dlsym', 'TnFfiDlsym');
    fn('toString', 'TnFfiToString');
    fn('toBuffer', 'TnFfiToBuffer');
    fn('toArrayBuffer', 'TnFfiToArrayBuffer');
    fn('exportString', 'TnFfiExportString');
    fn('exportBuffer', 'TnFfiExportBytes');
    fn('exportArrayBuffer', 'TnFfiExportBytes');
    fn('exportArrayBufferView', 'TnFfiExportBytes');
    fn('getRawPointer', 'TnFfiGetRawPointer');
    const kinds = {
        Int8: 'tnFfiI8',
        Uint8: 'tnFfiU8',
        Int16: 'tnFfiI16',
        Uint16: 'tnFfiU16',
        Int32: 'tnFfiI32',
        Uint32: 'tnFfiU32',
        Int64: 'tnFfiI64',
        Uint64: 'tnFfiU64',
        Float32: 'tnFfiF32',
        Float64: 'tnFfiF64'
    };
    for (const kind of Object.keys(kinds)) {
        fn(`get${kind}`, `TnFfiGet${kind}`);
        r.functions[`ffi.set${kind}`] = (c) => {
            use();
            return `TnFfiSet(${[kinds[kind]].concat(c.args).join(', ')})`;
        };
        r.results[`ffi.set${kind}`] = '';
        r.results[`ffi.get${kind}`] = kind.endsWith('64') && kind !== 'Float64' ? '*tnbig.Int' : 'float64';
    }
    setResults(r, 'ffi', 'dlopen=*TnFfiOpened; dlsym=*tnbig.Int; toString=interface{}; toBuffer=[]byte; toArrayBuffer=[]byte; getRawPointer=*tnbig.Int');
    r.values['ffi.suffix'] = (_c) => {
        use();
        return 'tnFfiSuffix';
    };
    r.valueTypes['ffi.suffix'] = 'string';
    r.objects['ffi.types'] = true;
    for (const name of Object.keys(FFI_TYPES)) {
        r.values[`ffi.types.${name}`] = (_c) => JSON.stringify(FFI_TYPES[name]);
        r.valueTypes[`ffi.types.${name}`] = 'string';
    }
}
