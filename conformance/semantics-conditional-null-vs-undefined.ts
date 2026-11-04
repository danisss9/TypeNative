// const v = c ? map.get(k) : null: v is null when c is unset, undefined when
// the key is missing; `v === undefined` tells the two apart
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Ref {
  constructor(public name: string) {}
}

const RESOLVERS = new Map<string, Ref>([
  ['window', new Ref('resolveWindow')],
  ['document', new Ref('resolveDocument')],
]);

interface Op {
  target: string | null;
}

function resolve(op: Op): string {
  const resolver = op.target ? RESOLVERS.get(op.target) : null;
  if (resolver === undefined) return `unknown:${op.target}`;
  return resolver === null ? 'none' : resolver.name;
}

function resolveFlipped(op: Op): string {
  const resolver = !op.target ? null : RESOLVERS.get(op.target);
  return resolver !== undefined ? 'known' : 'unknown';
}

assert(resolve({ target: null }) === 'none', 'null target is no resolver');
assert(resolve({ target: 'window' }) === 'resolveWindow', 'window resolves');
assert(resolve({ target: 'body' }) === 'unknown:body', 'missing key is undefined');
assert(resolveFlipped({ target: null }) === 'known', 'flipped: null is not undefined');
assert(resolveFlipped({ target: 'nope' }) === 'unknown', 'flipped: missing key');
console.log('ok');
