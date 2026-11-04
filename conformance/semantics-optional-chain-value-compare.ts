// a?.items.length === 0 is false when a is unset (undefined is not 0)
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Message {
  constructor(public legacyIds: string[], public text: string) {}
}

class Placeholder {
  constructor(public name: string, public associated?: Message) {}
}

function meta(p: Placeholder): string {
  let block = p.name;
  if (p.associated?.legacyIds.length === 0) block += '@@computed';
  if (p.associated?.text !== 'skip') block += '!';
  return block;
}

assert(meta(new Placeholder('PH')) === 'PH!', meta(new Placeholder('PH')));
assert(meta(new Placeholder('ICU', new Message([], 'x'))) === 'ICU@@computed!', meta(new Placeholder('ICU', new Message([], 'x'))));
assert(meta(new Placeholder('ICU', new Message(['legacy'], 'skip'))) === 'ICU', meta(new Placeholder('ICU', new Message(['legacy'], 'skip'))));
console.log('ok');
