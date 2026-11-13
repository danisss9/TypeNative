// An unmatched regex group (undefined) stored in a string field of an
// interface declared in a namespace of types in another module: the field
// keeps the undefined, which JSON.stringify leaves out (marked's def token)
import type { Tokens } from './namespace-types-helper.ts';
function def(src: string): Tokens.Def | undefined {
  const cap = /^\[(\w+)\]:\s*(\S+)(?:\s+("[^"]*"))?/.exec(src);
  if (cap) {
    const title = cap[3] ? cap[3].substring(1, cap[3].length - 1) : cap[3];
    return { type: 'def', href: cap[2], title };
  }
}
const plain = def('[foo]: /url');
const titled = def('[foo]: /url "hi"');
assert(JSON.stringify(plain) === '{"type":"def","href":"/url"}', `untitled def: ${JSON.stringify(plain)}`);
assert(plain?.title === undefined, 'untitled def title is undefined');
assert(JSON.stringify(titled) === '{"type":"def","href":"/url","title":"hi"}', `titled def: ${JSON.stringify(titled)}`);
console.log(JSON.stringify([plain, titled]));
