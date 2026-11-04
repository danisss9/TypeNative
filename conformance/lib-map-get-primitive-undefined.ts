// const v = m.get(k) / rec[k] of a Map / record holding numbers / strings,
// tested against undefined: a missing key is undefined, a stored 0 / '' is a value
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const usages = new Map<number, number>([[1, 0]]);

function bump(k: number): string {
  const count = usages.get(k);
  if (count === undefined) return 'none';
  usages.set(k, count + 1);
  return String(usages.get(k));
}

function classify(m: Map<number, number>, k: number): string {
  const count = m.get(k);
  if (count === undefined) {
    return 'none';
  } else if (count === 0) {
    return 'zero';
  }
  return 'n' + count;
}

function label(names: Map<string, string>, key: string): string {
  const name = names.get(key);
  return name !== undefined ? `[${name}]` : 'missing';
}

assert(bump(1) === '1', 'stored zero is bumped');
assert(bump(2) === 'none', 'missing key is undefined');
assert(classify(usages, 1) === 'n1', 'present count');
assert(classify(usages, 3) === 'none', 'missing count');
assert(classify(new Map([[5, 0]]), 5) === 'zero', 'stored zero');
const names = new Map<string, string>([['a', ''], ['b', 'bee']]);
assert(label(names, 'a') === '[]', 'empty string is a value');
assert(label(names, 'b') === '[bee]', 'string value');
assert(label(names, 'c') === 'missing', 'missing string');

function i18nAttrs(attrs: string[], metas: string[]): string[] {
  const attrsMeta: { [key: string]: string } = {};
  for (const m of metas) attrsMeta[m.split('=')[0]] = m.split('=')[1] ?? '';
  const out: string[] = [];
  for (const name of attrs) {
    const meta = attrsMeta[name];
    if (meta !== undefined) out.push(`${name}:${meta}`);
  }
  return out;
}
assert(i18nAttrs(['id', 'title', 'alt'], ['title=m|d', 'alt']).join(',') === 'title:m|d,alt:', i18nAttrs(['id', 'title', 'alt'], ['title=m|d', 'alt']).join(','));
console.log('ok');
