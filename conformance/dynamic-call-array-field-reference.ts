// An array field handed to a method called on a dynamically typed receiver is
// the field's array itself: the method's in-place changes (length = 0, push)
// reach it (the React Compiler's visitor.visitBlock(fn.body, state))
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Stmt = { kind: string };
type Fn = { name: string; body: Stmt[] };

class Visitor<TState> {
  visitBlock(block: Stmt[], state: TState): void {
    this.traverseBlock(block, state);
  }
  traverseBlock(_block: Stmt[], _state: TState): void {}
}

class Rewriter extends Visitor<number> {
  override traverseBlock(block: Stmt[], state: number): void {
    const next = block.filter((s) => s.kind !== 'drop');
    for (let i = 0; i < state; i++) next.push({ kind: 'added' });
    block.length = 0;
    block.push(...next);
  }
}

function visitFunction<TState>(fn: Fn, visitor: Visitor<TState>, state: TState): void {
  visitor.visitBlock(fn.body, state);
}

const fn: Fn = { name: 'f', body: [{ kind: 'a' }, { kind: 'drop' }, { kind: 'b' }] };
visitFunction(fn, new Rewriter(), 2);
check('rewritten', fn.body.map((s) => s.kind).join(','), 'a,b,added,added');
check('length', fn.body.length, 4);
console.log('ok');
