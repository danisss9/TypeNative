// x instanceof C && x.f narrows x.f; key in record with a dynamic key; typeof console?.warn
class Node0 { constructor(public span: number) {} }
class Comment extends Node0 { constructor(public value: string | null, span: number) { super(span); } }
class Text extends Node0 { constructor(public text: string, span: number) { super(span); } }
function isOpening(n: Node0): boolean { return !!(n instanceof Comment && n.value && n.value.startsWith('i18n')); }
const nodes: Node0[] = [new Comment('i18n: x', 1), new Comment(null, 2), new Text('i18n', 3), new Comment('other', 4)];
const known: { [k: string]: string } = { title: 'T' };
const attrs: Node0[] = [new Text('title', 1), new Text('alt', 2)];
const found: string[] = [];
attrs.forEach((a) => { if ((a as Text).text in known) found.push(known[(a as Text).text]); });
const text = [nodes.map(isOpening).join(','), found.join(','), typeof console?.warn].join(' ');
console.log(text);
assert(text === 'true,false,false,false T function', 'narrowing chain');
