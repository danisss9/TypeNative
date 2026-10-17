package main

import (
	"fmt"
	"strconv"
	"strings"
)

// Go type string → TypeScript type string.
//
// The input is a fully qualified Go type as produced by goTypeString:
// "net/http.Request", "time.Duration", "[]byte", "map[string]int",
// "func(string) error", "chan int", "*bytes.Buffer", "...string".
//
// The `pos` selects the mapping variant: "param" (plain number for named
// numerics), "result" (number & { methods } for named numerics), "field"
// (same as result).

type typeMapper struct {
	// Named numeric types in this package: name → method names.
	numerics map[string][]string
	// All named types in this package (for interface/struct references).
	named map[string]*typeInfo
	// Package path of the module being rendered (for self references).
	path string
	// Package name (for qualifying cross-package references in d.ts).
	pkgName string
	// All packages (for resolving qualified references).
	all map[string]*pkgModel
}

func newTypeMapper(m *pkgModel, all map[string]*pkgModel) *typeMapper {
	tm := &typeMapper{
		numerics: map[string][]string{},
		named:    map[string]*typeInfo{},
		path:     m.path,
		pkgName:  m.name,
		all:      all,
	}
	for i := range m.typs {
		ti := &m.typs[i]
		tm.named[ti.name] = ti
		if ti.kind == "basic" && ti.numeric {
			var methods []string
			for _, mt := range ti.methods {
				methods = append(methods, mt.name)
			}
			tm.numerics[ti.name] = methods
		}
	}
	return tm
}

// Split "a/b.C" into ("a/b", "C"); "C" into ("", "C"). Generic args stay on
// the name: "a/b.C[T]" → ("a/b", "C[T]").
func splitQual(s string) (string, string) {
	head := s
	if i := strings.Index(s, "["); i >= 0 {
		head = s[:i]
	}
	if i := strings.LastIndex(head, "."); i >= 0 {
		qpath, name := head[:i], head[i+1:]
		if isIdent(name) && !strings.Contains(qpath, " ") {
			return qpath, name + s[len(head):]
		}
	}
	return "", s
}

func isIdent(s string) bool {
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

// Strip generic args: "Name[T]" → "Name".
func stripGeneric(s string) string {
	if i := strings.Index(s, "["); i >= 0 {
		return s[:i]
	}
	return s
}

// Universe builtins that map directly (never "unexported").
func isBuiltinName(s string) bool {
	switch stripGeneric(s) {
	case "string", "bool", "error", "any", "byte", "rune",
		"int", "int8", "int16", "int32", "int64",
		"uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
		"float32", "float64", "complex64", "complex128":
		return true
	}
	return false
}

var goKeywords = map[string]bool{
	"break": true, "case": true, "chan": true, "const": true, "continue": true,
	"default": true, "defer": true, "else": true, "fallthrough": true, "for": true,
	"func": true, "go": true, "goto": true, "if": true, "import": true,
	"interface": true, "map": true, "package": true, "range": true, "return": true,
	"select": true, "struct": true, "switch": true, "type": true, "var": true,
}

var tsReserved = map[string]bool{
	"break": true, "case": true, "catch": true, "class": true, "const": true,
	"continue": true, "debugger": true, "default": true, "delete": true, "do": true,
	"else": true, "enum": true, "export": true, "extends": true, "false": true,
	"finally": true, "for": true, "function": true, "if": true, "import": true,
	"in": true, "instanceof": true, "new": true, "null": true, "return": true,
	"super": true, "switch": true, "this": true, "throw": true, "true": true,
	"try": true, "typeof": true, "var": true, "void": true, "while": true,
	"with": true, "as": true, "implements": true, "interface": true, "let": true,
	"package": true, "private": true, "protected": true, "public": true,
	"static": true, "yield": true, "any": true, "boolean": true, "number": true,
	"string": true, "symbol": true, "type": true, "from": true, "of": true,
	"undefined": true, "never": true, "unknown": true, "object": true,
	"arguments": true, "eval": true, "constructor": true,
}

func sanitizeName(n string) string {
	if tsReserved[n] {
		return n + "_"
	}
	return n
}

// Strip a leading result name: "advance int" → "int". Keeps types that start
// with keywords or contain type syntax.
func stripResultName(r string) string {
	r = strings.TrimSpace(r)
	depth := 0
	for i := 0; i < len(r); i++ {
		switch r[i] {
		case '[', '(', '{':
			depth++
		case ']', ')', '}':
			depth--
		case ' ':
			if depth == 0 {
				first, rest := r[:i], strings.TrimSpace(r[i+1:])
				if rest == "" || !isIdent(first) || goKeywords[first] {
					return r
				}
				return rest
			}
		}
	}
	return r
}

// Base name of a Go type: strips pointers, qualifiers and generic args.
func baseTypeName(goTy string) string {
	for strings.HasPrefix(goTy, "*") {
		goTy = strings.TrimPrefix(goTy, "*")
	}
	_, name := splitQual(goTy)
	if i := strings.Index(name, "["); i >= 0 {
		name = name[:i]
	}
	return name
}

// Resolve a qualified reference to its package model + type name.
func (tm *typeMapper) resolve(qpath, name string) (*pkgModel, *typeInfo) {
	if qpath == "" || qpath == tm.path {
		if ti, ok := tm.named[name]; ok {
			return nil, ti
		}
		return nil, nil
	}
	pm, ok := tm.all[qpath]
	if !ok {
		return nil, nil
	}
	for i := range pm.typs {
		if pm.typs[i].name == name {
			return pm, &pm.typs[i]
		}
	}
	return pm, nil
}

// Map a Go type to TypeScript. `pos` is "param", "result" or "field".
func (tm *typeMapper) mapType(goTy string, pos string) string {
	goTy = strings.TrimSpace(goTy)
	// Variadic marker (params only).
	if strings.HasPrefix(goTy, "...") {
		return "..." + tm.mapType(goTy[3:], pos)
	}
	// Pointers to plain basics are ref cells (flag.String → GoRef<string>).
	if strings.HasPrefix(goTy, "*") && !strings.HasPrefix(goTy, "**") {
		if ts, ok := basicToTS(goTy[1:]); ok && ts != "any" {
			return "import('go:builtin').GoRef<" + ts + ">"
		}
	}
	// Other pointers: transparent in TS.
	for strings.HasPrefix(goTy, "*") {
		goTy = strings.TrimPrefix(goTy, "*")
	}
	// error → GoError (builtin module).
	if goTy == "error" {
		return "import('go:builtin').GoError"
	}
	// any / interface{} → any.
	if goTy == "any" || goTy == "interface{}" {
		return "any"
	}
	// unsafe.Pointer → any (raw pointers are not expressible in TS).
	if goTy == "unsafe.Pointer" {
		return "any"
	}
	// []byte → Uint8Array.
	if goTy == "[]byte" || goTy == "[]uint8" {
		return "Uint8Array"
	}
	// Slices.
	if strings.HasPrefix(goTy, "[]") {
		return tm.mapType(goTy[2:], pos) + "[]"
	}
	// Arrays [N]T → T[].
	if strings.HasPrefix(goTy, "[") {
		if i := strings.Index(goTy, "]"); i >= 0 {
			return tm.mapType(goTy[i+1:], pos) + "[]"
		}
	}
	// Maps.
	if strings.HasPrefix(goTy, "map[") {
		depth := 0
		for i := 4; i < len(goTy); i++ {
			switch goTy[i] {
			case '[':
				depth++
			case ']':
				if depth == 0 {
					k := tm.mapType(goTy[4:i], pos)
					v := tm.mapType(goTy[i+1:], pos)
					// Record keys must be string | number | symbol.
					if k != "string" && k != "number" {
						return "Record<string, " + v + ">"
					}
					return fmt.Sprintf("Record<%s, %s>", k, v)
				}
				depth--
			}
		}
		return "Record<string, any>"
	}
	// Channels.
	if strings.HasPrefix(goTy, "chan ") {
		return fmt.Sprintf("import('go:builtin').GoChan<%s>", tm.mapType(strings.TrimPrefix(goTy, "chan "), pos))
	}
	if strings.HasPrefix(goTy, "<-chan ") {
		return fmt.Sprintf("import('go:builtin').GoChan<%s>", tm.mapType(strings.TrimPrefix(goTy, "<-chan "), pos))
	}
	if strings.HasPrefix(goTy, "chan<- ") {
		return fmt.Sprintf("import('go:builtin').GoChan<%s>", tm.mapType(strings.TrimPrefix(goTy, "chan<- "), pos))
	}
	// Struct literals: anonymous structs become field records.
	if strings.HasPrefix(goTy, "struct{") {
		return tm.mapStruct(goTy, pos)
	}
	// Func types.
	if strings.HasPrefix(goTy, "func(") {
		return tm.mapFunc(goTy, pos)
	}
	// Basic types.
	if ts, ok := basicToTS(goTy); ok {
		return ts
	}
	// Qualified or local named type.
	qpath, name := splitQual(goTy)
	// Unexported names are not declarable in TS: map to any.
	if base := stripGeneric(name); !isExportedName(base) && !isBuiltinName(base) {
		return "any"
	}
	// Generic instantiation: Name[args].
	base := name
	var args []string
	if i := strings.Index(name, "["); i >= 0 {
		base = name[:i]
		args = splitTopLevel(name[i+1:strings.LastIndex(name, "]")])
	}
	// Local reference.
	if qpath == "" || qpath == tm.path {
		if _, ok := tm.numerics[base]; ok {
			return "number"
		}
		// Local alias of another package's type (os.FileMode = fs.FileMode):
		// params take what the target takes (a plain number).
		if ti := tm.named[base]; ti != nil && ti.kind == "alias" && pos == "param" && len(args) == 0 {
			return tm.mapType(ti.under, pos)
		}
		if len(args) > 0 {
			var mapped []string
			for _, a := range args {
				mapped = append(mapped, tm.mapType(a, pos))
			}
			return fmt.Sprintf("%s<%s>", sanitizeName(base), strings.Join(mapped, ", "))
		}
		return sanitizeName(base)
	}
	// Cross-package reference: resolve to decide the mapping.
	pm, ti := tm.resolve(qpath, base)
	_ = pm
	if ti != nil {
		// Named numeric from another package: number in params, qualified
		// name in results/fields.
		if ti.kind == "basic" && ti.numeric {
			if pos == "param" {
				return "number"
			}
			return qualifyRef(qpath, base, args, tm)
		}
		// []byte aliases.
		if ti.kind == "alias" && (ti.under == "[]byte" || ti.under == "[]uint8") {
			return "Uint8Array"
		}
		if ti.kind == "alias" {
			return tm.mapType(ti.under, pos)
		}
		return qualifyRef(qpath, base, args, tm)
	}
	// Unknown cross-package type: import it by path.
	return qualifyRef(qpath, base, args, tm)
}

func qualifyRef(qpath, base string, args []string, tm *typeMapper) string {
	ref := fmt.Sprintf("import('go:%s').%s", qpath, base)
	if len(args) > 0 {
		var mapped []string
		for _, a := range args {
			mapped = append(mapped, tm.mapType(a, "result"))
		}
		ref += "<" + strings.Join(mapped, ", ") + ">"
	}
	return ref
}

func basicToTS(goTy string) (string, bool) {
	switch goTy {
	case "string":
		return "string", true
	case "bool":
		return "boolean", true
	case "int", "int8", "int16", "int32", "int64",
		"uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
		"float32", "float64", "byte", "rune",
		"untyped int", "untyped float", "untyped rune", "untyped bool", "untyped string":
		return "number", true
	case "complex64", "complex128", "untyped complex":
		return "any", true
	}
	return "", false
}

// Top-level parameter type: what the bridge accepts at a call site, which is
// wider than the Go type. []byte also takes number[] (copied per call),
// byte/rune take a one-char string, and nil-able Go types take null.
func (tm *typeMapper) argType(goTy string) string {
	goTy = strings.TrimSpace(goTy)
	ts := tm.mapType(goTy, "param")
	switch goTy {
	case "[]byte", "[]uint8":
		return "Uint8Array | number[] | null"
	case "byte", "uint8", "rune":
		return "number | string"
	}
	if ts == "any" {
		return ts
	}
	if tm.isNilable(goTy) {
		if strings.Contains(ts, "=>") {
			ts = "(" + ts + ")"
		}
		return ts + " | null"
	}
	return ts
}

// Whether a Go type has nil as a value (pointer, slice, map, func, chan,
// interface, or a named type over one of those).
func (tm *typeMapper) isNilable(goTy string) bool {
	for _, prefix := range []string{"*", "[]", "map[", "func(", "chan ", "<-chan ", "chan<- "} {
		if strings.HasPrefix(goTy, prefix) {
			return true
		}
	}
	if goTy == "error" {
		return true
	}
	qpath, name := splitQual(goTy)
	base := stripGeneric(name)
	var ti *typeInfo
	if qpath == "" || qpath == tm.path {
		ti = tm.named[base]
	} else {
		_, ti = tm.resolve(qpath, base)
	}
	if ti == nil {
		return false
	}
	switch ti.kind {
	case "interface", "slice", "map", "func", "chan":
		return true
	}
	return false
}

// Render a signature's parameter list. Trailing error params are optional
// (template.Must(t): the error was already thrown). With arrayVariadic the
// variadic slot takes a slice instead (exec.Command('go', ['version'])).
func (tm *typeMapper) renderParams(params []paramInfo, arrayVariadic bool) string {
	numbered := numberParams(params)
	optionalFrom := len(numbered)
	for optionalFrom > 0 && strings.TrimSpace(numbered[optionalFrom-1].typ) == "error" {
		optionalFrom--
	}
	var ps []string
	for i, p := range numbered {
		switch {
		case strings.HasPrefix(p.typ, "...") && arrayVariadic:
			ps = append(ps, fmt.Sprintf("%s: %s[]", p.name, tm.mapType(p.typ[3:], "param")))
		case strings.HasPrefix(p.typ, "..."):
			ps = append(ps, fmt.Sprintf("...%s: %s[]", p.name, tm.mapType(p.typ[3:], "param")))
		case i >= optionalFrom:
			ps = append(ps, fmt.Sprintf("%s?: %s", p.name, tm.argType(p.typ)))
		default:
			ps = append(ps, fmt.Sprintf("%s: %s", p.name, tm.argType(p.typ)))
		}
	}
	return strings.Join(ps, ", ")
}

// Whether the last parameter is variadic over a concrete type (`...any`
// takes an array as a single value, so it gets no slice overload).
func hasVariadic(params []paramInfo) bool {
	if len(params) == 0 {
		return false
	}
	last := params[len(params)-1].typ
	return strings.HasPrefix(last, "...") && last != "...any" && last != "...interface{}"
}

// "func(a string, b ...int) (string, error)" → "(a: string, ...b: number[]) => [string]".
// Results follow the (T, error) → T / error → void / (A, B) → [A, B] rule.
func (tm *typeMapper) mapFunc(goTy string, pos string) string {
	params, results := splitFunc(goTy)
	var ps []string
	for _, p := range numberParams(parseParams(params)) {
		if strings.HasPrefix(p.typ, "...") {
			ps = append(ps, fmt.Sprintf("...%s: %s[]", p.name, tm.mapType(p.typ[3:], "param")))
		} else {
			ps = append(ps, fmt.Sprintf("%s: %s", p.name, tm.mapType(p.typ, "param")))
		}
	}
	ret := tm.mapResults(splitTopLevel(results))
	if ret == "void" {
		return fmt.Sprintf("(%s) => void", strings.Join(ps, ", "))
	}
	// A TS callback returning a Go error returns null for nil.
	if ret == "import('go:builtin').GoError" {
		ret = "import('go:builtin').GoError | null"
	}
	return fmt.Sprintf("(%s) => %s", strings.Join(ps, ", "), ret)
}

// Parse "a T, b U" into numbered params (unnamed get arg0, arg1, ...).
func parseParams(params string) []paramInfo {
	var out []paramInfo
	for i, p := range splitTopLevel(params) {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		name, typ := splitParam(p)
		if name == "" {
			name = "arg" + strconv.Itoa(i)
		}
		out = append(out, paramInfo{name: name, typ: typ})
	}
	return out
}

// "struct{ X int; Y string }" → "{ X: number; Y: string }".
func (tm *typeMapper) mapStruct(goTy string, pos string) string {
	inner := goTy[len("struct{"):]
	if i := strings.LastIndex(inner, "}"); i >= 0 {
		inner = inner[:i]
	}
	var parts []string
	for _, f := range splitStructFields(inner) {
		f = strings.TrimSpace(f)
		if f == "" {
			continue
		}
		name, typ := splitParam(f)
		if typ == "" || name == "arg" {
			continue
		}
		parts = append(parts, fmt.Sprintf("%s: %s", sanitizeName(name), tm.mapType(typ, pos)))
	}
	return "{ " + strings.Join(parts, "; ") + " }"
}

// Struct fields are `;`-separated (commas never separate fields).
func splitStructFields(s string) []string {
	var out []string
	depth := 0
	start := 0
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '[', '(', '{':
			depth++
		case ']', ')', '}':
			depth--
		case ';':
			if depth == 0 {
				out = append(out, s[start:i])
				start = i + 1
			}
		}
	}
	if tail := strings.TrimSpace(s[start:]); tail != "" {
		out = append(out, tail)
	}
	return out
}

func splitParam(p string) (string, string) {
	// Split "name type" at the FIRST space at depth 0. The name is always a
	// simple identifier; if the head is not one (unnamed func/chan/map
	// types), the whole string is the type.
	depth := 0
	for i := 0; i < len(p); i++ {
		switch p[i] {
		case '[', '(', '{':
			depth++
		case ']', ')', '}':
			depth--
		case ' ':
			if depth == 0 {
				first, rest := p[:i], strings.TrimSpace(p[i+1:])
				if isIdent(first) && !goKeywords[first] && rest != "" {
					return first, rest
				}
				return "", p
			}
		}
	}
	return "", p
}

// Number the parameters of a signature so duplicates never collide.
func numberParams(params []paramInfo) []paramInfo {
	seen := map[string]int{}
	out := make([]paramInfo, len(params))
	for i, p := range params {
		name := sanitizeName(p.name)
		if name == "" {
			name = "arg"
		}
		if n, ok := seen[name]; ok {
			seen[name] = n + 1
			name = name + strconv.Itoa(n+1)
		} else {
			seen[name] = 0
		}
		out[i] = paramInfo{name: name, typ: p.typ}
	}
	return out
}

// Split "func(params) results" into params and results strings. Results may
// be a single type or a parenthesized list.
func splitFunc(goTy string) (string, string) {
	rest := strings.TrimPrefix(goTy, "func")
	depth := 0
	for i := 0; i < len(rest); i++ {
		switch rest[i] {
		case '(':
			depth++
		case ')':
			depth--
			if depth == 0 {
				results := strings.TrimSpace(rest[i+1:])
				if strings.HasPrefix(results, "(") && strings.HasSuffix(results, ")") {
					results = results[1 : len(results)-1]
				}
				return rest[1:i], results
			}
		}
	}
	return "", ""
}

func splitTopLevel(s string) []string {
	var out []string
	depth := 0
	start := 0
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '[', '(', '{':
			depth++
		case ']', ')', '}':
			depth--
		case ',':
			if depth == 0 {
				out = append(out, strings.TrimSpace(s[start:i]))
				start = i + 1
			}
		}
	}
	if tail := strings.TrimSpace(s[start:]); tail != "" {
		out = append(out, tail)
	}
	return out
}

// Map result list to a TS return type.
func (tm *typeMapper) mapResults(results []string) string {
	// Strip result names ("advance int" → "int").
	var stripped []string
	for _, r := range results {
		if s := stripResultName(r); s != "" {
			stripped = append(stripped, s)
		}
	}
	results = stripped
	// Drop trailing error.
	n := len(results)
	hasErr := n > 0 && baseTypeName(results[n-1]) == "error"
	core := results
	if hasErr {
		core = results[:n-1]
	}
	if n == 0 {
		return "void"
	}
	if len(core) == 0 {
		// Error alone: the error value (throws as a statement, captured
		// as GoError in value position).
		return "import('go:builtin').GoError"
	}
	if len(core) == 1 {
		return tm.mapType(core[0], "result")
	}
	var parts []string
	for _, r := range core {
		parts = append(parts, tm.mapType(r, "result"))
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

// Whether results end in error (for the bridge metadata).
func resultsHaveError(results []string) bool {
	return len(results) > 0 && baseTypeName(results[len(results)-1]) == "error"
}

// Core results without the trailing error.
func coreResults(results []string) []string {
	if resultsHaveError(results) {
		return results[:len(results)-1]
	}
	return results
}
