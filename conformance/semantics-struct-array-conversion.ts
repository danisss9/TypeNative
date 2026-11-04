// An array of one object shape passed where an array of another (wider) shape is expected
class Lit { constructor(public v: string) {} }
function literalMap(values: { key: string; quoted: boolean; value: unknown }[]): string {
  return values.map((e) => `${e.key}${e.quoted ? '!' : ''}=${e.value instanceof Lit ? e.value.v : String(e.value)}`).join(';');
}
const mapValues: { key: string; value: Lit; quoted: boolean }[] = [];
mapValues.push({ key: 'a', value: new Lit('x'), quoted: false });
mapValues.push({ key: 'b', value: new Lit('y'), quoted: true });
const text = literalMap(mapValues);
console.log(text);
assert(text === "a=x;b!=y", "converted elements");
