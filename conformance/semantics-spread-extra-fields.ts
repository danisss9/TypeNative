// Fields an object literal gets from a spread its declared type lacks stay on the value
import * as ir from './symbol-traits-helper';
interface Op { kind: number; prev: Op | null; }
interface TextOp extends Op { target: number; }
const TRAIT: ir.ConsumesVarsTrait = { [ir.ConsumesVarsTrait]: true } as const;
const NEW_OP: Pick<Op, 'prev'> = { prev: null };
function create(t: number): TextOp { return { kind: 3, target: t, ...TRAIT, ...NEW_OP }; }
const ops: (TextOp | Op)[] = [create(1), { kind: 1, prev: null }];
const text = ops.map((o) => ir.hasConsumesVarsTrait(o)).join(',') + ' ' + create(2).target;
console.log(text);
assert(text === 'true,false 2', 'spread trait kept');
