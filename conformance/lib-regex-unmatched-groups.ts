// A regex match's unmatched group is undefined (TypeScript types it string):
// kept through a const, a conditional and a string field of an interface,
// which JSON.stringify then leaves out; xs[i] past the end into any
interface Def {
  type: 'def';
  href: string;
  title: string;
}

function def(src: string): Def | undefined {
  const cap = /^\[\w+\]: (\S+)(?: "([^"]*)")?/.exec(src);
  if (cap) {
    const title = cap[2] ? cap[2].toUpperCase() : cap[2];
    return { type: 'def', href: cap[1], title };
  }
  return undefined;
}

const plain = def('[a]: /url')!;
assert(plain.title === undefined, 'unmatched group through a const');
assert(JSON.stringify(plain) === '{"type":"def","href":"/url"}', 'undefined field left out');
const titled = def('[a]: /url "t"')!;
assert(titled.title === 'T' && JSON.stringify(titled) === '{"type":"def","href":"/url","title":"T"}', 'matched group');
const empty = def('[a]: /url ""')!;
assert(empty.title === '' && JSON.stringify(empty) === '{"type":"def","href":"/url","title":""}', 'empty group is a string');

function direct(src: string): Def {
  const m = /(a)|(b)/.exec(src)!;
  return { type: 'def', href: m[0], title: m[2] };
}
assert(direct('a').title === undefined && direct('b').title === 'b', 'group straight into the field');

const words: string[] = ['x', 'y'];
const past: any = words[5];
const inRange: any = words[1];
assert(past === undefined && inRange === 'y', 'element past the end into any');
const m2 = /(x)?y/.exec('y')!;
const group: unknown = m2[1];
assert(group === undefined && typeof group === 'undefined', 'unmatched group into unknown');
