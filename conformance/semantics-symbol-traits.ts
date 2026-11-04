// Symbol-keyed trait markers across modules; an intersection with a union is any value
import * as ir from './symbol-traits-helper';
class Expr { constructor(public kind: number) {} }
class PureFn extends Expr implements ir.ConsumesVarsTrait {
  readonly [ir.ConsumesVarsTrait] = true;
  constructor(public args: number) { super(1); }
}
class Plain extends Expr {}
interface OpA { kind: 1; expression: string }
interface OpB { kind: 2; expression: string; extra: number }
type Op = OpA | OpB;
function varsUsedByOp(op: Op & ir.ConsumesVarsTrait): number {
  switch (op.kind) { case 1: return op.expression.length; default: return 100; }
}
const exprs: Expr[] = [new PureFn(3), new Plain(2)];
const opWithTrait = { kind: 1 as const, expression: 'abc', ...ir.TRAIT_CONSUMES_VARS };
const flags = [exprs.map((e) => ir.hasConsumesVarsTrait(e)).join(","), ir.hasConsumesVarsTrait(opWithTrait), varsUsedByOp(opWithTrait)].join(" ");
const used: number[] = [];
type AnyExpr = PureFn | Plain;
function varsUsed(expr: AnyExpr & ir.ConsumesVarsTrait): number { return expr instanceof PureFn ? expr.args : 0; }
for (const e of exprs) if (ir.hasConsumesVarsTrait(e)) used.push(varsUsed(e as AnyExpr & ir.ConsumesVarsTrait));
console.log(flags, used.join(','));
assert(flags === 'true,false true 3' && used.join(',') === '3', 'traits');
