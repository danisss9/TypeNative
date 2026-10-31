// A mutating array method on an array reached through any (unshift, push,
// splice on token.tokens) changes the array its other holders see, as they
// share it in JS; an absent array field is left out of JSON
interface Token {
  type: string;
  text: string;
  tokens?: Token[];
}
const item: Token = { type: 'item', text: 'a', tokens: [{ type: 'text', text: 'a' }] };
const list: Token[] = [item];
const queue: { tokens: Token[] }[] = [{ tokens: item.tokens! }];
const loose: any = list[0];
loose.tokens.unshift({ type: 'checkbox', text: '' });
assert(item.tokens!.length === 2 && item.tokens![0].type === 'checkbox', 'unshift through any');
assert(queue[0].tokens.length === 2, 'the queue sees it');
loose.tokens.push({ type: 'text', text: 'b' });
loose.tokens.splice(1, 1);
assert(item.tokens!.map((t) => t.text).join(',') === ',b', `push and splice: ${item.tokens!.map((t) => t.text).join(',')}`);
const plain: Token = { type: 'space', text: '' };
assert(JSON.stringify(plain) === '{"type":"space","text":""}', 'absent array field left out');

// An optional item's array, absent: ?.[i] is undefined (and String() of it
// 'undefined'); an
// array of one element type passed where a union element type is expected
interface Source { kind: 'src'; text: string }
interface Other { kind: 'other' }
type Any = Source | Other;
interface Item { start: Source[]; sep?: Source[] }
function first(before: Any[] | undefined): string {
  return before && before.length > 0 ? before[0].kind : 'none';
}
const items: Item[] = [{ start: [{ kind: 'src', text: 'a' }] }, { start: [], sep: [{ kind: 'src', text: 'b' }] }];
const seen: string[] = [];
for (const { start, sep } of items) {
  seen.push(String(sep?.[0]?.text), String(sep ? sep.length : -1), first(start), first(sep));
}
assert(seen.join(',') === 'undefined,-1,src,none,b,1,none,src', `optional reads: ${seen.join(',')}`);
const fallbacks = items.map(({ sep }) => (sep ?? []).length + (sep || []).length);
assert(fallbacks.join(',') === '0,2', `?? and || on an absent array: ${fallbacks.join(',')}`);
