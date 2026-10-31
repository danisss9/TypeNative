// A string | null field holds a string, null or undefined (an absent value
// JSON.stringify leaves out, a null it writes); `x || null` and a ternary
// with a null branch store null; an any receiver's .apply and a field read
// with a computed key
interface Link {
  href: string;
  title?: string | null;
}
function link(href: string, title?: string): Link {
  return { href, title: title || null };
}
assert(JSON.stringify(link('/a')) === '{"href":"/a","title":null}', 'x || null stores null');
assert(JSON.stringify(link('/a', 't')) === '{"href":"/a","title":"t"}', 'or the string');
const bare: Link = { href: '/b' };
assert(bare.title === undefined && JSON.stringify(bare) === '{"href":"/b"}', 'absent stays undefined');
const picked: Link = { href: '/c', title: bare.href ? null : 'x' };
assert(picked.title === null && JSON.stringify(picked) === '{"href":"/c","title":null}', 'null branch of a conditional');
const fields: any = { a: 1, b: 'two' };
const key = ['a', 'b'][1];
assert(fields[key] === 'two' && typeof fields[key] === 'string', 'computed key on any');
function sum(this: unknown, ...xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0);
}
const f: any = sum;
assert(f.apply(null, [1, 2, 3]) === 6, 'apply on a function value');

// A required string | null field: null is written as null, a string as is,
// and the field narrows to string after a check
interface Image {
  src: string;
  title: string | null;
}
function image(src: string, title?: string): Image {
  return { src, title: title || null };
}
assert(JSON.stringify(image('a.png')) === '{"src":"a.png","title":null}', 'required null written');
const titled: Image = image('b.png', 'B');
const caption: string = titled.title ?? 'none';
assert(JSON.stringify(titled) === '{"src":"b.png","title":"B"}' && caption.toLowerCase() === 'b', 'required string');
