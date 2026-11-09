// A class instance passed where an interface type is expected: the properties
// it carries beyond its class (expandos) convert with it, filling the fields
// the interface declares, as JS passes the whole object (Babel's parser
// builds import specifiers on a bare Node and passes it on: the imported
// name is an expando, and it must arrive as the interface's field)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Node {
  type: string = '';
  start: number = 0;
}

interface Specifier {
  type: string;
  start: number;
  imported: any; // a union type (Identifier | StringLiteral), held as any
  local: Identifier | null;
}

interface Identifier {
  type: string;
  start: number;
  name: string;
}

// The callee sees the objects as their interfaces: the expandos land in the
// fields, and the converted copy it mutates and returns escapes
function finish(specifier: Specifier, local: Identifier): Specifier {
  specifier.local = local;
  return specifier;
}

const imported = new Node();
imported.type = 'Identifier';
imported.start = 5;
const specifier = new Node();
specifier.type = 'ImportSpecifier';
(specifier as any).imported = imported; // expandos: properties the class doesn't declare
const local = new Node();
local.type = 'Identifier';
local.start = 7;
(local as any).name = 'useState';

const done = finish(specifier as any, local as any);
assert(done.type === 'ImportSpecifier', 'shared fields convert');
assert(done.start === 0, 'shared zero fields stay zero');
assert(done.imported === imported, 'a union field keeps the object');
assert(done.local !== null, 'the converted parameter is set');
assert(done.local!.type === 'Identifier' && done.local!.start === 7, 'shared fields on the converted parameter');
assert(done.local!.name === 'useState', 'the parameter\'s expando lands in the declared field');

const plain = new Node();
plain.type = 'Identifier';
const donePlain = finish(plain as any, local as any);
assert(`${donePlain.type}:${donePlain.imported ? donePlain.imported.type : 'none'}` === 'Identifier:none', 'shared fields without expandos');
assert(donePlain.local !== null && donePlain.local.name === 'useState', 'expandos convert without other expandos');
console.log('ok');
