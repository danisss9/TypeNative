// Typed arrays other than Uint8Array (which is Go []byte, shared with Buffer),
// DataView and ArrayBuffer.
//
// Int8Array … Float64Array are one generic Go type, TnTypedArray[T], over a
// slice of the element type (TnInt32Array = TnTypedArray[int32], …). A view
// built on an ArrayBuffer (a Go []byte) shares its memory in the platform's
// byte order, as in JS. Elements read as numbers and writes convert like JS
// (ToInt32 wrapping, Uint8ClampedArray rounding / clamping). Methods taking a
// callback (map, filter, reduce …) are inlined by the transpiler over
// tnFloats(); the rest are Go methods here.
import { defineClass, defineHelper, setResults } from './registry.js';
// Typed array constructors and their Go element types (BYTES_PER_ELEMENT is the size)
export const TYPED_ARRAY_KINDS = {
    Int8Array: 'int8',
    Uint8ClampedArray: 'uint8',
    Int16Array: 'int16',
    Uint16Array: 'uint16',
    Int32Array: 'int32',
    Uint32Array: 'uint32',
    Float32Array: 'float32',
    Float64Array: 'float64'
};
const ELEMENT_SIZES = {
    int8: 1,
    uint8: 1,
    int16: 2,
    uint16: 2,
    int32: 4,
    uint32: 4,
    float32: 4,
    float64: 8
};
// Whether a Go type is one of the typed arrays above
export function isTypedArrayGoType(goType) {
    if (!goType || !goType.startsWith('*Tn'))
        return false;
    return Object.keys(TYPED_ARRAY_KINDS).includes(goType.slice(3));
}
const typedArrayHelper = `// Typed arrays (Int8Array … Float64Array): a slice of the element type
type tnTypedElem interface {
	int8 | uint8 | int16 | uint16 | int32 | uint32 | float32 | float64
}

type TnTypedArray[T tnTypedElem] struct {
	data    []T
	kind    string
	clamped bool
}

type TnInt8Array = TnTypedArray[int8]
type TnUint8ClampedArray = TnTypedArray[uint8]
type TnInt16Array = TnTypedArray[int16]
type TnUint16Array = TnTypedArray[uint16]
type TnInt32Array = TnTypedArray[int32]
type TnUint32Array = TnTypedArray[uint32]
type TnFloat32Array = TnTypedArray[float32]
type TnFloat64Array = TnTypedArray[float64]

func tnTypedSize[T tnTypedElem]() int {
	var zero T
	return int(unsafe.Sizeof(zero))
}

// A number converted to the element type the way JS stores it: floats round,
// integers wrap modulo 2^n (NaN and ±Infinity store 0), clamped bytes round
// half to even into 0..255
func tnTypedConv[T tnTypedElem](v float64, clamped bool) T {
	var zero T
	switch any(zero).(type) {
	case float32, float64:
		return T(v)
	}
	if clamped {
		if !(v > 0) {
			return 0
		}
		if v >= 255 {
			top := uint8(255)
			return T(top)
		}
		return T(math.RoundToEven(v))
	}
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	m := math.Mod(math.Trunc(v), 4294967296)
	if m < 0 {
		m += 4294967296
	}
	return T(uint32(m))
}

func tnTypedRangeError(message string) *TnError {
	return TnNodeError("RangeError", "", message)
}

// The numbers of an array-like source (arrays, Uint8Arrays, typed arrays)
func tnTypedFloats(src interface{}) []float64 {
	switch s := src.(type) {
	case []float64:
		return s
	case *[]float64:
		return *s
	case []byte:
		out := make([]float64, len(s))
		for i, b := range s {
			out[i] = float64(b)
		}
		return out
	case []interface{}:
		out := make([]float64, len(s))
		for i, v := range s {
			out[i] = TnNumber(v)
		}
		return out
	case interface{ tnFloats() []float64 }:
		return s.tnFloats()
	}
	panic(TnNodeError("TypeError", "", "Cannot convert argument to a typed array"))
}

func tnTypedOf[T tnTypedElem](kind string, clamped bool, values []float64) *TnTypedArray[T] {
	data := make([]T, len(values))
	for i, v := range values {
		data[i] = tnTypedConv[T](v, clamped)
	}
	return &TnTypedArray[T]{data: data, kind: kind, clamped: clamped}
}

// new XArray(), new XArray(length), new XArray(array-like or typed array): a copy
func TnNewTypedArray[T tnTypedElem](kind string, clamped bool, src ...interface{}) *TnTypedArray[T] {
	if len(src) == 0 || src[0] == nil {
		return &TnTypedArray[T]{data: []T{}, kind: kind, clamped: clamped}
	}
	if n, ok := src[0].(float64); ok {
		if !(n >= 0) || n != math.Trunc(n) || n > 4294967295 {
			panic(tnTypedRangeError("Invalid typed array length: " + TnNumStr(n)))
		}
		return &TnTypedArray[T]{data: make([]T, int(n)), kind: kind, clamped: clamped}
	}
	return tnTypedOf[T](kind, clamped, tnTypedFloats(src[0]))
}

// new XArray(buffer[, byteOffset[, length]]): a view sharing the buffer's memory
func TnTypedArrayView[T tnTypedElem](kind string, clamped bool, buf []byte, args ...float64) *TnTypedArray[T] {
	size := tnTypedSize[T]()
	offset := 0
	if len(args) > 0 {
		offset = int(args[0])
	}
	if offset%size != 0 {
		panic(tnTypedRangeError("start offset of " + kind + " should be a multiple of " + strconv.Itoa(size)))
	}
	if offset > len(buf) {
		panic(tnTypedRangeError("Start offset " + strconv.Itoa(offset) + " is outside the bounds of the buffer"))
	}
	length := 0
	if len(args) > 1 {
		length = int(args[1])
		if length < 0 || offset+length*size > len(buf) {
			panic(tnTypedRangeError("Invalid typed array length: " + strconv.Itoa(length)))
		}
	} else {
		if (len(buf)-offset)%size != 0 {
			panic(tnTypedRangeError("byte length of " + kind + " should be a multiple of " + strconv.Itoa(size)))
		}
		length = (len(buf) - offset) / size
	}
	if length == 0 {
		return &TnTypedArray[T]{data: []T{}, kind: kind, clamped: clamped}
	}
	data := unsafe.Slice((*T)(unsafe.Pointer(&buf[offset])), length)
	return &TnTypedArray[T]{data: data, kind: kind, clamped: clamped}
}

// XArray.from(source[, mapFn]) / XArray.of(...items)
func TnTypedArrayFrom[T tnTypedElem](kind string, clamped bool, src interface{}, mapFn ...interface{}) *TnTypedArray[T] {
	values := append([]float64{}, tnTypedFloats(src)...)
	if len(mapFn) > 0 && mapFn[0] != nil {
		for i, v := range values {
			values[i] = TnNumber(TnInvoke(mapFn[0], v, float64(i)))
		}
	}
	return tnTypedOf[T](kind, clamped, values)
}

func TnTypedArrayOf[T tnTypedElem](kind string, clamped bool, items ...float64) *TnTypedArray[T] {
	return tnTypedOf[T](kind, clamped, items)
}

// Element reads: out-of-range and non-integer indices read 0 (undefined in JS)
func (a *TnTypedArray[T]) Get(i float64) float64 {
	if !(i >= 0) || i >= float64(len(a.data)) || i != math.Trunc(i) {
		return 0
	}
	return float64(a.data[int(i)])
}

// Element writes: out-of-range indices are ignored, as in JS
func (a *TnTypedArray[T]) Set(i float64, v float64) float64 {
	if i >= 0 && i < float64(len(a.data)) && i == math.Trunc(i) {
		a.data[int(i)] = tnTypedConv[T](v, a.clamped)
	}
	return v
}

func (a *TnTypedArray[T]) tnFloats() []float64 {
	out := make([]float64, len(a.data))
	for i, v := range a.data {
		out[i] = float64(v)
	}
	return out
}

// A new typed array of the same kind (map / filter results)
func (a *TnTypedArray[T]) tnLike(values []float64) *TnTypedArray[T] {
	return tnTypedOf[T](a.kind, a.clamped, values)
}

func (a *TnTypedArray[T]) Get_length() float64            { return float64(len(a.data)) }
func (a *TnTypedArray[T]) Get_byteLength() float64        { return float64(len(a.data) * tnTypedSize[T]()) }
func (a *TnTypedArray[T]) Get_byteOffset() float64        { return 0 }
func (a *TnTypedArray[T]) Get_BYTES_PER_ELEMENT() float64 { return float64(tnTypedSize[T]()) }

// The view's bytes (its byteOffset is 0: .buffer starts where the view does)
func (a *TnTypedArray[T]) Get_buffer() []byte {
	if len(a.data) == 0 {
		return []byte{}
	}
	return unsafe.Slice((*byte)(unsafe.Pointer(&a.data[0])), len(a.data)*tnTypedSize[T]())
}

// Relative start / end arguments (negative counts from the end), clamped
func tnTypedBounds(n int, args []float64) (int, int) {
	rel := func(v float64) int {
		if math.IsNaN(v) {
			return 0
		}
		if v < 0 {
			return max(n+int(math.Max(v, -1e15)), 0)
		}
		return min(int(math.Min(v, 1e15)), n)
	}
	start, end := 0, n
	if len(args) > 0 {
		start = rel(args[0])
	}
	if len(args) > 1 {
		end = rel(args[1])
	}
	if end < start {
		end = start
	}
	return start, end
}

func (a *TnTypedArray[T]) fill(v float64, args ...float64) *TnTypedArray[T] {
	start, end := tnTypedBounds(len(a.data), args)
	value := tnTypedConv[T](v, a.clamped)
	for i := start; i < end; i++ {
		a.data[i] = value
	}
	return a
}

// set(source[, offset]): copies an array-like in (overlapping views work)
func (a *TnTypedArray[T]) set(src interface{}, offset ...float64) {
	at := 0
	if len(offset) > 0 {
		at = int(offset[0])
	}
	values := tnTypedFloats(src)
	if at < 0 || at+len(values) > len(a.data) {
		panic(tnTypedRangeError("offset is out of bounds"))
	}
	for i, v := range values {
		a.data[at+i] = tnTypedConv[T](v, a.clamped)
	}
}

// subarray shares memory; slice copies
func (a *TnTypedArray[T]) subarray(args ...float64) *TnTypedArray[T] {
	start, end := tnTypedBounds(len(a.data), args)
	return &TnTypedArray[T]{data: a.data[start:end:end], kind: a.kind, clamped: a.clamped}
}

func (a *TnTypedArray[T]) slice(args ...float64) *TnTypedArray[T] {
	start, end := tnTypedBounds(len(a.data), args)
	return &TnTypedArray[T]{data: append([]T{}, a.data[start:end]...), kind: a.kind, clamped: a.clamped}
}

func (a *TnTypedArray[T]) at(i float64) float64 {
	if i < 0 {
		i += float64(len(a.data))
	}
	return a.Get(math.Trunc(i))
}

func (a *TnTypedArray[T]) indexOf(v float64, from ...float64) float64 {
	start, _ := tnTypedBounds(len(a.data), from)
	for i := start; i < len(a.data); i++ {
		if float64(a.data[i]) == v {
			return float64(i)
		}
	}
	return -1
}

func (a *TnTypedArray[T]) lastIndexOf(v float64, from ...float64) float64 {
	end := len(a.data) - 1
	if len(from) > 0 {
		f := math.Trunc(from[0])
		if f < 0 {
			f += float64(len(a.data))
		}
		end = min(int(f), end)
	}
	for i := end; i >= 0; i-- {
		if float64(a.data[i]) == v {
			return float64(i)
		}
	}
	return -1
}

// includes uses SameValueZero: NaN finds NaN
func (a *TnTypedArray[T]) includes(v float64, from ...float64) bool {
	start, _ := tnTypedBounds(len(a.data), from)
	for i := start; i < len(a.data); i++ {
		x := float64(a.data[i])
		if x == v || (x != x && v != v) {
			return true
		}
	}
	return false
}

func (a *TnTypedArray[T]) join(sep ...string) string {
	separator := ","
	if len(sep) > 0 {
		separator = sep[0]
	}
	parts := make([]string, len(a.data))
	for i, v := range a.data {
		parts[i] = TnNumStr(float64(v))
	}
	return strings.Join(parts, separator)
}

func (a *TnTypedArray[T]) toString() string       { return a.join(",") }
func (a *TnTypedArray[T]) toLocaleString() string { return a.join(",") }
func (a *TnTypedArray[T]) String() string         { return a.join(",") }

func (a *TnTypedArray[T]) reverse() *TnTypedArray[T] {
	for i, j := 0, len(a.data)-1; i < j; i, j = i+1, j-1 {
		a.data[i], a.data[j] = a.data[j], a.data[i]
	}
	return a
}

func (a *TnTypedArray[T]) toReversed() *TnTypedArray[T] {
	return a.slice().reverse()
}

// sort([compareFn]): numeric order by default (NaN last)
func (a *TnTypedArray[T]) sort(compare ...interface{}) *TnTypedArray[T] {
	if len(compare) > 0 && compare[0] != nil {
		cmp := compare[0]
		sort.SliceStable(a.data, func(i, j int) bool {
			x, y := float64(a.data[i]), float64(a.data[j])
			if f, ok := cmp.(func(float64, float64) float64); ok {
				return f(x, y) < 0
			}
			return TnNumber(TnInvoke(cmp, x, y)) < 0
		})
		return a
	}
	sort.SliceStable(a.data, func(i, j int) bool {
		x, y := float64(a.data[i]), float64(a.data[j])
		if x != x {
			return false
		}
		if y != y {
			return true
		}
		if x == 0 && y == 0 {
			return math.Signbit(x) && !math.Signbit(y)
		}
		return x < y
	})
	return a
}

func (a *TnTypedArray[T]) toSorted(compare ...interface{}) *TnTypedArray[T] {
	return a.slice().sort(compare...)
}

func (a *TnTypedArray[T]) with(i float64, v float64) *TnTypedArray[T] {
	index := math.Trunc(i)
	if index < 0 {
		index += float64(len(a.data))
	}
	if !(index >= 0) || index >= float64(len(a.data)) {
		panic(tnTypedRangeError("Invalid typed array index"))
	}
	out := a.slice()
	out.data[int(index)] = tnTypedConv[T](v, a.clamped)
	return out
}

func (a *TnTypedArray[T]) copyWithin(target float64, args ...float64) *TnTypedArray[T] {
	n := len(a.data)
	to, _ := tnTypedBounds(n, []float64{target})
	start, end := tnTypedBounds(n, args)
	copy(a.data[to:], a.data[start:end])
	return a
}

func (a *TnTypedArray[T]) keys() []float64 {
	out := make([]float64, len(a.data))
	for i := range a.data {
		out[i] = float64(i)
	}
	return out
}

func (a *TnTypedArray[T]) values() []float64 { return a.tnFloats() }

// util.inspect / console.log: Int32Array(3) [ 1, 2, 3 ]
func (a *TnTypedArray[T]) TnTypedInspect() (string, []float64) {
	return a.kind + "(" + strconv.Itoa(len(a.data)) + ")", a.tnFloats()
}

// ArrayBuffer.isView: typed arrays, DataViews and Uint8Arrays
func TnIsView(v interface{}) bool {
	switch v.(type) {
	case []byte, *TnDataView:
		return true
	case interface{ tnFloats() []float64 }:
		return true
	}
	return false
}

// DataView: typed reads and writes at byte offsets of an ArrayBuffer,
// big-endian unless littleEndian is true
type TnDataView struct {
	buf    []byte
	offset int
	length int
}

func TnNewDataView(buf []byte, args ...float64) *TnDataView {
	offset := 0
	if len(args) > 0 {
		offset = int(args[0])
	}
	if offset < 0 || offset > len(buf) {
		panic(tnTypedRangeError("Start offset " + strconv.Itoa(offset) + " is outside the bounds of the buffer"))
	}
	length := len(buf) - offset
	if len(args) > 1 {
		length = int(args[1])
		if length < 0 || offset+length > len(buf) {
			panic(tnTypedRangeError("Invalid DataView length " + strconv.Itoa(length)))
		}
	}
	return &TnDataView{buf: buf, offset: offset, length: length}
}

func (d *TnDataView) Get_buffer() []byte       { return d.buf }
func (d *TnDataView) Get_byteOffset() float64 { return float64(d.offset) }
func (d *TnDataView) Get_byteLength() float64 { return float64(d.length) }

func (d *TnDataView) at(offset float64, size int) []byte {
	if !(offset >= 0) || offset != math.Trunc(offset) || int(offset)+size > d.length {
		panic(tnTypedRangeError("Offset is outside the bounds of the DataView"))
	}
	start := d.offset + int(offset)
	return d.buf[start : start+size]
}

func tnDataViewOrder(little []bool) binary.ByteOrder {
	if len(little) > 0 && little[0] {
		return binary.LittleEndian
	}
	return binary.BigEndian
}

func (d *TnDataView) getInt8(o float64) float64  { return float64(int8(d.at(o, 1)[0])) }
func (d *TnDataView) getUint8(o float64) float64 { return float64(d.at(o, 1)[0]) }
func (d *TnDataView) getInt16(o float64, little ...bool) float64 {
	return float64(int16(tnDataViewOrder(little).Uint16(d.at(o, 2))))
}
func (d *TnDataView) getUint16(o float64, little ...bool) float64 {
	return float64(tnDataViewOrder(little).Uint16(d.at(o, 2)))
}
func (d *TnDataView) getInt32(o float64, little ...bool) float64 {
	return float64(int32(tnDataViewOrder(little).Uint32(d.at(o, 4))))
}
func (d *TnDataView) getUint32(o float64, little ...bool) float64 {
	return float64(tnDataViewOrder(little).Uint32(d.at(o, 4)))
}
func (d *TnDataView) getFloat32(o float64, little ...bool) float64 {
	return float64(math.Float32frombits(tnDataViewOrder(little).Uint32(d.at(o, 4))))
}
func (d *TnDataView) getFloat64(o float64, little ...bool) float64 {
	return math.Float64frombits(tnDataViewOrder(little).Uint64(d.at(o, 8)))
}
func (d *TnDataView) getBigInt64(o float64, little ...bool) *tnbig.Int {
	return tnbig.NewInt(int64(tnDataViewOrder(little).Uint64(d.at(o, 8))))
}
func (d *TnDataView) getBigUint64(o float64, little ...bool) *tnbig.Int {
	return new(tnbig.Int).SetUint64(tnDataViewOrder(little).Uint64(d.at(o, 8)))
}

func (d *TnDataView) setInt8(o float64, v float64)  { d.at(o, 1)[0] = byte(tnTypedConv[uint8](v, false)) }
func (d *TnDataView) setUint8(o float64, v float64) { d.at(o, 1)[0] = tnTypedConv[uint8](v, false) }
func (d *TnDataView) setInt16(o float64, v float64, little ...bool) {
	tnDataViewOrder(little).PutUint16(d.at(o, 2), tnTypedConv[uint16](v, false))
}
func (d *TnDataView) setUint16(o float64, v float64, little ...bool) {
	tnDataViewOrder(little).PutUint16(d.at(o, 2), tnTypedConv[uint16](v, false))
}
func (d *TnDataView) setInt32(o float64, v float64, little ...bool) {
	tnDataViewOrder(little).PutUint32(d.at(o, 4), tnTypedConv[uint32](v, false))
}
func (d *TnDataView) setUint32(o float64, v float64, little ...bool) {
	tnDataViewOrder(little).PutUint32(d.at(o, 4), tnTypedConv[uint32](v, false))
}
func (d *TnDataView) setFloat32(o float64, v float64, little ...bool) {
	tnDataViewOrder(little).PutUint32(d.at(o, 4), math.Float32bits(float32(v)))
}
func (d *TnDataView) setFloat64(o float64, v float64, little ...bool) {
	tnDataViewOrder(little).PutUint64(d.at(o, 8), math.Float64bits(v))
}

// BigInt writes wrap modulo 2^64 (BigInt.asUintN(64, v))
func tnDataViewUint64(v *tnbig.Int) uint64 {
	m := new(tnbig.Int).And(v, new(tnbig.Int).SetUint64(math.MaxUint64))
	return m.Uint64()
}
func (d *TnDataView) setBigInt64(o float64, v *tnbig.Int, little ...bool) {
	tnDataViewOrder(little).PutUint64(d.at(o, 8), tnDataViewUint64(v))
}
func (d *TnDataView) setBigUint64(o float64, v *tnbig.Int, little ...bool) {
	tnDataViewOrder(little).PutUint64(d.at(o, 8), tnDataViewUint64(v))
}

// ArrayBuffer#slice copies (a Uint8Array's subarray / Buffer's slice share)
func TnArrayBufferSlice(b []byte, args ...float64) []byte {
	start, end := tnTypedBounds(len(b), args)
	return append([]byte{}, b[start:end]...)
}`;
export function registerTypedArrays(r) {
    defineHelper(r, 'typedArrays', ['encoding/binary', 'math', 'math/big', 'sort', 'strconv', 'strings', 'unsafe'], ['error', 'dynamic', 'nodeInvoke'], typedArrayHelper);
    const use = () => r.helper('typedArrays');
    for (const name of Object.keys(TYPED_ARRAY_KINDS)) {
        const elem = TYPED_ARRAY_KINDS[name];
        const goType = `*Tn${name}`;
        const key = `globals.${name}`;
        const clamped = name === 'Uint8ClampedArray' ? 'true' : 'false';
        const generic = `[${elem}](${JSON.stringify(name)}, ${clamped}`;
        defineClass(r, key, goType, 'class', `fill=${goType}; set=; subarray=${goType}; slice=${goType}; at=float64; indexOf=float64; lastIndexOf=float64; includes=bool; join=string; toString=string; toLocaleString=string; reverse=${goType}; toReversed=${goType}; sort=${goType}; toSorted=${goType}; with=${goType}; copyWithin=${goType}; keys=[]float64; values=[]float64; tnFloats=[]float64`, '', 'length=float64; byteLength=float64; byteOffset=float64; BYTES_PER_ELEMENT=float64; buffer=[]byte', '');
        r.globals[name] = key;
        r.iterators[goType] = 'tnFloats';
        r.paramTypers[`${key}#sort`] = (_n) => ['float64', 'float64'];
        r.paramTypers[`${key}#toSorted`] = r.paramTypers[`${key}#sort`];
        // new Int32Array(length | array-like) copies; new Int32Array(buffer, …) views
        r.constructors[key] = (call) => {
            use();
            if (call.args.length > 0 && r.isArrayBuffer(call.nodes[0])) {
                return `TnTypedArrayView${generic}, ${call.args.join(', ')})`;
            }
            return `TnNewTypedArray${generic}${call.args.length > 0 ? ', ' + call.args[0] : ''})`;
        };
        r.functions[`${key}.from`] = (call) => {
            use();
            return `TnTypedArrayFrom${generic}, ${call.args.join(', ')})`;
        };
        r.paramTypers[`${key}.from`] = (_n) => ['float64', 'float64'];
        r.functions[`${key}.of`] = (call) => {
            use();
            return `TnTypedArrayOf${generic}${call.args.length > 0 ? ', ' + call.args.join(', ') : ''})`;
        };
        setResults(r, key, `from=${goType}; of=${goType}`);
        r.values[`${key}.BYTES_PER_ELEMENT`] = (_c) => `float64(${ELEMENT_SIZES[elem]})`;
        r.valueTypes[`${key}.BYTES_PER_ELEMENT`] = 'float64';
    }
    defineClass(r, 'globals.DataView', '*TnDataView', 'class', 'getInt8=float64; getUint8=float64; getInt16=float64; getUint16=float64; getInt32=float64; getUint32=float64; getFloat32=float64; getFloat64=float64; getBigInt64=*tnbig.Int; getBigUint64=*tnbig.Int; setInt8=; setUint8=; setInt16=; setUint16=; setInt32=; setUint32=; setFloat32=; setFloat64=; setBigInt64=; setBigUint64=', '', 'buffer=[]byte; byteOffset=float64; byteLength=float64', '');
    r.globals['DataView'] = 'globals.DataView';
    r.constructors['globals.DataView'] = (call) => {
        use();
        return `TnNewDataView(${call.args.join(', ')})`;
    };
    // ArrayBuffer is Go []byte too: new ArrayBuffer(n), ArrayBuffer.isView
    defineClass(r, 'globals.ArrayBuffer', '[]byte', 'Buffer', '', '', '', '');
    r.classByGoType['[]byte'] = 'buffer.Buffer';
    r.globals['ArrayBuffer'] = 'globals.ArrayBuffer';
    r.constructors['globals.ArrayBuffer'] = (call) => call.args.length > 0 ? `make([]byte, int(${call.args[0]}))` : '[]byte{}';
    r.functions['globals.ArrayBuffer.isView'] = (call) => {
        use();
        if (r.isArrayBuffer(call.nodes[0]))
            return 'false';
        return `TnIsView(${call.args[0]})`;
    };
    r.results['globals.ArrayBuffer.isView'] = 'bool';
}
