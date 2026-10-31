// Object.assign keeps the type it copies: a typed target is updated in place,
// Object.assign({}, typed, { overrides }) is a copy of the same type (its
// methods and function fields too), and an explicit undefined override clears
interface Tag {
  tag: string;
  default?: boolean;
  test?: (s: string) => boolean;
  resolve: (s: string) => string;
}
interface Other {
  tag: string;
  collection: string;
}
const kt: Tag = { tag: 'x', default: true, test: (s) => s === 'a', resolve: (s) => s + '!' };
const copy = Object.assign({}, kt, { default: false, test: undefined });
assert(copy.tag === 'x' && copy.default === false, 'overrides set');
assert(copy.test === undefined, 'explicit undefined clears the field');
assert(copy.resolve('q') === 'q!', 'function fields are copied');
assert(kt.default === true && kt.test?.('a') === true, 'the source is untouched');

// (where any value fits, the copy keeps the source's runtime type)
const known: Record<string, Tag | Other> = { x: kt };
const tags: Array<Tag | Other> = [];
const found = known['x'];
if (found && !('collection' in found)) {
  tags.push(Object.assign({}, found, { default: false }));
  const t = tags[0] as Tag;
  assert(t.resolve('z') === 'z!' && t.default === false, 'dynamic copy of a typed value');
}
const plain: unknown[] = [];
plain.push(Object.assign({}, JSON.parse('{"a":1}'), { b: 2 }));
assert(JSON.stringify(plain) === '[{"a":1,"b":2}]', 'dynamic copy of a plain object');

class Point {
  x = 0;
  y = 0;
  norm() {
    return Math.abs(this.x) + Math.abs(this.y);
  }
}
const p = Object.assign(new Point(), { x: 3, y: -4 });
assert(p instanceof Point && p.norm() === 7, 'a class target is updated and returned');
console.log(copy.tag, copy.default, p.norm());
