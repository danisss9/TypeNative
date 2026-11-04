// A `number | null` parameter stored into an any slot keeps JS null (not
// undefined); a `$`-named field reads through a dynamic value too
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Literal {
  constructor(public value: any) {}
  isNull(): boolean {
    return this.value === null;
  }
  describe(): string {
    return this.value === undefined ? 'undefined' : this.value === null ? 'null' : String(this.value);
  }
}

function literal(value: any): Literal {
  return new Literal(value);
}

function args(slot: number, constIndex: number | null, localRefs?: number): Literal[] {
  const out = [literal(slot), literal(constIndex), literal(localRefs)];
  return out;
}

const lits = args(1, null);
assert(lits.map((l) => l.describe()).join(',') === '1,null,undefined', `described: ${lits.map((l) => l.describe()).join(',')}`);
assert(lits[1].isNull(), 'null param is null');
assert(args(1, 4)[1].describe() === '4', 'set param keeps its value');

interface VarNames {
  $index: Set<string>;
  $implicit: string;
}
interface Op {
  kind: number;
  varNames: VarNames;
}
interface OtherOp {
  kind: number;
}
function check(op: Op | OtherOp, name: string): string {
  if (op.kind === 1) {
    const repeater = op as Op;
    if (repeater.varNames.$index.has(name)) return 'index';
    if (repeater.varNames.$implicit === name) return 'item';
  }
  return 'other';
}
const ops: (Op | OtherOp)[] = [{ kind: 1, varNames: { $index: new Set(['i']), $implicit: 'item' } }, { kind: 2 }];
assert(check(ops[0], 'i') === 'index', '$index read');
assert(check(ops[0], 'item') === 'item', '$implicit read');
assert(check(ops[1], 'i') === 'other', 'other op');
const dynamic: any = ops[0];
assert(dynamic.varNames.$implicit === 'item', 'dynamic $-field read');
console.log('ok');
