// Names that are Go keywords, builtins or predeclared types work as TS identifiers and members
function f(string: string, bool: boolean, int32: number): string {
  const s: string = string;
  return bool ? s + int32 : s;
}
const string = 'top';
let float32 = 1.5;
const len = 2;
assert(f('a', true, 3) + string + float32 + len === 'a3top1.52', 'parameters and variables');

const obj = { string: 'field', bool: true, copy(): number { return 5; } };
assert(obj.string === 'field' && obj.bool && obj.copy() === 5, 'object literal members');

interface Copier { copy(): number; string(): string }
class C implements Copier {
  len = 2;
  copy(): number { return 7; }
  string(): string { return 's'; }
  range(): number { return 1; }
  static uint64(): number { return 64; }
  static make = 3;
}
class D extends C {}
const c = new C();
const k: Copier = c;
assert(c.copy() + c.len + c.range() === 10 && c.string() === 's', 'methods named like builtins and keywords');
assert(k.copy() === 7 && k.string() === 's', 'interface methods');
assert(C.uint64() + C.make + D.uint64() + D.make === 134, 'static members');
