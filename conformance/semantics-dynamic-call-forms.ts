// Dynamic calls with spread arguments and element-access callees; a value where a
// boolean is expected; [...generator()]; push(...dynamic)
function exec(fn: Function, args: any[]) { return fn(...args); }
const g: any = { add: (a: number, b: number) => a + b };
function unescape(str: string, isQuoted: boolean): string { return isQuoted ? str.toUpperCase() : str; }
function* split(s: string) { for (const p of s.split(',')) yield p.trim(); }
class Ev { constructor(public n: string) {} }
class El { outputs = [new Ev('click')]; }
class Comp { outputs = [new Ev('focus'), new Ev('blur')]; }
const hoisted = { outputs: [] as Ev[] };
for (const node of [new El(), new Comp()] as (El | Comp)[]) hoisted.outputs.push(...node.outputs);
const quote: string = '"';
const text = [exec((a: number, b: number) => a * b, [3, 4]), g['add'](1, 2), unescape('k', quote as any), unescape('k', '' as any), [...split('a, b,c')].length, hoisted.outputs.map((e) => e.n).join(',')].join(' ');
console.log(text);
assert(text === '12 3 K k 3 click,focus,blur', 'dynamic calls');
