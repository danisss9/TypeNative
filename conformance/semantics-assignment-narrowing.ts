// A nullable primitive is narrowed by the assignment of a value, a literal
// index by a null check; `undefined!` / `null!` placeholders take the zero value
enum Kind {
  A,
  B
}
function describe(raw: string, flag: boolean): string {
  let kind: Kind = undefined!;
  let list: number[] = undefined!;
  let name: string | null = null;
  const parts = raw.split('.');
  if (parts.length > 1) {
    name = parts.slice(1).join('.');
    const idx = name.indexOf(':');
    if (idx > -1) {
      const ns = name.substring(0, idx);
      name = ns + '!' + name.substring(idx + 1);
    }
    kind = Kind.B;
    list = [1, 2];
  } else {
    kind = Kind.A;
    list = [];
  }
  let count: number | null = 3;
  count = count * 2;
  const m: (string | null)[] = [raw, flag ? null : 'Q'];
  const phase = m[1] === null ? 'none' : m[1].toLowerCase();
  return `${kind} ${list.length} ${name ?? '-'} ${phase} ${count}`;
}
console.log(describe('a.b:c', true));
console.log(describe('abc', false));
assert(describe('a.b:c', true) === '1 2 b!c none 6', 'narrowed by assignment');
assert(describe('abc', false) === '0 0 - q 6', 'not assigned');
