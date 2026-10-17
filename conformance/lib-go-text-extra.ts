import * as template from 'go:html/template';
import * as parse from 'go:text/template/parse';
import * as syntax from 'go:regexp/syntax';
import * as reflect from 'go:reflect';
import * as maps from 'go:maps';
import * as slices from 'go:slices';
import * as bytes from 'go:bytes';
import * as strings from 'go:strings';

// html/template escapes by context.
const t = template.Must(template.New('page').Parse('<p title="{{.}}">{{.}}</p>'));
const out = new bytes.Buffer();
t.Execute(out, '<b>"hi"</b>');
assert(
  out.String() === '<p title="&lt;b&gt;&#34;hi&#34;&lt;/b&gt;">&lt;b&gt;&#34;hi&#34;&lt;/b&gt;</p>',
  `html/template: ${out.String()}`
);
assert(template.HTMLEscapeString('<a&b>') === '&lt;a&amp;b&gt;', 'html/template.HTMLEscapeString');
assert(template.JSEscapeString("it's") === "it\\'s", 'html/template.JSEscapeString');

// text/template/parse: the parse tree of a template.
const tree = parse.New('greet');
tree.Mode = parse.ParseComments;
const parsed = parse.Parse('greet', 'Hi {{.Name}}!', '{{', '}}');
const names = slices.Collect(maps.Keys(parsed));
assert(names.length === 1 && names[0] === 'greet', 'parse.Parse tree set');
assert(tree.Name === 'greet', 'parse.New');
const ident = parse.NewIdentifier('printf');
assert(ident.String() === 'printf', 'parse.NewIdentifier');

// regexp/syntax: parse, simplify, compile.
const re = syntax.Parse('a{2,3}b+', syntax.Perl);
assert(re.String() === 'a{2,3}b+', `syntax.Parse: ${re.String()}`);
assert(re.Simplify().String() === 'aaa?b+', `syntax.Simplify: ${re.Simplify().String()}`);
const prog = syntax.Compile(re.Simplify());
assert(prog.NumCap === 2 && strings.Contains(prog.String(), 'match') === true, 'syntax.Compile');
assert(syntax.IsWordChar('a') === true && syntax.IsWordChar('-') === false, 'syntax.IsWordChar');

let threw = '';
try {
  syntax.Parse('a(', syntax.Perl);
} catch (e) {
  threw = (e as Error).message;
}
assert(strings.Contains(threw, 'missing closing )') === true, 'syntax.Parse error throws');

// reflect on TS values (strings, numbers, arrays).
assert(reflect.TypeOf('x').Kind() === reflect.String, 'reflect.TypeOf string kind');
assert(reflect.TypeOf(1.5).String() === 'float64', 'reflect.TypeOf number');
assert(reflect.ValueOf('abc').Len() === 3, 'reflect.ValueOf Len');
assert(reflect.DeepEqual([1, 2], [1, 2]) === true && reflect.DeepEqual([1], [2]) === false, 'reflect.DeepEqual');
assert(reflect.Kind(reflect.Slice).String() === 'slice', 'reflect.Kind.String');
