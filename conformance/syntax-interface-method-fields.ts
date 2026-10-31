// Interfaces mixing data and methods: object literals implement the methods
// (method shorthand or arrow properties, contextually typed), optional
// function fields can be absent, and an extending interface adds its own
interface Base {
  tag: string;
  format?: string;
}
interface Tag extends Base {
  default?: boolean;
  resolve(value: string, onError: (msg: string) => void): unknown;
  test?: (s: string) => boolean;
}
const errors: string[] = [];
const int: Tag = { tag: 'int', resolve: (v) => Number(v), test: (s) => /^\d+$/.test(s) };
const str: Tag = {
  tag: 'str',
  default: true,
  resolve(v, onError) {
    if (!v) onError('empty');
    return v;
  }
};
const tags: Tag[] = [int, str];
const out = tags.map((t) => `${t.tag}:${t.default}:${t.format}:${t.resolve('42', (m) => errors.push(m))}:${t.test ? t.test('7') : 'none'}`);
assert(out.join(' ') === 'int:undefined:undefined:42:true str:true:undefined:42:none', 'fields and methods');
str.resolve('', (m) => errors.push(m));
assert(errors.join() === 'empty', 'a callback through a method');
console.log(out.join(' '), errors);
