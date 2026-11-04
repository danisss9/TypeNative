// A generic function's type parameter used by a callback parameter ((value: T) => R)
class Lit { constructor(public value: unknown, public type: string | null = null) {} }
function literal(value: unknown, type?: string | null, span?: number | null): Lit { return new Lit(value, type ?? null); }
function toOptionalLiteralArray<T>(values: T[] | null, mapper: (value: T) => Lit): Lit[] | null {
  if (values === null || values.length === 0) return null;
  return values.map((value) => mapper(value));
}
function firstWhere<T>(xs: T[], pred: (x: T) => boolean): T | undefined { for (const x of xs) if (pred(x)) return x; return undefined; }
interface Decl { kind: number; name: string }
const styles: string[] = ['a', 'b'];
const decls: Decl[] = [{ kind: 1, name: 'x' }, { kind: 2, name: 'y' }];
const r1 = toOptionalLiteralArray(styles, literal);
const r2 = toOptionalLiteralArray(decls, (decl) => { switch (decl.kind) { case 1: return literal('dir:' + decl.name); default: return literal('pipe:' + decl.name); } });
const r3 = toOptionalLiteralArray([] as number[], literal);
const found = firstWhere(decls, (d) => d.kind === 2);
const n: number | undefined = firstWhere([1, 2, 3], (x) => x > 1);
const text = [r1!.map((l) => l.value).join(','), r2!.map((l) => l.value).join(','), r3 === null, found?.name, n].join(' ');
console.log(text);
assert(text === 'a,b dir:x,pipe:y true y 2', 'callbacks over T');
