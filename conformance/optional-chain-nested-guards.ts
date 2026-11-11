// a?.b.c?.d: the first guard covers the whole rest of the chain, including the
// links after a later ?. (the React Compiler's lvalue?.identifier.name?.kind)
type Name = { kind: string; value: string };
type Identifier = { id: number; name: Name | null };
type Place = { identifier: Identifier };

function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function isNamed(lvalue: Place | null): boolean {
  return lvalue?.identifier.name?.kind === 'named';
}

function nameValue(lvalue: Place | null): string | undefined {
  return lvalue?.identifier.name?.value;
}

const named: Place = { identifier: { id: 1, name: { kind: 'named', value: 'x' } } };
const unnamed: Place = { identifier: { id: 2, name: null } };

check('named', isNamed(named), true);
check('unnamed', isNamed(unnamed), false);
check('null place', isNamed(null), false);
check('value', nameValue(named), 'x');
check('value unnamed', nameValue(unnamed), undefined);
check('value null', nameValue(null), undefined);
const id = ((p: Place | null) => p?.identifier.id)(null);
check('id null', id, undefined);
console.log('ok');
