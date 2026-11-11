// Temporary probe: an alias-table lookup over a Map with array values, the
// way @babel/traverse's explode() expands visitor aliases. A missing key must
// read as undefined, not as an empty array.
const aliases = new Map<string, string[]>();
aliases.set('Function', ['FunctionDeclaration', 'FunctionExpression']);

const visitor: any = {};
visitor.Program = () => 'program';
visitor.Function = () => 'function';
visitor.Identifier = () => 'identifier';

for (const key of Object.keys(visitor)) {
  const fns = visitor[key];
  const expanded = aliases.get(key);
  if (expanded === undefined) continue;
  delete visitor[key];
  for (const alias of expanded) visitor[alias] = fns;
}

assert(visitor.Program !== undefined, 'a type without aliases keeps its visitor');
assert(visitor.Identifier !== undefined, 'another type without aliases keeps its visitor');
assert(visitor.Function === undefined, 'an alias key is replaced by its types');
assert(visitor.FunctionDeclaration !== undefined, 'the alias type gets the visitor');
console.log('ok');
