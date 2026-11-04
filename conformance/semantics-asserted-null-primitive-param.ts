// f(x!) of a number | null value, f testing its number parameter against
// null: the assertion is unchecked, so null still arrives as null
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Op {
  constructor(public slot: number | null, public subTemplateIndex: number | null) {}
}

function i18nStart(slot: number, subTemplateIndex: number): string {
  const args = [String(slot)];
  if (subTemplateIndex !== null) {
    args.push(String(subTemplateIndex + 1));
  }
  return args.join(',');
}

const ops = [new Op(1, null), new Op(2, 0), new Op(3, 4)];
const calls = ops.map((op) => i18nStart(op.slot!, op.subTemplateIndex!));
assert(calls.join(' ') === '1 2,1 3,5', calls.join(' '));
console.log('ok');
