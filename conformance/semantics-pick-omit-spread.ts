// Spreading a Pick<T, …> / Omit<T, …> value sets only its own fields
enum OpKind { ListEnd, Text, ElementStart }
class SlotHandle { slot: number | null = null; }
interface Op { kind: OpKind; prev: Op | null; next: Op | null; debugListId: number | null; }
interface ConsumesSlot { handle: SlotHandle; numSlotsUsed: number; }
const TRAIT_CONSUMES_SLOT: Omit<ConsumesSlot, 'handle'> = { numSlotsUsed: 1 };
const NEW_OP: Pick<Op, 'debugListId' | 'prev' | 'next'> = { debugListId: null, prev: null, next: null };
interface ElementStartOp extends Op, ConsumesSlot { tag: string; attributes: number | null; localRefs: string[]; }
function create(tag: string): ElementStartOp {
  return { kind: OpKind.ElementStart, tag, handle: new SlotHandle(), attributes: null, localRefs: [], ...TRAIT_CONSUMES_SLOT, ...NEW_OP };
}
const op = create('div');
const text = [op.kind, op.tag, op.numSlotsUsed, op.prev, op.localRefs.length, op.handle instanceof SlotHandle].join(' ');
console.log(text);
assert(text === '2 div 1  0 true', 'picked fields only');
