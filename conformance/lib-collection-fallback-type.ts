// m.get(k) || new Set() / ?? new Map(): the new collection takes the type
// of the one it stands in for
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

class Op {
  constructor(public target: number, public name: string) {}
}

function dedupe(ops: Op[]): string[] {
  const seen = new Map<number, Set<string>>();
  const kept: string[] = [];
  for (const op of ops) {
    const seenForElement = seen.get(op.target) || new Set();
    if (!seenForElement.has(op.name)) kept.push(`${op.target}:${op.name}`);
    seenForElement.add(op.name);
    seen.set(op.target, seenForElement);
  }
  return kept;
}

function count(words: string[]): string {
  const byLength = new Map<number, Map<string, number>>();
  for (const word of words) {
    const counts = byLength.get(word.length) ?? new Map();
    counts.set(word, (counts.get(word) ?? 0) + 1);
    byLength.set(word.length, counts);
  }
  return [...byLength.entries()].map(([n, m]) => `${n}=${[...m.entries()].map(([w, c]) => `${w}${c}`).join('/')}`).join(' ');
}

const ops = [new Op(1, 'class'), new Op(1, 'style'), new Op(1, 'class'), new Op(2, 'class')];
assert(dedupe(ops).join(',') === '1:class,1:style,2:class', dedupe(ops).join(','));
assert(count(['ab', 'cd', 'ab', 'xyz']) === '2=ab2/cd1 3=xyz1', count(['ab', 'cd', 'ab', 'xyz']));
console.log('ok');
