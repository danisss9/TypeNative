// splice inserting into an array held in an object field — at the front, in
// the middle, several at once — keeps every existing element (Babel's
// unshiftContainer: container.splice(0, 0, ...nodes) on program.body)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Node = { type: string };
type Program = { body: Node[] };

function insertAt(container: Node[], at: number, nodes: Node[]): void {
  container.splice(at, 0, ...nodes);
}

const program: Program = { body: [{ type: 'Import' }, { type: 'Fn' }] };
insertAt(program.body, 0, [{ type: 'NewImport' }]);
check('front', program.body.map((n) => n.type).join(','), 'NewImport,Import,Fn');
insertAt(program.body, 2, [{ type: 'A' }, { type: 'B' }]);
check('middle', program.body.map((n) => n.type).join(','), 'NewImport,Import,A,B,Fn');

const holder: any = { container: [{ type: 'x' }] };
holder.container.splice(0, 0, { type: 'y' });
check('dynamic', holder.container.map((n: Node) => n.type).join(','), 'y,x');
const removed = program.body.splice(1, 1);
check('removed', removed[0].type, 'Import');
check('after remove', program.body.length, 4);
console.log('ok');
