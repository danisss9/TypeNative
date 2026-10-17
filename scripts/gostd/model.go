package main

import (
	"go/token"
	"go/types"
	"sort"
	"strconv"
	"strings"
)

// Package model extracted from go/types.

// Fully qualified Go type strings use import paths: "net/http.Request",
// "crypto/rand.Rand", "time.Duration". Universe builtins stay bare.

type paramInfo struct {
	name string
	typ  string
}

type funcInfo struct {
	name     string
	tparams  []string
	params   []paramInfo
	results  []string
	variadic bool
}

type constInfo struct {
	name string
	kind string // int, float, string, bool, rune, typed, other
	goTy string // Go type (named type for typed consts)
}

type varInfo struct {
	name string
	goTy string
}

type fieldInfo struct {
	name string
	goTy string
}

type methodInfo struct {
	name    string
	ptr     bool
	params  []paramInfo
	results []string
}

type typeInfo struct {
	name         string
	kind         string // struct, interface, basic, func, slice, map, array, chan, other, alias
	under        string
	tparams      []string
	numeric      bool
	fields       []fieldInfo
	methods      []methodInfo
	ifaceMethods []methodInfo
}

type pkgModel struct {
	path   string
	name   string
	funcs  []funcInfo
	consts []constInfo
	vars   []varInfo
	typs   []typeInfo
}

func qualifierFor(pkg *types.Package) types.Qualifier {
	return func(other *types.Package) string {
		if other == nil {
			return ""
		}
		return other.Path()
	}
}

func goTypeString(pkg *types.Package, t types.Type) string {
	return types.TypeString(t, qualifierFor(pkg))
}

// Whether the type references anything unusable from TypeScript: unexported
// names, internal/vendor packages, unsafe. Named types check only their own
// identity (not their underlying); composites recurse.
func mentionsUnexported(pkg *types.Package, t types.Type) bool {
	found := false
	var visit func(tt types.Type)
	visit = func(tt types.Type) {
		if found || tt == nil {
			return
		}
		switch x := tt.(type) {
		case *types.Named:
			obj := x.Obj()
			if obj != nil && obj.Pkg() != nil {
				if !token.IsExported(obj.Name()) {
					found = true
					return
				}
				p := obj.Pkg().Path()
				if p == "unsafe" || p == "internal" || strings.HasPrefix(p, "internal/") ||
					strings.Contains(p, "/internal/") || strings.HasSuffix(p, "/internal") ||
					strings.Contains(p, "/vendor/") {
					found = true
					return
				}
			}
			if args := x.TypeArgs(); args != nil {
				for i := 0; i < args.Len(); i++ {
					visit(args.At(i))
				}
			}
		case *types.Pointer:
			visit(x.Elem())
		case *types.Slice:
			visit(x.Elem())
		case *types.Array:
			visit(x.Elem())
		case *types.Map:
			visit(x.Key())
			visit(x.Elem())
		case *types.Chan:
			visit(x.Elem())
		case *types.Signature:
			if x.Params() != nil {
				for i := 0; i < x.Params().Len(); i++ {
					visit(x.Params().At(i).Type())
				}
			}
			if x.Results() != nil {
				for i := 0; i < x.Results().Len(); i++ {
					visit(x.Results().At(i).Type())
				}
			}
		case *types.Struct:
			for i := 0; i < x.NumFields(); i++ {
				visit(x.Field(i).Type())
			}
		case *types.Interface:
			for i := 0; i < x.NumMethods(); i++ {
				visit(x.Method(i).Type())
			}
		case *types.Union:
			for i := 0; i < x.Len(); i++ {
				visit(x.Term(i).Type())
			}
		}
	}
	visit(t)
	return found
}

func sigTypeParams(sig *types.Signature) []string {
	var out []string
	if tp := sig.TypeParams(); tp != nil {
		for i := 0; i < tp.Len(); i++ {
			out = append(out, tp.At(i).Obj().Name())
		}
	}
	return out
}

func sigParams(pkg *types.Package, sig *types.Signature) ([]paramInfo, bool) {
	var out []paramInfo
	variadic := false
	if sig.Params() == nil {
		return out, variadic
	}
	n := sig.Params().Len()
	for i := 0; i < n; i++ {
		v := sig.Params().At(i)
		typ := v.Type()
		if sig.Variadic() && i == n-1 {
			if sl, ok := typ.(*types.Slice); ok {
				name := v.Name()
				if name == "" || name == "_" {
					name = "args"
				}
				out = append(out, paramInfo{name: name, typ: "..." + goTypeString(pkg, sl.Elem())})
				variadic = true
				continue
			}
		}
		name := v.Name()
		if name == "" || name == "_" {
			name = "arg" + strconv.Itoa(i)
		}
		out = append(out, paramInfo{name: name, typ: goTypeString(pkg, typ)})
	}
	return out, variadic
}

func sigResults(pkg *types.Package, sig *types.Signature) []string {
	var out []string
	if sig.Results() == nil {
		return out
	}
	for i := 0; i < sig.Results().Len(); i++ {
		out = append(out, goTypeString(pkg, sig.Results().At(i).Type()))
	}
	return out
}

func sigClean(pkg *types.Package, sig *types.Signature) bool {
	if sig.Params() != nil {
		for i := 0; i < sig.Params().Len(); i++ {
			if mentionsUnexported(pkg, sig.Params().At(i).Type()) {
				return false
			}
		}
	}
	if sig.Results() != nil {
		for i := 0; i < sig.Results().Len(); i++ {
			if mentionsUnexported(pkg, sig.Results().At(i).Type()) {
				return false
			}
		}
	}
	return true
}

func extractPackage(pkg *types.Package, path string) pkgModel {
	m := pkgModel{path: path, name: pkg.Name()}
	scope := pkg.Scope()
	var names []string
	for _, n := range scope.Names() {
		if token.IsExported(n) {
			names = append(names, n)
		}
	}
	sort.Strings(names)
	for _, n := range names {
		obj := scope.Lookup(n)
		switch o := obj.(type) {
		case *types.Func:
			sig, ok := o.Type().(*types.Signature)
			if !ok || sig.Recv() != nil {
				continue
			}
			if !sigClean(pkg, sig) {
				continue
			}
			params, variadic := sigParams(pkg, sig)
			m.funcs = append(m.funcs, funcInfo{
				name: o.Name(), tparams: sigTypeParams(sig),
				params: params, results: sigResults(pkg, sig), variadic: variadic,
			})
		case *types.Const:
			if path == "syscall" {
				continue
			}
			kind := "other"
			goTy := goTypeString(pkg, o.Type())
			if b, ok := o.Type().(*types.Basic); ok {
				switch b.Kind() {
				case types.UntypedBool, types.Bool:
					kind = "bool"
				case types.UntypedString, types.String:
					kind = "string"
				case types.UntypedRune, types.Rune:
					kind = "rune"
				case types.UntypedFloat, types.Float32, types.Float64,
					types.UntypedComplex, types.Complex64, types.Complex128:
					kind = "float"
				default:
					kind = "int"
				}
			} else if _, ok := o.Type().(*types.Named); ok {
				kind = "typed"
			}
			m.consts = append(m.consts, constInfo{name: o.Name(), kind: kind, goTy: goTy})
		case *types.Var:
			if mentionsUnexported(pkg, o.Type()) && !isUnexportedLocal(pkg, o.Type()) {
				continue
			}
			m.vars = append(m.vars, varInfo{name: o.Name(), goTy: goTypeString(pkg, o.Type())})
		case *types.TypeName:
			if ti, ok := extractType(pkg, o); ok {
				m.typs = append(m.typs, ti)
			}
		}
	}
	// Second pass: unexported named types reachable from kept vars/fields,
	// so their exported methods resolve (binary.BigEndian's bigEndian).
	for _, v := range m.vars {
		collectUnexported(pkg, v.goTy, &m)
	}
	for i := range m.typs {
		for _, f := range m.typs[i].fields {
			collectUnexported(pkg, f.goTy, &m)
		}
	}
	return m
}

// Whether the type is an unexported named type from this same package
// (usable through exported vars/methods, unlike internal/unsafe types).
func isUnexportedLocal(pkg *types.Package, t types.Type) bool {
	named, ok := t.(*types.Named)
	if !ok {
		return false
	}
	obj := named.Obj()
	if obj == nil || obj.Pkg() == nil {
		return false
	}
	if token.IsExported(obj.Name()) {
		return false
	}
	return obj.Pkg() == pkg
}

// Extract an unexported named type (by Go string) into the model when it
// has exported methods.
func collectUnexported(pkg *types.Package, goTy string, m *pkgModel) {
	name := goTy
	for strings.HasPrefix(name, "*") {
		name = strings.TrimPrefix(name, "*")
	}
	if i := strings.Index(name, "["); i >= 0 {
		name = name[:i]
	}
	if local, ok := splitLocalType(pkg, name); ok {
		name = local
	} else {
		return
	}
	for _, ti := range m.typs {
		if ti.name == name {
			return
		}
	}
	obj := pkg.Scope().Lookup(name)
	tn, ok := obj.(*types.TypeName)
	if !ok || token.IsExported(name) {
		return
	}
	if ti, ok := extractUnexported(pkg, tn); ok {
		m.typs = append(m.typs, ti)
	}
}

// Whether a Go type string names a type from this package.
func splitLocalType(pkg *types.Package, name string) (string, bool) {
	_ = pkg
	if strings.ContainsAny(name, "[]{}() *,") {
		return "", false
	}
	// Qualified self-reference: encoding/binary.bigEndian → bigEndian.
	if dot := strings.LastIndex(name, "."); dot >= 0 {
		head, tail := name[:dot], name[dot+1:]
		if head == pkg.Path() && isLocalIdent(tail) {
			return tail, true
		}
		return "", false
	}
	if name == "" || name == "error" || name == "any" {
		return "", false
	}
	return name, true
}

func isLocalIdent(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '_' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || i > 0 && c >= '0' && c <= '9' {
			continue
		}
		return false
	}
	return true
}

func isNumericUnderlying(under types.Type) bool {
	b, ok := under.(*types.Basic)
	if !ok {
		return false
	}
	switch b.Kind() {
	case types.Int, types.Int8, types.Int16, types.Int32, types.Int64,
		types.Uint, types.Uint8, types.Uint16, types.Uint32, types.Uint64, types.Uintptr,
		types.Float32, types.Float64:
		return true
	}
	return false
}

func extractType(pkg *types.Package, tn *types.TypeName) (typeInfo, bool) {
	// Type aliases resolve to their target. Self-referential aliases
	// (BuildInfo = BuildInfo via dot-imports) degrade to any.
	if tn.IsAlias() {
		target := tn.Type()
		if mentionsUnexported(pkg, target) {
			return typeInfo{}, false
		}
		under := goTypeString(pkg, target)
		if baseTypeName(under) == tn.Name() {
			return typeInfo{name: tn.Name(), kind: "alias", under: "any"}, true
		}
		return typeInfo{name: tn.Name(), kind: "alias", under: under}, true
	}
	named, ok := tn.Type().(*types.Named)
	if !ok {
		return typeInfo{}, false
	}
	if obj := named.Obj(); obj != nil && obj.Pkg() != nil {
		p := obj.Pkg().Path()
		if p == "unsafe" || p == "internal" || strings.HasPrefix(p, "internal/") ||
			strings.Contains(p, "/internal/") || strings.Contains(p, "/vendor/") {
			return typeInfo{}, false
		}
	}
	under := named.Underlying()
	ti := typeInfo{name: tn.Name(), under: goTypeString(pkg, under)}
	switch u := under.(type) {
	case *types.Struct:
		ti.kind = "struct"
		seen := map[string]bool{}
		for i := 0; i < u.NumFields(); i++ {
			f := u.Field(i)
			if !token.IsExported(f.Name()) {
				continue
			}
			if mentionsUnexported(pkg, f.Type()) {
				continue
			}
			ti.fields = append(ti.fields, fieldInfo{name: f.Name(), goTy: goTypeString(pkg, f.Type())})
			seen[f.Name()] = true
		}
		// Promoted fields from embedded structs (rsa.PrivateKey.N via PublicKey).
		for i := 0; i < u.NumFields(); i++ {
			f := u.Field(i)
			if !f.Embedded() {
				continue
			}
			for _, pf := range promotedFields(pkg, f.Type()) {
				if !seen[pf.name] {
					ti.fields = append(ti.fields, pf)
					seen[pf.name] = true
				}
			}
		}
	case *types.Interface:
		ti.kind = "interface"
		seen := map[string]bool{}
		addIfaceMethods := func(iface *types.Interface) {
			for i := 0; i < iface.NumMethods(); i++ {
				meth := iface.Method(i)
				if seen[meth.Name()] || !token.IsExported(meth.Name()) {
					continue
				}
				seen[meth.Name()] = true
				sig, ok := meth.Type().(*types.Signature)
				if !ok || !sigClean(pkg, sig) {
					continue
				}
				params, _ := sigParams(pkg, sig)
				ti.ifaceMethods = append(ti.ifaceMethods, methodInfo{
					name: meth.Name(), params: params, results: sigResults(pkg, sig),
				})
			}
		}
		addIfaceMethods(u)
		for i := 0; i < u.NumEmbeddeds(); i++ {
			emb := u.EmbeddedType(i)
			if n, ok := emb.(*types.Named); ok {
				if iface, ok := n.Underlying().(*types.Interface); ok {
					addIfaceMethods(iface)
				}
			}
		}
	case *types.Basic:
		ti.kind = "basic"
		ti.numeric = isNumericUnderlying(under)
	case *types.Signature:
		ti.kind = "func"
		if mentionsUnexported(pkg, under) {
			return typeInfo{name: ti.name, kind: "alias", under: "any"}, true
		}
	case *types.Slice:
		ti.kind = "slice"
		if mentionsUnexported(pkg, under) {
			return typeInfo{name: ti.name, kind: "alias", under: "any"}, true
		}
	case *types.Map:
		ti.kind = "map"
		if mentionsUnexported(pkg, under) {
			return typeInfo{name: ti.name, kind: "alias", under: "any"}, true
		}
	case *types.Array:
		ti.kind = "array"
		if mentionsUnexported(pkg, under) {
			return typeInfo{name: ti.name, kind: "alias", under: "any"}, true
		}
	case *types.Chan:
		ti.kind = "chan"
		if mentionsUnexported(pkg, under) {
			return typeInfo{name: ti.name, kind: "alias", under: "any"}, true
		}
	default:
		ti.kind = "other"
		if mentionsUnexported(pkg, under) {
			return typeInfo{name: ti.name, kind: "alias", under: "any"}, true
		}
	}
	if tp := named.TypeParams(); tp != nil {
		for i := 0; i < tp.Len(); i++ {
			ti.tparams = append(ti.tparams, tp.At(i).Obj().Name())
		}
	}
	// Full method set on T and *T (promoted methods included).
	seen := map[string]bool{}
	for _, ts := range []types.Type{named, types.NewPointer(named)} {
		ms := types.NewMethodSet(ts)
		for i := 0; i < ms.Len(); i++ {
			sel := ms.At(i)
			mobj, ok := sel.Obj().(*types.Func)
			if !ok || !token.IsExported(mobj.Name()) {
				continue
			}
			if seen[mobj.Name()] {
				continue
			}
			sig, ok := sel.Type().(*types.Signature)
			if !ok || !sigClean(pkg, sig) {
				continue
			}
			_, isPtr := ts.(*types.Pointer)
			params, _ := sigParams(pkg, sig)
			ti.methods = append(ti.methods, methodInfo{
				name: mobj.Name(), ptr: isPtr,
				params: params, results: sigResults(pkg, sig),
			})
			seen[mobj.Name()] = true
		}
	}
	sort.Slice(ti.methods, func(i, j int) bool { return ti.methods[i].name < ti.methods[j].name })
	// A promoted field colliding with a method name loses (TS classes
	// cannot have both a property and a method of the same name).
	if ti.kind == "struct" && len(ti.methods) > 0 {
		methodNames := map[string]bool{}
		for _, mt := range ti.methods {
			methodNames[mt.name] = true
		}
		kept := ti.fields[:0]
		for _, f := range ti.fields {
			if !methodNames[f.name] {
				kept = append(kept, f)
			}
		}
		ti.fields = kept
	}
	return ti, true
}

// Exported fields promoted through an embedded struct (one level).
func promotedFields(pkg *types.Package, t types.Type) []fieldInfo {
	for t != nil {
		if ptr, ok := t.(*types.Pointer); ok {
			t = ptr.Elem()
			continue
		}
		break
	}
	named, ok := t.(*types.Named)
	if !ok {
		return nil
	}
	st, ok := named.Underlying().(*types.Struct)
	if !ok {
		return nil
	}
	var out []fieldInfo
	for i := 0; i < st.NumFields(); i++ {
		f := st.Field(i)
		if !token.IsExported(f.Name()) || mentionsUnexported(pkg, f.Type()) {
			continue
		}
		out = append(out, fieldInfo{name: f.Name(), goTy: goTypeString(pkg, f.Type())})
	}
	return out
}

// Extract an unexported named type for method resolution only (never
// rendered to the d.ts). Only struct/interface/func kinds with exported
// methods are useful.
func extractUnexported(pkg *types.Package, tn *types.TypeName) (typeInfo, bool) {
	named, ok := tn.Type().(*types.Named)
	if !ok {
		return typeInfo{}, false
	}
	under := named.Underlying()
	ti := typeInfo{name: tn.Name(), under: goTypeString(pkg, under)}
	switch under.(type) {
	case *types.Struct:
		ti.kind = "struct"
	case *types.Interface:
		ti.kind = "interface"
	case *types.Signature:
		ti.kind = "func"
	default:
		_, isBasic := under.(*types.Basic)
		if isBasic {
			ti.kind = "basic"
		} else {
			ti.kind = "other"
		}
	}
	seen := map[string]bool{}
	for _, ts := range []types.Type{named, types.NewPointer(named)} {
		ms := types.NewMethodSet(ts)
		for i := 0; i < ms.Len(); i++ {
			sel := ms.At(i)
			mobj, ok := sel.Obj().(*types.Func)
			if !ok || !token.IsExported(mobj.Name()) {
				continue
			}
			if seen[mobj.Name()] {
				continue
			}
			sig, ok := sel.Type().(*types.Signature)
			if !ok || !sigClean(pkg, sig) {
				continue
			}
			_, isPtr := ts.(*types.Pointer)
			params, _ := sigParams(pkg, sig)
			ti.methods = append(ti.methods, methodInfo{
				name: mobj.Name(), ptr: isPtr,
				params: params, results: sigResults(pkg, sig),
			})
			seen[mobj.Name()] = true
		}
	}
	if len(ti.methods) == 0 {
		return typeInfo{}, false
	}
	sort.Slice(ti.methods, func(i, j int) bool { return ti.methods[i].name < ti.methods[j].name })
	return ti, true
}
