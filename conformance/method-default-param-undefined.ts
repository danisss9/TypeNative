// A method's default parameter applies when the argument is undefined —
// passed explicitly, or an optional parameter forwarded on unset (Babel's
// generateUidIdentifier(name?) → generateUid(name = "temp"), called with
// name ?? undefined by the React Compiler)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

class Scope {
  generateUidIdentifier(name?: string): string {
    return this.generateUid(name);
  }

  generateUid(name: string = 'temp'): string {
    return `_${name}`;
  }

  count(n: number = 7): number {
    return n;
  }
}

function forward(scope: Scope, name: string | null): string {
  return scope.generateUidIdentifier(name ?? undefined);
}

const s = new Scope();
check('no argument', s.generateUid(), '_temp');
check('explicit undefined', s.generateUid(undefined), '_temp');
check('given', s.generateUid('x'), '_x');
check('forwarded unset', s.generateUidIdentifier(), '_temp');
check('forwarded set', s.generateUidIdentifier('y'), '_y');
check('null coalesced', forward(s, null), '_temp');
check('null coalesced set', forward(s, 'z'), '_z');
check('empty string kept', s.generateUid(''), '_');
check('number default', s.count(undefined), 7);
check('number zero kept', s.count(0), 0);
console.log('ok');
