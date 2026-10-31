// Object types: generic interfaces used without type arguments (their
// parameters are erased), interfaces extending Omit<> / Pick<> / Partial<>,
// an open object type ({ [k: string]: any; … }), a type with call signatures
// declared in a function, and an array type with properties of its own
interface Ext<P = string> { async?: boolean; silent?: boolean; hooks?: P | null; walk?: (() => void) | null }
interface Opts<P = string> extends Omit<Ext<P>, 'hooks' | 'walk'> { hooks?: string | null; gfm?: boolean }
interface Picked extends Pick<Ext, 'silent'>, Partial<{ depth: number }> { name: string }
function defaults<P = string>(): Opts<P> {
  return { async: false, silent: false, hooks: null, gfm: true };
}
let current: Opts<any> = defaults();
function change<P>(o: Opts<P>) {
  current = o;
}
change({ ...current, silent: true });
assert(current.silent === true && current.gfm === true && current.async === false, 'Omit<> heritage keeps the other fields');
const picked: Picked = { name: 'p', silent: true, depth: 2 };
assert(picked.silent === true && picked.depth === 2, 'Pick<> / Partial<> heritage');

interface Generic { [index: string]: any; type: string; raw: string }
const tokens: Generic[] = [{ type: 'text', raw: 'a', text: 'A' }, { type: 'code', raw: 'b', lang: 'js' }];
assert(tokens[0].text === 'A' && tokens[1].lang === 'js', 'an open object type holds any property');

function makeParse() {
  type Parse = {
    (src: string, opts: { async: true }): Promise<string>;
    (src: string, opts?: { async?: boolean } | null): string | Promise<string>;
  };
  const parse: Parse = (src: string, opts?: { async?: boolean } | null): any => {
    if (opts?.async) return Promise.resolve(src);
    return src.toUpperCase();
  };
  return parse;
}
assert(makeParse()('md') === 'MD', 'a local callable type');

type TokensList = Generic[] & { links: Record<string, string> };
const list = [] as unknown as TokensList;
list.links = Object.create(null);
list.push({ type: 'def', raw: '[a]: /u' });
list.links['a'] = '/u';
function count(xs: Generic[]): number {
  xs.push({ type: 'space', raw: '' });
  return xs.length;
}
assert(count(list) === 2 && list.length === 2 && list.links.a === '/u', 'T[] & { … }: an array with properties');
assert(JSON.stringify(list.slice(0, 1)) === '[{"type":"def","raw":"[a]: /u"}]' && JSON.stringify(list).startsWith('[{'), `JSON of the array: ${JSON.stringify(list)}`);
