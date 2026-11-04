// Spreading records of different value types; chained Map.set
class BoundText { constructor(public v: string) {} }
class Text { constructor(public t: string) {} }
const vars: { [name: string]: BoundText } = { a: new BoundText('x') };
const placeholders: { [name: string]: Text | number } = { b: new Text('y'), c: 3 };
const out: string[] = [];
for (const [placeholder, text] of Object.entries({ ...vars, ...placeholders })) {
  if (text instanceof BoundText) out.push(placeholder + '=b:' + text.v);
  else if (text instanceof Text) out.push(placeholder + '=t:' + text.t);
  else out.push(placeholder + '=' + text);
}
const ctx = new Map<string, string>();
ctx.set('$index', 'i').set('idx', 'i');
const text = out.join(',') + ' ' + [...ctx.keys()].join(',');
console.log(text);
assert(text === 'a=b:x,b=t:y,c=3 $index,idx', 'record spread and chained set');
