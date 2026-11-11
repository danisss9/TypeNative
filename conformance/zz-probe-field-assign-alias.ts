// Temporary probe: the parser's variable-declaration idiom on an object
// type's required array field (the JS value of the assignment is the array
// reference, so the binding aliases the field):
//   const declarations = (node.declarations = []); declarations.push(decl)
interface Declarator {
  name: string;
}
interface DeclarationNode {
  declarations: Declarator[];
  kind: string;
}
const node: DeclarationNode = { declarations: [], kind: 'const' };
const declarations: Declarator[] = (node.declarations = []);
const decl: Declarator = { name: 'g' };
declarations.push(decl);
assert(node.declarations.length === 1, `the push reached the field (${node.declarations.length})`);
assert(node.declarations[0].name === 'g', 'the element is there');
assert(declarations.length === 1, 'the binding sees it');

declarations.push({ name: 'x' });
assert(node.declarations.length === 2, `the second push reached the field (${node.declarations.length})`);

const other: Declarator[] = (node.declarations = [{ name: 'y' }]);
other.push({ name: 'z' });
assert(node.declarations.length === 2 && node.declarations[1].name === 'z', 'a reassigned array aliases too');
console.log('ok');
