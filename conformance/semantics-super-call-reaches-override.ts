// super.m() whose code calls this.m() again (recursion over a tree): in JS
// that inner call reaches the subclass's override
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

interface Expr {
  kind: string;
  value?: number;
  items?: Expr[];
  index?: number;
}

class KeyFn {
  keyOf(expr: Expr): string {
    if (expr.kind === 'lit') return String(expr.value!);
    if (expr.kind === 'list') return `[${expr.items!.map((item) => this.keyOf(item)).join(',')}]`;
    throw new Error(`${this.constructor.name} does not handle ${expr.kind}`);
  }
}

class ParamKeyFn extends KeyFn {
  override keyOf(expr: Expr): string {
    if (expr.kind === 'param') return `param(${expr.index!})`;
    return super.keyOf(expr);
  }
}

const tree: Expr = { kind: 'list', items: [{ kind: 'lit', value: 1 }, { kind: 'param', index: 0 }, { kind: 'list', items: [{ kind: 'param', index: 1 }] }] };
assert(new ParamKeyFn().keyOf(tree) === '[1,param(0),[param(1)]]', new ParamKeyFn().keyOf(tree));
let message = '';
try {
  new KeyFn().keyOf(tree);
} catch (e) {
  message = (e as Error).message;
}
assert(message === 'KeyFn does not handle param', message);
console.log(new ParamKeyFn().keyOf(tree));
