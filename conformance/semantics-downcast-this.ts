// conformance-flags: --no-typecheck
// Downcasts of this / a base-typed value to a subclass (TypeScript rejects the cast of this, so no type-check)
class Tok {
  constructor(public type: number) {}
  isStr(): boolean { return this.type === 1; }
  isEnd(): this is StrTok { return this.isStr() && (this as StrTok).kind === 2; }
}
class StrTok extends Tok {
  constructor(readonly kind: number) { super(1); }
}
const a: Tok = new StrTok(2);
const b: Tok = new Tok(1);
assert(a.isEnd() && !b.isEnd(), 'downcast of this');
function kindOf(t: Tok): number { return t.isStr() ? (t as StrTok).kind : -1; }
assert(kindOf(a) === 2, 'downcast of a parameter');
