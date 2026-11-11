// Map.get of a missing key is undefined for maps of non-nullable values too
// (a string enum, a string, a number): ?? falls back and === undefined holds
// (the React Compiler's const knownKind = valueKinds.get(id); knownKind ?? Kind.Local)
enum Kind {
  A = 'A',
  B = 'B',
}

function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

const kinds = new Map<number, Kind>();
kinds.set(1, Kind.A);
const strings = new Map<number, string>();
strings.set(1, '');
const numbers = new Map<number, number>();
numbers.set(1, 0);

function kindOf(id: number): Kind {
  const known = kinds.get(id);
  return known ?? Kind.B;
}

function joined(id: number): string {
  const known = kinds.get(id);
  return [known ?? Kind.B, Kind.A].join('');
}

function stringMissing(id: number): boolean {
  const s = strings.get(id);
  return s === undefined;
}

check('enum hit', kindOf(1), Kind.A);
check('enum miss', kindOf(2), Kind.B);
check('enum miss in call', joined(2), 'BA');
check('string hit (empty)', strings.get(1) ?? 'dflt', '');
check('string miss', strings.get(2) ?? 'dflt', 'dflt');
check('string === undefined (hit)', stringMissing(1), false);
check('string === undefined (miss)', stringMissing(3), true);
check('number hit (zero)', numbers.get(1) ?? -1, 0);
check('number miss', numbers.get(2) ?? -1, -1);
console.log('ok');
