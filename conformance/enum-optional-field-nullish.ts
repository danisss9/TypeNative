// An optional string-enum field that is unset falls back with ?? (the React
// Compiler's signature.returnValueReason ?? ValueReason.Other)
enum ValueReason {
  Global = 'global',
  JsxCaptured = 'jsx-captured',
  Other = 'other',
}

type Signature = { positionalParams: number[]; returnValueReason?: ValueReason };

function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function reasonOf(signature: Signature): ValueReason {
  const reason = signature.returnValueReason ?? ValueReason.Other;
  return reason;
}

check('unset', reasonOf({ positionalParams: [] }), ValueReason.Other);
check('set', reasonOf({ positionalParams: [], returnValueReason: ValueReason.Global }), ValueReason.Global);
const sig: Signature = { positionalParams: [1] };
check('inline', `${sig.returnValueReason ?? ValueReason.JsxCaptured}`, 'jsx-captured');
console.log('ok');
