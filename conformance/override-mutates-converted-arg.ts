// A statement narrowed out of a union and passed through a base-class method
// to a subclass override that replaces one of its fields: the change is on
// the statement itself (the React Compiler's PropagateEarlyReturns:
// transformScope(scope) → this.visitScope(scope) → scopeBlock.instructions = …)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Instruction = { kind: 'instruction'; name: string };
type ScopeBlock = { kind: 'scope'; id: number; instructions: Statement[] };
type Terminal = { kind: 'terminal'; label: string | null };
type Statement = Instruction | ScopeBlock | Terminal;

class Visitor {
  traverseBlock(block: Statement[]): void {
    for (const stmt of block) {
      if (stmt.kind === 'scope') this.transformScope(stmt);
    }
  }
  transformScope(scope: ScopeBlock): void {
    this.visitScope(scope);
  }
  visitScope(scope: ScopeBlock): void {
    this.traverseBlock(scope.instructions);
  }
}

class EarlyReturns extends Visitor {
  override visitScope(scopeBlock: ScopeBlock): void {
    super.visitScope(scopeBlock);
    scopeBlock.instructions = [{ kind: 'terminal', label: `bb${scopeBlock.id}` }, ...scopeBlock.instructions];
  }
}

const body: Statement[] = [
  { kind: 'instruction', name: 'a' },
  { kind: 'scope', id: 6, instructions: [{ kind: 'instruction', name: 'b' }] },
];
new EarlyReturns().traverseBlock(body);
const scope = body[1];
check('kind', scope.kind, 'scope');
if (scope.kind === 'scope') {
  check('wrapped', scope.instructions.length, 2);
  check('label', scope.instructions[0].kind, 'terminal');
}
console.log('ok');
