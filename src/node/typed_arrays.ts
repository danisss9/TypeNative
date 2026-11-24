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

import { NodeRegistry, NodeCall, defineClass, defineHelper, setResults } from './registry.js';

// Typed array constructors and their Go element types (BYTES_PER_ELEMENT is the size)
export const TYPED_ARRAY_KINDS: Record<string, string> = {
  Int8Array: 'int8',
  Uint8ClampedArray: 'uint8',
  Int16Array: 'int16',
  Uint16Array: 'uint16',
  Int32Array: 'int32',
  Uint32Array: 'uint32',
  Float32Array: 'float32',
  Float64Array: 'float64',
  // (binary16 bits; reads and writes convert, see num / conv)
  Float16Array: 'uint16'
};

// BigInt64Array / BigUint64Array: one Go type of uint64 elements read as bigints
export const BIGINT_ARRAY_KINDS = ['BigInt64Array', 'BigUint64Array'];

export function isBigIntArrayGoType(goType: string | undefined): boolean {
  return goType === '*TnBigIntArray';
}

const ELEMENT_SIZES: Record<string, number> = {
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
export function isTypedArrayGoType(goType: string | undefined): boolean {
  if (!goType || !goType.startsWith('*Tn')) return false;
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
	// Float16Array: the uint16 elements are binary16 bits
	half    bool
	isFloat bool
	// A view on an ArrayBuffer: the buffer, the view's byte offset and byte
	// length (-1: it tracks a resizable buffer's length). data is recomputed
	// when a buffer was resized or detached since (gen); oob while the view is
	// out of bounds or its buffer detached.
	src    []byte
	offset int
	fixed  int
	gen    uint64
	oob    bool
}

func (a *TnTypedArray[T]) sync() {
	if a.src != nil && a.gen != tnABGen.Load() {
		a.resync()
	}
}

func (a *TnTypedArray[T]) resync() {
	a.gen = tnABGen.Load()
	b, ok := tnABView(a.src, a.offset, a.fixed, tnTypedSize[T]())
	a.oob = !ok
	a.data = tnTypedElems[T](b)
}

// A method of a detached / out-of-bounds view throws
func (a *TnTypedArray[T]) check(method string) {
	a.sync()
	if a.oob {
		panic(tnABOutOfBounds("%TypedArray%.prototype." + method))
	}
}

// Bytes as elements (sharing their memory)
func tnTypedElems[T tnTypedElem | uint64](b []byte) []T {
	var zero T
	size := int(unsafe.Sizeof(zero))
	if len(b) < size {
		return []T{}
	}
	return unsafe.Slice((*T)(unsafe.Pointer(&b[0])), len(b)/size)
}

type TnInt8Array = TnTypedArray[int8]
type TnUint8ClampedArray = TnTypedArray[uint8]
type TnInt16Array = TnTypedArray[int16]
type TnUint16Array = TnTypedArray[uint16]
type TnInt32Array = TnTypedArray[int32]
type TnUint32Array = TnTypedArray[uint32]
type TnFloat32Array = TnTypedArray[float32]
type TnFloat64Array = TnTypedArray[float64]
type TnFloat16Array = TnTypedArray[uint16]

// An element as a number / a number as an element (Float16Array converts
// through binary16)
func (a *TnTypedArray[T]) num(v T) float64 {
	if a.half {
		return TnF16ToF64(uint16(v))
	}
	return float64(v)
}

func (a *TnTypedArray[T]) conv(v float64) T {
	if a.isFloat {
		return T(v)
	}
	if !a.half && !a.clamped {
		return T(tnTypedToUint32(v))
	}
	if a.half {
		return T(TnF64ToF16(v))
	}
	return tnTypedConv[T](v, a.clamped)
}

func tnIsFloatKind(kind string) bool { return kind == "Float32Array" || kind == "Float64Array" }

func tnTypedSize[T tnTypedElem]() int {
	var zero T
	return int(unsafe.Sizeof(zero))
}

func tnTypedToUint32(v float64) uint32 {
	if v > -9.2e18 && v < 9.2e18 {
		return uint32(int64(v))
	}
	return tnTypedToUint32Wide(v)
}

func tnTypedToUint32Wide(v float64) uint32 {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	m := math.Mod(math.Trunc(v), 4294967296)
	if m < 0 {
		m += 4294967296
	}
	return uint32(m)
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
	return T(tnTypedToUint32(v))
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
		if kind == "Float16Array" {
			data[i] = T(TnF64ToF16(v))
		} else {
			data[i] = tnTypedConv[T](v, clamped)
		}
	}
	return &TnTypedArray[T]{data: data, kind: kind, clamped: clamped, half: kind == "Float16Array", isFloat: tnIsFloatKind(kind)}
}

// new XArray(), new XArray(length), new XArray(array-like or typed array): a copy
func TnNewTypedArray[T tnTypedElem](kind string, clamped bool, src ...interface{}) *TnTypedArray[T] {
	if len(src) == 0 || src[0] == nil {
		return &TnTypedArray[T]{data: []T{}, kind: kind, clamped: clamped, half: kind == "Float16Array", isFloat: tnIsFloatKind(kind)}
	}
	if n, ok := src[0].(float64); ok {
		if !(n >= 0) || n != math.Trunc(n) || n > 4294967295 {
			panic(tnTypedRangeError("Invalid typed array length: " + TnNumStr(n)))
		}
		return &TnTypedArray[T]{data: make([]T, int(n)), kind: kind, clamped: clamped, half: kind == "Float16Array", isFloat: tnIsFloatKind(kind)}
	}
	return tnTypedOf[T](kind, clamped, tnTypedFloats(src[0]))
}

// new XArray(buffer[, byteOffset[, length]]): a view sharing the buffer's
// memory (without a length, on a resizable buffer, it tracks its length)
func TnTypedArrayView[T tnTypedElem](kind string, clamped bool, buf []byte, args ...float64) *TnTypedArray[T] {
	offset, fixed := tnABViewBounds(kind, buf, tnTypedSize[T](), args)
	a := &TnTypedArray[T]{kind: kind, clamped: clamped, half: kind == "Float16Array", isFloat: tnIsFloatKind(kind), src: buf, offset: offset, fixed: fixed}
	a.resync()
	return a
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
	if a.src != nil && a.gen != tnABGen.Load() {
		a.resync()
	}
	idx := int(i)
	if uint(idx) >= uint(len(a.data)) || float64(idx) != i {
		return 0
	}
	if a.half {
		return TnF16ToF64(uint16(a.data[idx]))
	}
	return float64(a.data[idx])
}

func (a *TnTypedArray[T]) GetInt(idx int) float64 {
	if a.src != nil && a.gen != tnABGen.Load() {
		a.resync()
	}
	if uint(idx) >= uint(len(a.data)) {
		return 0
	}
	if a.half {
		return TnF16ToF64(uint16(a.data[idx]))
	}
	return float64(a.data[idx])
}

// Element writes: out-of-range indices are ignored, as in JS
func (a *TnTypedArray[T]) Set(i float64, v float64) float64 {
	if a.src != nil && a.gen != tnABGen.Load() {
		a.resync()
	}
	idx := int(i)
	if uint(idx) < uint(len(a.data)) && float64(idx) == i {
		a.data[idx] = a.conv(v)
	}
	return v
}

func (a *TnTypedArray[T]) SetInt(idx int, v float64) float64 {
	if a.src != nil && a.gen != tnABGen.Load() {
		a.resync()
	}
	if uint(idx) < uint(len(a.data)) {
		a.data[idx] = a.conv(v)
	}
	return v
}

func (a *TnTypedArray[T]) tnFloats() []float64 {
	a.check("values")
	out := make([]float64, len(a.data))
	for i, v := range a.data {
		out[i] = a.num(v)
	}
	return out
}

// A new typed array of the same kind (map / filter results)
func (a *TnTypedArray[T]) tnLike(values []float64) *TnTypedArray[T] {
	return tnTypedOf[T](a.kind, a.clamped, values)
}

func (a *TnTypedArray[T]) Get_length() float64 {
	a.sync()
	return float64(len(a.data))
}

func (a *TnTypedArray[T]) Get_byteLength() float64 {
	a.sync()
	return float64(len(a.data) * tnTypedSize[T]())
}

func (a *TnTypedArray[T]) Get_byteOffset() float64 {
	a.sync()
	if a.oob {
		return 0
	}
	return float64(a.offset)
}

func (a *TnTypedArray[T]) Get_BYTES_PER_ELEMENT() float64 { return float64(tnTypedSize[T]()) }

// A view's ArrayBuffer; an array that owns its elements gives its own bytes
// (byteOffset 0)
func (a *TnTypedArray[T]) Get_buffer() []byte {
	if a.src != nil {
		return a.src
	}
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
	a.check("fill")
	start, end := tnTypedBounds(len(a.data), args)
	value := a.conv(v)
	for i := start; i < end; i++ {
		a.data[i] = value
	}
	return a
}

// set(source[, offset]): copies an array-like in (overlapping views work)
func (a *TnTypedArray[T]) set(src interface{}, offset ...float64) {
	a.check("set")
	at := 0
	if len(offset) > 0 {
		at = int(offset[0])
	}
	if s, ok := src.(*TnTypedArray[T]); ok && !a.half && !s.half && !a.clamped {
		s.check("set")
		if at < 0 || at+len(s.data) > len(a.data) {
			panic(tnTypedRangeError("offset is out of bounds"))
		}
		copy(a.data[at:], s.data)
		return
	}
	values := tnTypedFloats(src)
	if at < 0 || at+len(values) > len(a.data) {
		panic(tnTypedRangeError("offset is out of bounds"))
	}
	for i, v := range values {
		a.data[at+i] = a.conv(v)
	}
}

// subarray shares memory; slice copies
func (a *TnTypedArray[T]) subarray(args ...float64) *TnTypedArray[T] {
	a.sync()
	start, end := tnTypedBounds(len(a.data), args)
	if a.src != nil {
		// a view on the same buffer (tracking its length when this one does
		// and no end is given)
		size := tnTypedSize[T]()
		fixed := (end - start) * size
		if a.fixed < 0 && len(args) < 2 {
			fixed = -1
		}
		tnABConstructCheck(a.src)
		out := &TnTypedArray[T]{kind: a.kind, clamped: a.clamped, half: a.half, isFloat: a.isFloat, src: a.src, offset: a.offset + start*size, fixed: fixed}
		out.resync()
		return out
	}
	return &TnTypedArray[T]{data: a.data[start:end:end], kind: a.kind, clamped: a.clamped, half: a.half, isFloat: a.isFloat}
}

func (a *TnTypedArray[T]) slice(args ...float64) *TnTypedArray[T] {
	a.check("slice")
	start, end := tnTypedBounds(len(a.data), args)
	return &TnTypedArray[T]{data: append([]T{}, a.data[start:end]...), kind: a.kind, clamped: a.clamped, half: a.half, isFloat: a.isFloat}
}

func (a *TnTypedArray[T]) at(i float64) float64 {
	a.check("at")
	if i < 0 {
		i += float64(len(a.data))
	}
	return a.Get(math.Trunc(i))
}

func (a *TnTypedArray[T]) indexOf(v float64, from ...float64) float64 {
	a.check("indexOf")
	start, _ := tnTypedBounds(len(a.data), from)
	for i := start; i < len(a.data); i++ {
		if a.num(a.data[i]) == v {
			return float64(i)
		}
	}
	return -1
}

func (a *TnTypedArray[T]) lastIndexOf(v float64, from ...float64) float64 {
	a.check("lastIndexOf")
	end := len(a.data) - 1
	if len(from) > 0 {
		f := math.Trunc(from[0])
		if f < 0 {
			f += float64(len(a.data))
		}
		end = min(int(f), end)
	}
	for i := end; i >= 0; i-- {
		if a.num(a.data[i]) == v {
			return float64(i)
		}
	}
	return -1
}

// includes uses SameValueZero: NaN finds NaN
func (a *TnTypedArray[T]) includes(v float64, from ...float64) bool {
	a.check("includes")
	start, _ := tnTypedBounds(len(a.data), from)
	for i := start; i < len(a.data); i++ {
		x := a.num(a.data[i])
		if x == v || (x != x && v != v) {
			return true
		}
	}
	return false
}

func (a *TnTypedArray[T]) join(sep ...string) string {
	a.check("join")
	separator := ","
	if len(sep) > 0 {
		separator = sep[0]
	}
	parts := make([]string, len(a.data))
	for i, v := range a.data {
		parts[i] = TnNumStr(a.num(v))
	}
	return strings.Join(parts, separator)
}

func (a *TnTypedArray[T]) toString() string       { return a.join(",") }
func (a *TnTypedArray[T]) toLocaleString() string { return a.join(",") }
func (a *TnTypedArray[T]) String() string         { return a.join(",") }

func (a *TnTypedArray[T]) reverse() *TnTypedArray[T] {
	a.check("reverse")
	for i, j := 0, len(a.data)-1; i < j; i, j = i+1, j-1 {
		a.data[i], a.data[j] = a.data[j], a.data[i]
	}
	return a
}

func (a *TnTypedArray[T]) toReversed() *TnTypedArray[T] {
	a.check("toReversed")
	return a.slice().reverse()
}

// sort([compareFn]): numeric order by default (NaN last)
func (a *TnTypedArray[T]) sort(compare ...interface{}) *TnTypedArray[T] {
	a.check("sort")
	if len(compare) > 0 && compare[0] != nil {
		cmp := compare[0]
		sort.SliceStable(a.data, func(i, j int) bool {
			x, y := a.num(a.data[i]), a.num(a.data[j])
			if f, ok := cmp.(func(float64, float64) float64); ok {
				return f(x, y) < 0
			}
			return TnNumber(TnInvoke(cmp, x, y)) < 0
		})
		return a
	}
	sort.SliceStable(a.data, func(i, j int) bool {
		x, y := a.num(a.data[i]), a.num(a.data[j])
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
	a.check("toSorted")
	return a.slice().sort(compare...)
}

func (a *TnTypedArray[T]) with(i float64, v float64) *TnTypedArray[T] {
	a.check("with")
	index := math.Trunc(i)
	if index < 0 {
		index += float64(len(a.data))
	}
	if !(index >= 0) || index >= float64(len(a.data)) {
		panic(tnTypedRangeError("Invalid typed array index"))
	}
	out := a.slice()
	out.data[int(index)] = a.conv(v)
	return out
}

func (a *TnTypedArray[T]) copyWithin(target float64, args ...float64) *TnTypedArray[T] {
	a.check("copyWithin")
	n := len(a.data)
	to, _ := tnTypedBounds(n, []float64{target})
	start, end := tnTypedBounds(n, args)
	copy(a.data[to:], a.data[start:end])
	return a
}

func (a *TnTypedArray[T]) keys() []float64 {
	a.check("keys")
	out := make([]float64, len(a.data))
	for i := range a.data {
		out[i] = float64(i)
	}
	return out
}

func (a *TnTypedArray[T]) values() []float64 { return a.tnFloats() }

// util.inspect / console.log: Int32Array(3) [ 1, 2, 3 ]
func (a *TnTypedArray[T]) TnTypedInspect() (string, []float64) {
	a.sync()
	values := make([]float64, len(a.data))
	for i, v := range a.data {
		values[i] = a.num(v)
	}
	return a.kind + "(" + strconv.Itoa(len(a.data)) + ")", values
}

// ArrayBuffer.isView: typed arrays, DataViews and Uint8Arrays
func TnIsView(v interface{}) bool {
	switch v.(type) {
	case []byte, *TnDataView:
		return true
	case interface{ tnFloats() []float64 }, *TnBigIntArray:
		return true
	}
	return false
}

// DataView: typed reads and writes at byte offsets of an ArrayBuffer,
// big-endian unless littleEndian is true
type TnDataView struct {
	buf    []byte
	offset int
	// the byte length given (-1: it tracks a resizable buffer's length)
	fixed int
	// the view's bytes now (recomputed when a buffer was resized or detached
	// since gen); oob while out of bounds or detached
	view []byte
	gen  uint64
	oob  bool
}

func TnNewDataView(buf []byte, args ...float64) *TnDataView {
	cur, st := tnABCurrent(buf)
	if st != nil && st.detached {
		panic(TnNodeError("TypeError", "", "Cannot perform DataView constructor on a detached ArrayBuffer"))
	}
	offset := 0
	if len(args) > 0 {
		offset = int(args[0])
	}
	if offset < 0 || offset > len(cur) {
		panic(tnTypedRangeError("Start offset " + strconv.Itoa(offset) + " is outside the bounds of the buffer"))
	}
	fixed := len(cur) - offset
	if len(args) > 1 {
		fixed = int(args[1])
		if fixed < 0 || offset+fixed > len(cur) {
			panic(tnTypedRangeError("Invalid DataView length " + strconv.Itoa(fixed)))
		}
	} else if st != nil && st.resizable {
		fixed = -1
	}
	d := &TnDataView{buf: buf, offset: offset, fixed: fixed}
	d.resync()
	return d
}

func (d *TnDataView) sync() {
	if d.gen != tnABGen.Load() {
		d.resync()
	}
}

func (d *TnDataView) resync() {
	d.gen = tnABGen.Load()
	view, ok := tnABView(d.buf, d.offset, d.fixed, 1)
	d.view, d.oob = view, !ok
}

func (d *TnDataView) check(method string) {
	d.sync()
	if d.oob {
		panic(tnABOutOfBounds(method))
	}
}

func (d *TnDataView) Get_buffer() []byte { return d.buf }
func (d *TnDataView) Get_byteOffset() float64 {
	d.check("get DataView.prototype.byteOffset")
	return float64(d.offset)
}
func (d *TnDataView) Get_byteLength() float64 {
	d.check("get DataView.prototype.byteLength")
	return float64(len(d.view))
}

func (d *TnDataView) at(method string, offset float64, size int) []byte {
	if d.gen == tnABGen.Load() && !d.oob {
		start := int(offset)
		if start >= 0 && start+size <= len(d.view) && float64(start) == offset {
			return d.view[start : start+size]
		}
	}
	return d.atSlow(method, offset, size)
}

func (d *TnDataView) atSlow(method string, offset float64, size int) []byte {
	if d.gen != tnABGen.Load() {
		d.resync()
	}
	if d.oob {
		panic(tnABOutOfBounds("DataView.prototype." + method))
	}
	start := int(offset)
	if start < 0 || start+size > len(d.view) || float64(start) != offset {
		panic(tnTypedRangeError("Offset is outside the bounds of the DataView"))
	}
	return d.view[start : start+size]
}

func (d *TnDataView) getInt8(o float64) float64  { return float64(int8(d.at("getInt8", o, 1)[0])) }
func (d *TnDataView) getUint8(o float64) float64 { return float64(d.at("getUint8", o, 1)[0]) }
func (d *TnDataView) getInt16(o float64, little ...bool) float64 {
	b := d.at("getInt16", o, 2)
	if len(little) > 0 && little[0] {
		return float64(int16(binary.LittleEndian.Uint16(b)))
	}
	return float64(int16(binary.BigEndian.Uint16(b)))
}
func (d *TnDataView) getUint16(o float64, little ...bool) float64 {
	b := d.at("getUint16", o, 2)
	if len(little) > 0 && little[0] {
		return float64(binary.LittleEndian.Uint16(b))
	}
	return float64(binary.BigEndian.Uint16(b))
}
func (d *TnDataView) getInt32(o float64, little ...bool) float64 {
	b := d.at("getInt32", o, 4)
	if len(little) > 0 && little[0] {
		return float64(int32(binary.LittleEndian.Uint32(b)))
	}
	return float64(int32(binary.BigEndian.Uint32(b)))
}
func (d *TnDataView) getUint32(o float64, little ...bool) float64 {
	b := d.at("getUint32", o, 4)
	if len(little) > 0 && little[0] {
		return float64(binary.LittleEndian.Uint32(b))
	}
	return float64(binary.BigEndian.Uint32(b))
}
func (d *TnDataView) getFloat32(o float64, little ...bool) float64 {
	b := d.at("getFloat32", o, 4)
	if len(little) > 0 && little[0] {
		return float64(math.Float32frombits(binary.LittleEndian.Uint32(b)))
	}
	return float64(math.Float32frombits(binary.BigEndian.Uint32(b)))
}
func (d *TnDataView) getFloat16(o float64, little ...bool) float64 {
	b := d.at("getFloat16", o, 2)
	if len(little) > 0 && little[0] {
		return TnF16ToF64(binary.LittleEndian.Uint16(b))
	}
	return TnF16ToF64(binary.BigEndian.Uint16(b))
}
func (d *TnDataView) setFloat16(o float64, v float64, little ...bool) {
	b := d.at("setFloat16", o, 2)
	u := TnF64ToF16(v)
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint16(b, u)
		return
	}
	binary.BigEndian.PutUint16(b, u)
}
func (d *TnDataView) getFloat64(o float64, little ...bool) float64 {
	b := d.at("getFloat64", o, 8)
	if len(little) > 0 && little[0] {
		return math.Float64frombits(binary.LittleEndian.Uint64(b))
	}
	return math.Float64frombits(binary.BigEndian.Uint64(b))
}
func (d *TnDataView) getBigInt64(o float64, little ...bool) *tnbig.Int {
	b := d.at("getBigInt64", o, 8)
	if len(little) > 0 && little[0] {
		return tnbig.NewInt(int64(binary.LittleEndian.Uint64(b)))
	}
	return tnbig.NewInt(int64(binary.BigEndian.Uint64(b)))
}
func (d *TnDataView) getBigUint64(o float64, little ...bool) *tnbig.Int {
	b := d.at("getBigUint64", o, 8)
	if len(little) > 0 && little[0] {
		return new(tnbig.Int).SetUint64(binary.LittleEndian.Uint64(b))
	}
	return new(tnbig.Int).SetUint64(binary.BigEndian.Uint64(b))
}

func (d *TnDataView) setInt8(o float64, v float64)  { d.at("setInt8", o, 1)[0] = byte(tnTypedToUint32(v)) }
func (d *TnDataView) setUint8(o float64, v float64) { d.at("setUint8", o, 1)[0] = byte(tnTypedToUint32(v)) }
func (d *TnDataView) setInt16(o float64, v float64, little ...bool) {
	b := d.at("setInt16", o, 2)
	u := uint16(tnTypedToUint32(v))
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint16(b, u)
		return
	}
	binary.BigEndian.PutUint16(b, u)
}
func (d *TnDataView) setUint16(o float64, v float64, little ...bool) {
	b := d.at("setUint16", o, 2)
	u := uint16(tnTypedToUint32(v))
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint16(b, u)
		return
	}
	binary.BigEndian.PutUint16(b, u)
}
func (d *TnDataView) setInt32(o float64, v float64, little ...bool) {
	b := d.at("setInt32", o, 4)
	u := tnTypedToUint32(v)
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint32(b, u)
		return
	}
	binary.BigEndian.PutUint32(b, u)
}
func (d *TnDataView) setUint32(o float64, v float64, little ...bool) {
	b := d.at("setUint32", o, 4)
	u := tnTypedToUint32(v)
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint32(b, u)
		return
	}
	binary.BigEndian.PutUint32(b, u)
}
func (d *TnDataView) setFloat32(o float64, v float64, little ...bool) {
	b := d.at("setFloat32", o, 4)
	u := math.Float32bits(float32(v))
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint32(b, u)
		return
	}
	binary.BigEndian.PutUint32(b, u)
}
func (d *TnDataView) setFloat64(o float64, v float64, little ...bool) {
	b := d.at("setFloat64", o, 8)
	u := math.Float64bits(v)
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint64(b, u)
		return
	}
	binary.BigEndian.PutUint64(b, u)
}

// BigInt writes wrap modulo 2^64 (BigInt.asUintN(64, v))
func tnDataViewUint64(v *tnbig.Int) uint64 {
	m := new(tnbig.Int).And(v, new(tnbig.Int).SetUint64(math.MaxUint64))
	return m.Uint64()
}
func (d *TnDataView) setBigInt64(o float64, v *tnbig.Int, little ...bool) {
	b := d.at("setBigInt64", o, 8)
	u := tnDataViewUint64(v)
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint64(b, u)
		return
	}
	binary.BigEndian.PutUint64(b, u)
}
func (d *TnDataView) setBigUint64(o float64, v *tnbig.Int, little ...bool) {
	b := d.at("setBigUint64", o, 8)
	u := tnDataViewUint64(v)
	if len(little) > 0 && little[0] {
		binary.LittleEndian.PutUint64(b, u)
		return
	}
	binary.BigEndian.PutUint64(b, u)
}

// BigInt64Array / BigUint64Array: 64-bit integers, read and written as
// bigints (writes wrap modulo 2^64, like DataView's setBigInt64)
type TnBigIntArray struct {
	data     []uint64
	kind     string
	unsigned bool
	// a view on an ArrayBuffer (see TnTypedArray)
	src    []byte
	offset int
	fixed  int
	gen    uint64
	oob    bool
}

func (a *TnBigIntArray) sync() {
	if a.src != nil && a.gen != tnABGen.Load() {
		a.resync()
	}
}

func (a *TnBigIntArray) resync() {
	a.gen = tnABGen.Load()
	b, ok := tnABView(a.src, a.offset, a.fixed, 8)
	a.oob = !ok
	a.data = tnTypedElems[uint64](b)
}

func (a *TnBigIntArray) check(method string) {
	a.sync()
	if a.oob {
		panic(tnABOutOfBounds("%TypedArray%.prototype." + method))
	}
}

func (a *TnBigIntArray) big(v uint64) *tnbig.Int {
	if a.unsigned {
		return new(tnbig.Int).SetUint64(v)
	}
	return tnbig.NewInt(int64(v))
}

func tnBigIntBits(v interface{}) uint64 {
	switch x := v.(type) {
	case *tnbig.Int:
		return tnDataViewUint64(x)
	case float64:
		panic(TnNodeError("TypeError", "", "Cannot convert "+TnNumStr(x)+" to a BigInt"))
	}
	panic(TnNodeError("TypeError", "", "Cannot convert value to a BigInt"))
}

// new BigInt64Array(length | bigint[] | BigInt64Array)
func TnNewBigIntArray(kind string, src ...interface{}) *TnBigIntArray {
	a := &TnBigIntArray{data: []uint64{}, kind: kind, unsigned: kind == "BigUint64Array"}
	if len(src) == 0 || src[0] == nil {
		return a
	}
	switch s := src[0].(type) {
	case float64:
		if !(s >= 0) || s != math.Trunc(s) || s > 4294967295 {
			panic(tnTypedRangeError("Invalid typed array length: " + TnNumStr(s)))
		}
		a.data = make([]uint64, int(s))
	case *TnBigIntArray:
		s.check("values")
		a.data = append([]uint64{}, s.data...)
	case []*tnbig.Int:
		a.data = make([]uint64, len(s))
		for i, v := range s {
			a.data[i] = tnDataViewUint64(v)
		}
	case []interface{}:
		a.data = make([]uint64, len(s))
		for i, v := range s {
			a.data[i] = tnBigIntBits(v)
		}
	default:
		panic(TnNodeError("TypeError", "", "Cannot convert argument to a "+kind))
	}
	return a
}

// new BigInt64Array(buffer[, byteOffset[, length]]): a view sharing its memory
func TnBigIntArrayView(kind string, buf []byte, args ...float64) *TnBigIntArray {
	offset, fixed := tnABViewBounds(kind, buf, 8, args)
	a := &TnBigIntArray{kind: kind, unsigned: kind == "BigUint64Array", src: buf, offset: offset, fixed: fixed}
	a.resync()
	return a
}

// BigInt64Array.from(source) / .of(...items)
func TnBigIntArrayFrom(kind string, src interface{}) *TnBigIntArray {
	return TnNewBigIntArray(kind, src)
}

func TnBigIntArrayOf(kind string, items ...*tnbig.Int) *TnBigIntArray {
	return TnNewBigIntArray(kind, items)
}

// a[i]: undefined (nil) out of range
func (a *TnBigIntArray) Get(i float64) *tnbig.Int {
	a.sync()
	if !(i >= 0) || i >= float64(len(a.data)) || i != math.Trunc(i) {
		return nil
	}
	return a.big(a.data[int(i)])
}

func (a *TnBigIntArray) Set(i float64, v *tnbig.Int) *tnbig.Int {
	a.sync()
	if i >= 0 && i < float64(len(a.data)) && i == math.Trunc(i) {
		a.data[int(i)] = tnDataViewUint64(v)
	}
	return v
}

func (a *TnBigIntArray) Get_length() float64 {
	a.sync()
	return float64(len(a.data))
}

func (a *TnBigIntArray) Get_byteLength() float64 {
	a.sync()
	return float64(len(a.data) * 8)
}

func (a *TnBigIntArray) Get_byteOffset() float64 {
	a.sync()
	if a.oob {
		return 0
	}
	return float64(a.offset)
}

func (a *TnBigIntArray) Get_BYTES_PER_ELEMENT() float64 { return 8 }

func (a *TnBigIntArray) Get_buffer() []byte {
	if a.src != nil {
		return a.src
	}
	if len(a.data) == 0 {
		return []byte{}
	}
	return unsafe.Slice((*byte)(unsafe.Pointer(&a.data[0])), len(a.data)*8)
}

func (a *TnBigIntArray) values() []*tnbig.Int {
	a.check("values")
	out := make([]*tnbig.Int, len(a.data))
	for i, v := range a.data {
		out[i] = a.big(v)
	}
	return out
}

func (a *TnBigIntArray) keys() []float64 {
	a.check("keys")
	out := make([]float64, len(a.data))
	for i := range a.data {
		out[i] = float64(i)
	}
	return out
}

func (a *TnBigIntArray) fill(v *tnbig.Int, args ...float64) *TnBigIntArray {
	a.check("fill")
	start, end := tnTypedBounds(len(a.data), args)
	bits := tnDataViewUint64(v)
	for i := start; i < end; i++ {
		a.data[i] = bits
	}
	return a
}

func (a *TnBigIntArray) set(src interface{}, offset ...float64) {
	a.check("set")
	at := 0
	if len(offset) > 0 {
		at = int(offset[0])
	}
	values := TnNewBigIntArray(a.kind, src).data
	if at < 0 || at+len(values) > len(a.data) {
		panic(tnTypedRangeError("offset is out of bounds"))
	}
	copy(a.data[at:], values)
}

func (a *TnBigIntArray) subarray(args ...float64) *TnBigIntArray {
	a.sync()
	start, end := tnTypedBounds(len(a.data), args)
	if a.src != nil {
		fixed := (end - start) * 8
		if a.fixed < 0 && len(args) < 2 {
			fixed = -1
		}
		tnABConstructCheck(a.src)
		out := &TnBigIntArray{kind: a.kind, unsigned: a.unsigned, src: a.src, offset: a.offset + start*8, fixed: fixed}
		out.resync()
		return out
	}
	return &TnBigIntArray{data: a.data[start:end:end], kind: a.kind, unsigned: a.unsigned}
}

func (a *TnBigIntArray) slice(args ...float64) *TnBigIntArray {
	a.check("slice")
	start, end := tnTypedBounds(len(a.data), args)
	return &TnBigIntArray{data: append([]uint64{}, a.data[start:end]...), kind: a.kind, unsigned: a.unsigned}
}

func (a *TnBigIntArray) at(i float64) *tnbig.Int {
	a.check("at")
	if i < 0 {
		i += float64(len(a.data))
	}
	return a.Get(math.Trunc(i))
}

func (a *TnBigIntArray) indexOf(v *tnbig.Int, from ...float64) float64 {
	a.check("indexOf")
	start, _ := tnTypedBounds(len(a.data), from)
	for i := start; i < len(a.data); i++ {
		if a.big(a.data[i]).Cmp(v) == 0 {
			return float64(i)
		}
	}
	return -1
}

func (a *TnBigIntArray) includes(v *tnbig.Int, from ...float64) bool {
	return a.indexOf(v, from...) >= 0
}

func (a *TnBigIntArray) join(sep ...string) string {
	a.check("join")
	separator := ","
	if len(sep) > 0 {
		separator = sep[0]
	}
	parts := make([]string, len(a.data))
	for i, v := range a.data {
		parts[i] = a.big(v).String()
	}
	return strings.Join(parts, separator)
}

func (a *TnBigIntArray) toString() string { return a.join(",") }
func (a *TnBigIntArray) String() string   { return a.join(",") }

func (a *TnBigIntArray) reverse() *TnBigIntArray {
	a.check("reverse")
	for i, j := 0, len(a.data)-1; i < j; i, j = i+1, j-1 {
		a.data[i], a.data[j] = a.data[j], a.data[i]
	}
	return a
}

// --- ArrayBuffer state ---
//
// An ArrayBuffer is a Go []byte value, so a resizable buffer's length and a
// detached buffer's state live beside it, keyed by the address of its bytes
// (the slice every holder of the buffer shares). Plain buffers that are
// never resized or transferred have no entry. A resizable buffer starts with
// a small capacity; growing past it moves the bytes to a larger allocation
// (grown), which all ArrayBuffer operations and views then read.
type tnABState struct {
	length    int
	grown     []byte
	max       int
	resizable bool
	detached  bool
}

type tnABEntry struct {
	state *tnABState
	self  weak.Pointer[byte]
}

var (
	tnABStates = map[uintptr]tnABEntry{}
	tnABMu     sync.Mutex
	tnABCount  atomic.Int64
	// bumped on every resize and detach: views recompute their elements
	tnABGen atomic.Uint64
)

func tnABLookup(b []byte) *tnABState {
	if tnABCount.Load() == 0 || cap(b) == 0 {
		return nil
	}
	p := unsafe.SliceData(b)
	tnABMu.Lock()
	e, ok := tnABStates[uintptr(unsafe.Pointer(p))]
	tnABMu.Unlock()
	if !ok || e.self.Value() != p {
		return nil
	}
	return e.state
}

// Records st for buffer b (false: b has no address of its own to key it by)
func tnABRegister(b []byte, st *tnABState) (ok bool) {
	if cap(b) == 0 {
		return false
	}
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()
	p := unsafe.SliceData(b)
	key := uintptr(unsafe.Pointer(p))
	self := weak.Make(p)
	tnABMu.Lock()
	_, had := tnABStates[key]
	tnABStates[key] = tnABEntry{state: st, self: self}
	tnABMu.Unlock()
	if !had {
		tnABCount.Add(1)
	}
	runtime.AddCleanup(p, func(k uintptr) {
		tnABMu.Lock()
		if e, has := tnABStates[k]; has && e.self.Value() == nil {
			delete(tnABStates, k)
			tnABCount.Add(-1)
		}
		tnABMu.Unlock()
	}, key)
	return true
}

// The bytes of buffer b now (nil and its state when detached)
func tnABCurrent(b []byte) ([]byte, *tnABState) {
	st := tnABLookup(b)
	if st == nil {
		return b, nil
	}
	if st.detached {
		return nil, st
	}
	if st.grown != nil {
		return st.grown[:st.length], st
	}
	return b[:min(st.length, cap(b))], st
}

// The bytes of a view on buffer b at offset: fixed bytes, or (fixed -1) up
// to the buffer's end in whole elements; false when the buffer is detached or
// the view out of bounds
func tnABView(b []byte, offset int, fixed int, size int) ([]byte, bool) {
	cur, st := tnABCurrent(b)
	if st != nil && st.detached {
		return nil, false
	}
	if offset > len(cur) {
		return nil, false
	}
	if fixed < 0 {
		n := (len(cur) - offset) / size * size
		return cur[offset : offset+n], true
	}
	if offset+fixed > len(cur) {
		return nil, false
	}
	return cur[offset : offset+fixed], true
}

func tnABOutOfBounds(method string) *TnError {
	return TnNodeError("TypeError", "", "Cannot perform "+method+" on a detached or out-of-bounds ArrayBuffer")
}

func tnABDetachedError(method string) *TnError {
	return TnNodeError("TypeError", "", "Cannot perform "+method+" on a detached ArrayBuffer")
}

func tnABConstructCheck(b []byte) {
	if st := tnABLookup(b); st != nil && st.detached {
		panic(tnABDetachedError("Construct"))
	}
}

// The byte offset and byte length (-1: tracking) of new XArray(buffer[,
// byteOffset[, length]]), checked as JS does
func tnABViewBounds(kind string, buf []byte, size int, args []float64) (int, int) {
	cur, st := tnABCurrent(buf)
	if st != nil && st.detached {
		panic(tnABDetachedError("Construct"))
	}
	offset := 0
	if len(args) > 0 {
		offset = int(args[0])
	}
	if offset%size != 0 {
		panic(tnTypedRangeError("start offset of " + kind + " should be a multiple of " + strconv.Itoa(size)))
	}
	if offset < 0 || offset > len(cur) {
		panic(tnTypedRangeError("Start offset " + strconv.Itoa(offset) + " is outside the bounds of the buffer"))
	}
	if len(args) > 1 {
		length := int(args[1])
		if length < 0 || offset+length*size > len(cur) {
			panic(tnTypedRangeError("Invalid typed array length: " + strconv.Itoa(length)))
		}
		return offset, length * size
	}
	if st != nil && st.resizable {
		return offset, -1
	}
	if (len(cur)-offset)%size != 0 {
		panic(tnTypedRangeError("byte length of " + kind + " should be a multiple of " + strconv.Itoa(size)))
	}
	return offset, len(cur) - offset
}

// ToIndex of a byte length
func tnABIndex(v float64, message string) int {
	if math.IsNaN(v) {
		return 0
	}
	v = math.Trunc(v)
	if v < 0 || v > 9007199254740991 {
		panic(tnTypedRangeError(message))
	}
	return int(v)
}

// A resizable buffer of n bytes, at most max
func tnABNewResizable(n int, max int) []byte {
	b := make([]byte, n, tnABMax(n, 16))
	tnABRegister(b, &tnABState{length: n, max: max, resizable: true})
	return b
}

func tnABMax(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// new ArrayBuffer(n, { maxByteLength }) / new SharedArrayBuffer(n, { maxByteLength })
func TnNewArrayBuffer(n float64, options interface{}) []byte {
	size := tnABIndex(n, "Invalid array buffer length")
	max := TnGetValue(options, "maxByteLength")
	if max == nil {
		return make([]byte, size)
	}
	limit := tnABIndex(TnNumber(max), "Invalid array buffer max length")
	if size > limit {
		panic(tnTypedRangeError("Invalid array buffer max length"))
	}
	return tnABNewResizable(size, limit)
}

// The bytes of buffer b now (empty when detached): for APIs taking a buffer
func TnABBytes(b []byte) []byte {
	cur, _ := tnABCurrent(b)
	if cur == nil {
		return []byte{}
	}
	return cur
}

// new Uint8Array(buffer, …): its bytes now
func TnArrayBufferForView(b []byte) []byte {
	cur, st := tnABCurrent(b)
	if st != nil && st.detached {
		panic(tnABDetachedError("Construct"))
	}
	return cur
}

func TnABByteLength(b []byte) float64 {
	cur, _ := tnABCurrent(b)
	return float64(len(cur))
}

func TnABMaxByteLength(b []byte) float64 {
	cur, st := tnABCurrent(b)
	if st != nil && st.resizable && !st.detached {
		return float64(st.max)
	}
	return float64(len(cur))
}

func TnABResizable(b []byte) bool {
	st := tnABLookup(b)
	return st != nil && st.resizable
}

func TnABDetached(b []byte) bool {
	st := tnABLookup(b)
	return st != nil && st.detached
}

// The length of a resizable buffer: new bytes read 0; growing past the
// capacity moves the bytes (views follow)
func tnABSetLength(b []byte, st *tnABState, n int) {
	base := st.grown
	if base == nil {
		base = b[:cap(b)]
	}
	if n > cap(base) {
		grown := make([]byte, n, min(st.max, tnABMax(n, 2*cap(base))))
		copy(grown, base[:st.length])
		st.grown = grown
	} else if n > st.length {
		clear(base[st.length:n])
	}
	st.length = n
	tnABGen.Add(1)
}

// arrayBuffer.resize(n)
func TnABResize(b []byte, n float64) {
	st := tnABLookup(b)
	if st != nil && st.detached && st.resizable {
		panic(tnABDetachedError("ArrayBuffer.prototype.resize"))
	}
	if st == nil || !st.resizable {
		panic(TnNodeError("TypeError", "", "Method ArrayBuffer.prototype.resize called on incompatible receiver #<ArrayBuffer>"))
	}
	size := tnABIndex(n, "ArrayBuffer.prototype.resize: Invalid length parameter")
	if size > st.max {
		panic(tnTypedRangeError("ArrayBuffer.prototype.resize: Invalid length parameter"))
	}
	tnABSetLength(b, st, size)
}

// sharedArrayBuffer.grow(n): it can't shrink
func TnABGrow(b []byte, n float64) {
	st := tnABLookup(b)
	if st == nil || !st.resizable {
		panic(TnNodeError("TypeError", "", "Method SharedArrayBuffer.prototype.grow called on incompatible receiver #<SharedArrayBuffer>"))
	}
	size := tnABIndex(n, "SharedArrayBuffer.prototype.grow: Invalid length parameter")
	if size > st.max || size < st.length {
		panic(tnTypedRangeError("SharedArrayBuffer.prototype.grow: Invalid length parameter"))
	}
	tnABSetLength(b, st, size)
}

// ArrayBuffer#slice copies (a Uint8Array's subarray / Buffer's slice share)
func TnArrayBufferSlice(b []byte, args ...float64) []byte {
	cur, st := tnABCurrent(b)
	if st != nil && st.detached {
		panic(tnABDetachedError("ArrayBuffer.prototype.slice"))
	}
	start, end := tnTypedBounds(len(cur), args)
	return append([]byte{}, cur[start:end]...)
}

// arrayBuffer.transfer(newLength) / transferToFixedLength(newLength): the
// bytes (resized, zero-filled) move to a new buffer — resizable as the source
// was, for transfer — and the source is detached. (The bytes are copied:
// Uint8Arrays made on the source keep the old memory.)
func TnArrayBufferTransfer(b []byte, toFixed bool, length ...float64) []byte {
	method := "ArrayBuffer.prototype.transfer"
	if toFixed {
		method = "ArrayBuffer.prototype.transferToFixedLength"
	}
	cur, st := tnABCurrent(b)
	if st != nil && st.detached {
		panic(tnABDetachedError(method))
	}
	n := len(cur)
	if len(length) > 0 && !math.IsNaN(length[0]) {
		n = tnABIndex(length[0], "Invalid array buffer length")
	}
	var out []byte
	if !toFixed && st != nil && st.resizable {
		if n > st.max {
			panic(tnTypedRangeError(method + ": Invalid length parameter"))
		}
		out = tnABNewResizable(n, st.max)
	} else {
		out = make([]byte, n)
	}
	copy(out, cur)
	if st == nil {
		st = &tnABState{}
		if !tnABRegister(b, st) {
			return out
		}
	}
	st.detached = true
	st.length = 0
	st.grown = nil
	tnABGen.Add(1)
	return out
}`;

export function registerTypedArrays(r: NodeRegistry): void {
  defineHelper(
    r,
    'typedArrays',
    ['encoding/binary', 'math', 'math/big', 'runtime', 'sort', 'strconv', 'strings', 'sync', 'sync/atomic', 'unsafe', 'weak'],
    ['error', 'dynamic', 'nodeInvoke', 'builtins'],
    typedArrayHelper
  );
  const use = () => r.helper('typedArrays');

  for (const name of Object.keys(TYPED_ARRAY_KINDS)) {
    const elem = TYPED_ARRAY_KINDS[name];
    const goType = `*Tn${name}`;
    const key = `globals.${name}`;
    const clamped = name === 'Uint8ClampedArray' ? 'true' : 'false';
    const generic = `[${elem}](${JSON.stringify(name)}, ${clamped}`;
    defineClass(
      r,
      key,
      goType,
      'class',
      `fill=${goType}; set=; subarray=${goType}; slice=${goType}; at=float64; indexOf=float64; lastIndexOf=float64; includes=bool; join=string; toString=string; toLocaleString=string; reverse=${goType}; toReversed=${goType}; sort=${goType}; toSorted=${goType}; with=${goType}; copyWithin=${goType}; keys=[]float64; values=[]float64; tnFloats=[]float64`,
      '',
      'length=float64; byteLength=float64; byteOffset=float64; BYTES_PER_ELEMENT=float64; buffer=[]byte',
      ''
    );
    r.globals[name] = key;
    r.iterators[goType] = 'tnFloats';
    r.paramTypers[`${key}#sort`] = (_n: any[]) => ['float64', 'float64'];
    r.paramTypers[`${key}#toSorted`] = r.paramTypers[`${key}#sort`];
    // new Int32Array(length | array-like) copies; new Int32Array(buffer, …) views
    r.constructors[key] = (call: NodeCall) => {
      use();
      if (call.args.length > 0 && r.isArrayBuffer(call.nodes[0])) {
        return `TnTypedArrayView${generic}, ${call.args.join(', ')})`;
      }
      return `TnNewTypedArray${generic}${call.args.length > 0 ? ', ' + call.args[0] : ''})`;
    };
    r.functions[`${key}.from`] = (call: NodeCall) => {
      use();
      return `TnTypedArrayFrom${generic}, ${call.args.join(', ')})`;
    };
    r.paramTypers[`${key}.from`] = (_n: any[]) => ['float64', 'float64'];
    r.functions[`${key}.of`] = (call: NodeCall) => {
      use();
      return `TnTypedArrayOf${generic}${call.args.length > 0 ? ', ' + call.args.join(', ') : ''})`;
    };
    setResults(r, key, `from=${goType}; of=${goType}`);
    r.values[`${key}.BYTES_PER_ELEMENT`] = (_c: NodeCall) => `float64(${ELEMENT_SIZES[elem]})`;
    r.valueTypes[`${key}.BYTES_PER_ELEMENT`] = 'float64';
  }

  // BigInt64Array / BigUint64Array
  for (const name of BIGINT_ARRAY_KINDS) {
    const key = `globals.${name}`;
    const goType = '*TnBigIntArray';
    defineClass(
      r,
      key,
      goType,
      'class',
      `fill=${goType}; set=; subarray=${goType}; slice=${goType}; at=*tnbig.Int; indexOf=float64; includes=bool; join=string; toString=string; reverse=${goType}; keys=[]float64; values=[]*tnbig.Int`,
      '',
      'length=float64; byteLength=float64; byteOffset=float64; BYTES_PER_ELEMENT=float64; buffer=[]byte',
      ''
    );
    r.globals[name] = key;
    r.iterators[goType] = 'values';
    r.constructors[key] = (call: NodeCall) => {
      use();
      if (call.args.length > 0 && r.isArrayBuffer(call.nodes[0])) {
        return `TnBigIntArrayView(${JSON.stringify(name)}, ${call.args.join(', ')})`;
      }
      return `TnNewBigIntArray(${JSON.stringify(name)}${call.args.length > 0 ? ', ' + call.args[0] : ''})`;
    };
    r.functions[`${key}.from`] = (call: NodeCall) => {
      use();
      return `TnBigIntArrayFrom(${JSON.stringify(name)}, ${call.args[0]})`;
    };
    r.functions[`${key}.of`] = (call: NodeCall) => {
      use();
      return `TnBigIntArrayOf(${JSON.stringify(name)}${call.args.length > 0 ? ', ' + call.args.join(', ') : ''})`;
    };
    setResults(r, key, `from=${goType}; of=${goType}`);
    r.values[`${key}.BYTES_PER_ELEMENT`] = (_c: NodeCall) => 'float64(8)';
    r.valueTypes[`${key}.BYTES_PER_ELEMENT`] = 'float64';
  }
  r.classByGoType['*TnBigIntArray'] = 'globals.BigInt64Array';

  defineClass(
    r,
    'globals.DataView',
    '*TnDataView',
    'class',
    'getInt8=float64; getUint8=float64; getInt16=float64; getUint16=float64; getInt32=float64; getUint32=float64; getFloat16=float64; getFloat32=float64; getFloat64=float64; getBigInt64=*tnbig.Int; getBigUint64=*tnbig.Int; setInt8=; setUint8=; setInt16=; setUint16=; setInt32=; setUint32=; setFloat16=; setFloat32=; setFloat64=; setBigInt64=; setBigUint64=',
    '',
    'buffer=[]byte; byteOffset=float64; byteLength=float64',
    ''
  );
  r.globals['DataView'] = 'globals.DataView';
  r.constructors['globals.DataView'] = (call: NodeCall) => {
    use();
    return `TnNewDataView(${call.args.join(', ')})`;
  };

  // ArrayBuffer is Go []byte too: new ArrayBuffer(n), ArrayBuffer.isView
  defineClass(r, 'globals.ArrayBuffer', '[]byte', 'Buffer', '', '', '', '');
  r.classByGoType['[]byte'] = 'buffer.Buffer';
  r.globals['ArrayBuffer'] = 'globals.ArrayBuffer';
  // new ArrayBuffer(n, { maxByteLength }): resizable (SharedArrayBuffer: growable)
  const newBuffer = (call: NodeCall) => {
    if (call.args.length > 1) {
      use();
      return `TnNewArrayBuffer(${call.args[0]}, ${call.args[1]})`;
    }
    return call.args.length > 0 ? `make([]byte, int(${call.args[0]}))` : '[]byte{}';
  };
  r.constructors['globals.ArrayBuffer'] = newBuffer;
  defineClass(r, 'globals.SharedArrayBuffer', '[]byte', 'Buffer', '', '', '', '');
  // ([]byte values are Buffers / Uint8Arrays for method calls)
  r.classByGoType['[]byte'] = 'buffer.Buffer';
  r.globals['SharedArrayBuffer'] = 'globals.SharedArrayBuffer';
  r.constructors['globals.SharedArrayBuffer'] = newBuffer;
  r.functions['globals.ArrayBuffer.isView'] = (call: NodeCall) => {
    use();
    if (r.isArrayBuffer(call.nodes[0])) return 'false';
    return `TnIsView(${call.args[0]})`;
  };
  r.results['globals.ArrayBuffer.isView'] = 'bool';
}

