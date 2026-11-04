// Generic functions with structural constraints (T extends { m(): R }): members read dynamically
class Lit { constructor(public v: number) {} isEquivalent(o: Lit): boolean { return o.v === this.v; } }
function nullSafeIsEquivalent<T extends { isEquivalent(other: T): boolean }>(base: T | null, other: T | null) {
  if (base == null || other == null) return base == other;
  return base.isEquivalent(other);
}
function areAllEquivalentPredicate<T>(base: T[], other: T[], pred: (a: T, b: T) => boolean) {
  if (base.length !== other.length) return false;
  for (let i = 0; i < base.length; i++) if (!pred(base[i], other[i])) return false;
  return true;
}
function areAllEquivalent<T extends { isEquivalent(other: T): boolean }>(base: T[], other: T[]) {
  return areAllEquivalentPredicate(base, other, (a: T, b: T) => a.isEquivalent(b));
}
const a = [new Lit(1), new Lit(2)];
const text = [nullSafeIsEquivalent(new Lit(1), new Lit(1)), nullSafeIsEquivalent<Lit>(null, null), nullSafeIsEquivalent(new Lit(1), null), areAllEquivalent(a, [new Lit(1), new Lit(2)]), areAllEquivalent(a, [new Lit(3), new Lit(2)])].join(' ');
console.log(text);
assert(text === 'true true false true false', 'structural constraints');
