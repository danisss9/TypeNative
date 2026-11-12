// A function telling null and undefined apart (=== null, then === undefined)
// sees an unset value as undefined, not null (the React Compiler's
// codegenValue: a bare `return` is undefined, printed `return;`)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

type Primitive = { kind: 'Primitive'; value: boolean | number | string | null | undefined };

function describe(value: boolean | number | string | null | undefined): string {
  if (typeof value === 'number') return 'number';
  else if (typeof value === 'string') return 'string';
  else if (value === null) return 'null';
  else if (value === undefined) return 'undefined';
  return 'boolean';
}

const values: Primitive[] = [
  { kind: 'Primitive', value: null },
  { kind: 'Primitive', value: undefined },
  { kind: 'Primitive', value: 1 },
  { kind: 'Primitive', value: 'x' },
  { kind: 'Primitive', value: true },
];
check('kinds', values.map((p) => describe(p.value)).join(','), 'null,undefined,number,string,boolean');
const bare: Primitive = { kind: 'Primitive', value: undefined };
check('unset field', describe(bare.value), 'undefined');
check('omitted argument', describe(undefined), 'undefined');
check('null argument', describe(null), 'null');

// (an object literal with no declared type holding null — BuildHIR's
// { kind: 'Primitive', value: null } — keeps it null)
function lowerLiteral(kind: string) {
  if (kind === 'null') return { kind: 'Primitive', value: null, loc: 1 };
  return { kind: 'Primitive', value: undefined, loc: 2 };
}
check('literal null', describe(lowerLiteral('null').value), 'null');
check('literal undefined', describe(lowerLiteral('void').value), 'undefined');
console.log('ok');
