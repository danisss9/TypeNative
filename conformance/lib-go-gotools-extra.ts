import * as token from 'go:go/token';
import * as parser from 'go:go/parser';
import * as ast from 'go:go/ast';
import * as scanner from 'go:go/scanner';
import * as printer from 'go:go/printer';
import * as constant from 'go:go/constant';
import * as constraint from 'go:go/build/constraint';
import * as comment from 'go:go/doc/comment';
import * as bytes from 'go:bytes';
import * as strings from 'go:strings';

const src = 'package demo\n\nfunc Add(a, b int) int { return a + b }\n\nvar x = 1\n';

// go/parser + go/ast.
const fset = token.NewFileSet();
const file = parser.ParseFile(fset, 'demo.go', src, parser.ParseComments);
assert(file.Name.Name === 'demo', 'parser.ParseFile package name');
assert(file.Decls.length === 2, 'ast File.Decls');
let idents = 0;
ast.Inspect(file, (n: ast.Node) => {
  if (n !== null) idents++;
  return true;
});
assert(idents > 5, 'ast.Inspect');
assert(ast.IsExported('Add') === true && ast.IsExported('add') === false, 'ast.IsExported');
const expr = parser.ParseExpr('1 + 2*3');
assert(expr.Pos() > 0 || expr.Pos() === 1, 'parser.ParseExpr');

let parseErr = '';
try {
  parser.ParseFile(fset, 'bad.go', 'package', 0);
} catch (e) {
  parseErr = (e as Error).message;
}
assert(parseErr !== '', 'parser error throws');

// go/printer: print the AST back.
const out = new bytes.Buffer();
printer.Fprint(out, fset, file);
assert(strings.Contains(out.String(), 'func Add(a, b int) int') === true, 'printer.Fprint');

// go/scanner: tokenize.
const sfset = token.NewFileSet();
const code = bytes.NewBufferString('x := 42').Bytes();
const sfile = sfset.AddFile('s.go', sfset.Base(), code.length);
const s = new scanner.Scanner();
s.Init(sfile, code, null, 0);
const tokens: string[] = [];
for (let i = 0; i < 3; i++) {
  // Named numerics read as numbers; token.Token(n) restores the methods.
  const [, tok, lit] = s.Scan();
  const name = token.Token(tok).String();
  tokens.push(lit === '' ? name : name + ':' + lit);
}
assert(tokens.join(' ') === 'IDENT:x := INT:42', `scanner: ${tokens.join(' ')}`);
assert(s.ErrorCount === 0, 'scanner ErrorCount');

// go/constant: exact arithmetic.
const sum = constant.BinaryOp(constant.MakeInt64(40), token.ADD, constant.MakeInt64(2));
assert(sum.String() === '42', 'constant.BinaryOp');
const [n, exact] = constant.Int64Val(sum);
assert(n === 42 && exact === true, 'constant.Int64Val');
assert(constant.MakeString('hi').ExactString() === '"hi"', 'constant.MakeString');

// go/build/constraint.
const c = constraint.Parse('//go:build linux && !386');
assert(c.String() === 'linux && !386', 'constraint.Parse');
assert(c.Eval((tag: string) => tag === 'linux') === true, 'constraint Eval true');
assert(c.Eval((tag: string) => tag === '386') === false, 'constraint Eval false');
assert(constraint.IsGoBuild('//go:build windows') === true, 'constraint.IsGoBuild');

// go/doc/comment: doc comment → Markdown.
const doc = new comment.Parser().Parse('Hello world.\n\n# Usage\n\nCall it.\n');
const md = bytes.NewBuffer(new comment.Printer().Markdown(doc)).String();
assert(strings.Contains(md, '### Usage') === true, `comment Markdown: ${md}`);
