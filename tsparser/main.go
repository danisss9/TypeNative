// tsparser: parses TypeScript source into a normalized JSON AST.
//
// Used by TypeNative's self-hosting pipeline: the transpiled compiler calls
// this tool (via node:child_process) instead of the `typescript` npm package.
// The JSON shape mirrors the TypeScript API AST (kind + spec field names) so
// the same transpiler code can consume ASTs from either source.
//
// Usage: tsparser < file.ts > ast.json
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"reflect"
	"strings"

	"github.com/buke/typescript-go-internal/pkg/ast"
	"github.com/buke/typescript-go-internal/pkg/core"
	"github.com/buke/typescript-go-internal/pkg/parser"
)

func main() {
	sourceBytes, err := io.ReadAll(os.Stdin)
	if err != nil {
		fmt.Fprintln(os.Stderr, "read stdin:", err)
		os.Exit(1)
	}
	sourceFile := parser.ParseSourceFile(
		ast.SourceFileParseOptions{FileName: "/main.ts"},
		string(sourceBytes),
		core.ScriptKindTS,
	)
	out := serializeNode(sourceFile.AsNode())
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		fmt.Fprintln(os.Stderr, "encode:", err)
		os.Exit(1)
	}
}


// Nodes currently being serialized (cycle guard).
var inProgress = map[*ast.Node]bool{}

// Nodes whose As<Kind> method name doesn't follow the naming patterns.
var asMethodOverrides = map[string]string{
	"ForInStatement":       "AsForInOrOfStatement",
	"ForOfStatement":       "AsForInOrOfStatement",
	"ArrayBindingPattern":  "AsBindingPattern",
	"ObjectBindingPattern": "AsBindingPattern",
	"CaseClause":           "AsCaseOrDefaultClause",
	"DefaultClause":        "AsCaseOrDefaultClause",
	"TypeAssertionExpression": "AsTypeAssertion",
}

// asData returns the typed data struct behind a node via its As<Kind> method.
// Method names don't always match kind names exactly (GetAccessor →
// AsGetAccessorDeclaration), so common suffixes are tried in order.
func asData(n *ast.Node) reflect.Value {
	kind := n.Kind.String()
	if strings.HasPrefix(kind, "Kind") {
		kind = kind[4:] // KindIfStatement → IfStatement
	}
	nodeVal := reflect.ValueOf(n)
	candidates := []string{"As" + kind, "As" + kind + "Declaration", "As" + kind + "Expression", "As" + kind + "Statement", "As" + kind + "Node"}
	if override, ok := asMethodOverrides[kind]; ok {
		candidates = append([]string{override}, candidates...)
	}
	for _, candidate := range candidates {
		meth := nodeVal.MethodByName(candidate)
		if !meth.IsValid() {
			continue
		}
		results := meth.Call(nil)
		if len(results) == 0 {
			continue
		}
		v := results[0]
		if v.IsNil() {
			return reflect.Value{}
		}
		return v.Elem()
	}
	return reflect.Value{}
}

// serializeNode converts an ast.Node into a map: {kind, text?, <spec fields>}.
// inProgress guards against cyclic *Node references (self/parent backlinks).
func serializeNode(n *ast.Node) any {
	if n == nil {
		return nil
	}
	if inProgress[n] {
		return nil
	}
	inProgress[n] = true
	defer delete(inProgress, n)
	obj := map[string]any{"kind": strings.TrimPrefix(n.Kind.String(), "Kind")}
	// SourceFile bookkeeping fields are not part of the language AST
	if n.Kind == ast.KindSourceFile {
		statements := []any{}
		for _, stmt := range n.AsSourceFile().Statements.Nodes {
			if stmt != nil {
				statements = append(statements, serializeNode(stmt))
			}
		}
		obj["statements"] = statements
		return obj
	}
	// Names and modifiers live in unexported base fields — use accessors
	if name := n.Name(); name != nil {
		obj["name"] = serializeNode(name.AsNode())
	}
	if mods := n.Modifiers(); mods != nil {
		arr := []any{}
		for _, mod := range mods.Nodes {
			arr = append(arr, serializeNode(mod))
		}
		obj["modifiers"] = arr
	}
	switch n.Kind {
	case ast.KindIdentifier, ast.KindPrivateIdentifier, ast.KindStringLiteral,
		ast.KindNumericLiteral, ast.KindBigIntLiteral, ast.KindNoSubstitutionTemplateLiteral,
		ast.KindRegularExpressionLiteral, ast.KindTemplateHead, ast.KindTemplateMiddle,
		ast.KindTemplateTail, ast.KindJsxText:
		obj["text"] = n.Text()
	}

	// Binding-pattern holes (`[a, , b]`): ts-go parses them as an empty
	// BindingElement; the TypeScript API exposes them as OmittedExpression
	if n.Kind == ast.KindBindingElement {
		if be := n.AsBindingElement(); be != nil && be.Name() == nil && be.DotDotDotToken == nil {
			return map[string]any{"kind": "OmittedExpression"}
		}
	}

	data := asData(n)
	if data.IsValid() {
		collectFields(data, obj)
	}
	return obj
}

// collectFields serializes a typed data struct's fields into obj, recursing
// into embedded base structs (DeclarationBase, FunctionLikeBase, ...) so their
// fields are hoisted like the TypeScript API exposes them.
func collectFields(data reflect.Value, obj map[string]any) {
	dt := data.Type()
	for i := 0; i < dt.NumField(); i++ {
		field := dt.Field(i)
		if !field.IsExported() {
			continue
		}
		if field.Anonymous && field.Type.Kind() == reflect.Struct {
			collectFields(data.Field(i), obj)
			continue
		}
		name, val, ok := serializeField(field.Name, data.Field(i))
		if ok {
			obj[name] = val
		}
	}
}

// serializeField normalizes one typed-struct field into the TS-spec JSON shape.
func serializeField(name string, v reflect.Value) (string, any, bool) {
	if renamed, ok := fieldRenames[name]; ok {
		name = renamed
	} else {
		name = lowerFirst(name)
	}
	switch v.Kind() {
	case reflect.String:
		return lowerFirst(name), v.String(), true
	case reflect.Bool:
		return lowerFirst(name), v.Bool(), true
	case reflect.Ptr:
		if v.IsNil() {
			return "", nil, false
		}
		if isNodePtr(v.Type()) {
			return lowerFirst(name), serializeNode(v.Interface().(*ast.Node)), true
		}
		// *NodeBody / *EntityName etc. are pointer-to-interface wrappers
		// whose dynamic value is a *Node
		if v.Type().Elem().Kind() == reflect.Interface {
			inner := v.Elem().Elem()
			if inner.IsValid() && inner.Kind() == reflect.Ptr && !inner.IsNil() {
				return lowerFirst(name), serializeNode(inner.Interface().(*ast.Node)), true
			}
			return "", nil, false
		}
		// e.g. *StatementList/*ArgumentList/*ModifierList → array of member
		// nodes, named after the field (statements/arguments/modifiers)
		if strings.HasSuffix(v.Type().Elem().Name(), "List") {
			var arr []any
			elem := v.Elem()
			nodesField := elem.FieldByName("Nodes")
			if nodesField.IsValid() && nodesField.Kind() == reflect.Slice {
				for _, child := range iterSlice(nodesField) {
					if child.Kind() == reflect.Ptr && isNodePtr(child.Type()) && !child.IsNil() {
						arr = append(arr, serializeNode(child.Interface().(*ast.Node)))
					}
				}
			}
			if len(arr) == 0 {
				return "", nil, false
			}
			return lowerFirst(name), arr, true
		}
		return "", nil, false
	case reflect.Slice:
		var arr []any
		for _, el := range iterSlice(v) {
			if el.Kind() == reflect.Ptr && isNodePtr(el.Type()) && !el.IsNil() {
				arr = append(arr, serializeNode(el.Interface().(*ast.Node)))
			}
		}
		if arr == nil {
			arr = []any{}
		}
		return lowerFirst(name), arr, true
	case reflect.Interface:
		if v.IsNil() {
			return "", nil, false
		}
		// Expression/Statement wrappers hold *Node underneath
		inner := v.Elem()
		if inner.Kind() == reflect.Ptr && isNodePtr(inner.Type()) && !inner.IsNil() {
			return lowerFirst(name), serializeNode(inner.Interface().(*ast.Node)), true
		}
		return "", nil, false
	}
	return "", nil, false
}

func isNodePtr(t reflect.Type) bool {
	return t == reflect.TypeOf((*ast.Node)(nil))
}

func iterSlice(v reflect.Value) []reflect.Value {
	out := make([]reflect.Value, 0, v.Len())
	for i := 0; i < v.Len(); i++ {
		out = append(out, v.Index(i))
	}
	return out
}

func lowerFirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToLower(s[:1]) + s[1:]
}

// Field renames to match the TypeScript API's names.
var fieldRenames = map[string]string{
	"PostfixToken": "questionToken", // optional property `a?: string`
}
