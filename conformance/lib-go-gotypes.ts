import * as token from 'go:go/token';
import * as parser from 'go:go/parser';
import * as types from 'go:go/types';
import * as importer from 'go:go/importer';
import * as doc from 'go:go/doc';
import * as build from 'go:go/build';
import * as runtime from 'go:runtime';
import * as strings from 'go:strings';

const src = `package demo

import "strings"

// Add adds two ints.
func Add(a, b int) int { return a + b }

// Upper shouts.
func Upper(s string) string { return strings.ToUpper(s) }
`;
const fset = token.NewFileSet();
const file = parser.ParseFile(fset, 'demo.go', src, parser.ParseComments);

// go/types + go/importer: type-check a package that imports the std lib.
const conf = new types.Config({ Importer: importer.ForCompiler(fset, 'source', null) });
const pkg = conf.Check('example.com/demo', fset, [file], null);
assert(pkg.Name() === 'demo' && pkg.Path() === 'example.com/demo', 'types.Config.Check');
assert(pkg.Scope().Lookup('Add').Type().String() === 'func(a int, b int) int', 'types Scope.Lookup');
assert(types.Universe.Lookup('string').Type().String() === 'string', 'types.Universe');
assert(types.ExprString(parser.ParseExpr('a + b*c')) === 'a + b * c', 'types.ExprString');

let typeErr = '';
try {
  const bad = parser.ParseFile(fset, 'bad.go', 'package bad\nvar x int = "s"\n', 0);
  new types.Config({}).Check('bad', fset, [bad], null);
} catch (e) {
  typeErr = (e as Error).message;
}
assert(strings.Contains(typeErr, 'cannot use') === true, `types error throws: ${typeErr}`);

// go/doc: package documentation from the AST.
const docs = doc.NewFromFiles(fset, [file], 'example.com/demo');
assert(docs.Funcs.length === 2 && docs.Funcs[0].Name === 'Add', 'doc.NewFromFiles funcs');
assert(docs.Funcs[0].Doc === 'Add adds two ints.\n', 'doc Func.Doc');
assert(doc.IsPredeclared('error') === true, 'doc.IsPredeclared');

// go/build: build context of this toolchain.
assert(build.Default.GOOS === runtime.GOOS && build.Default.GOARCH === runtime.GOARCH, 'build.Default');
assert(build.IsLocalImport('./util') === true && build.IsLocalImport('fmt') === false, 'build.IsLocalImport');
