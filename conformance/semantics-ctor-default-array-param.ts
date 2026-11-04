// Constructor parameters that are defaulted arrays: a local's or an object field's reference passes through, omitted ones take the default
namespace html { export class Tag { constructor(public text: string) {} } }
class Base { constructor(readonly span: string, readonly i18n?: string) {} }
class El extends Base {
  constructor(
    public name: string,
    public children: string[],
    sourceSpan: string,
    public end: string | null = null,
    readonly isVoid: boolean,
    i18n?: string,
    public comments: html.Tag[] = [],
  ) {
    super(sourceSpan, i18n);
  }
}
function fill(out: html.Tag[]): void { out.push(new html.Tag('t')); }
const comments: html.Tag[] = [];
fill(comments);
const el = new El('a', [], 's', undefined, false, undefined, comments);
assert(el.comments.length === 1, 'x');
function run(): number {
  const comments: html.Tag[] = [];
  fill(comments);
  const el = new El('a', [], 's', undefined, false, undefined, comments);
  return el.comments.length;
}
assert(run() === 1, 'y');
const copy = new El('b', [], 's', undefined, false, undefined, el.comments);
copy.comments.push(new html.Tag('u'));
assert(el.comments.length === 2, 'shared field reference');
const none = new El('c', [], 's', undefined, false, undefined);
assert(none.comments.length === 0, 'default');
