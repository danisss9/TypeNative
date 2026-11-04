// a || f where f is a declared function: the function value
type VisitFn = (a: string, b: number) => number;
function noop(_a: string, b: number): number { return b; }
interface Ctx { fn: VisitFn; depth: number }
function make(fn: VisitFn | undefined): Ctx { const ctx: Ctx = { fn: fn || noop, depth: 0 }; return ctx; }
class Attr { constructor(public name: string, public value: string) {} }
const attrs: { [k: string]: string } = {};
const visitAttribute = (attr: Attr) => { attrs[attr.name] = attr.value; };
const list: Attr[] = [new Attr('a', '1'), new Attr('b', '2')];
list.forEach(visitAttribute);
const text = [make(undefined).fn('x', 5), make((a, b) => b * 2).fn('x', 5), JSON.stringify(attrs)].join(' ');
console.log(text);
assert(text === '5 10 {"a":"1","b":"2"}', 'function fallback');
