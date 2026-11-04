const $EOF = 0;
const obs$ = [1, 2];
class Ctx { $implicit = 'row'; }
function $wrap(x: number): number { return x + $EOF; }
const ctx = new Ctx();
assert($wrap(3) === 3 && obs$.length === 2 && ctx.$implicit === 'row' && JSON.stringify(ctx) === '{"$implicit":"row"}', 'dollar identifiers');

// the FESM bundler's `let X$2 = class X { … }` dedupe form, subclassed and
// referenced in value positions
let _Visitor$2 = class _Visitor {
  greet(): string {
    return 'hello';
  }
};
class SubVisitor extends _Visitor$2 {}
const instance = new _Visitor$2();
const sub = new SubVisitor();
assert(instance.greet() === 'hello', 'class expression with a $ name');
assert(sub.greet() === 'hello', 'subclass of a $-named class');

// property keys and string content keep their `$` text
const bag: Record<string, number> = {};
bag['$event'] = 5;
assert(bag['$event'] === 5, 'a $ property key keeps its name');
const named = { $index: 1, plain: 2 };
assert(named['$index'] === 1 && named.plain === 2, 'a $ object key keeps its name');

function localDollars(): string {
  const $tmp = 'local';
  return $tmp;
}
assert(localDollars() === 'local', 'a local $ name');
