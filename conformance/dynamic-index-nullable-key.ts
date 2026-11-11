// conformance-flags: --no-typecheck
// A key held in a variable declared without a value (let uid; — nullable
// until set) indexes a dynamic object by its value (Babel's generateUid:
// program.references[uid] = true)
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

class Scope {
  references: any = Object.create(null);
  uids: any = Object.create(null);

  generateUid(name: string): string {
    let uid;
    let i = 0;
    do {
      uid = `_${name}`;
      if (i >= 1) uid += i + 1;
      i++;
    } while (this.uids[uid]);
    this.references[uid] = true;
    this.uids[uid] = true;
    return uid;
  }
}

const scope = new Scope();
check('first', scope.generateUid('temp'), '_temp');
check('second', scope.generateUid('temp'), '_temp2');
check('third', scope.generateUid('temp'), '_temp3');
check('recorded', scope.references._temp2, true);
check('keys', Object.keys(scope.uids).join(','), '_temp,_temp2,_temp3');
console.log('ok');
