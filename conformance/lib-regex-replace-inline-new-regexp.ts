// s.replace(new RegExp(…, 'g'), …) written inline replaces every match, as
// does a RegExp from a call or with flags computed at run time
const name = 'Kind';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const all = 'func(Kind) Kind'.replace(new RegExp(`\\b${escape(name)}\\b`, 'g'), 'string');
assert(all === 'func(string) string', `inline new RegExp with g: ${all}`);
const first = 'func(Kind) Kind'.replace(new RegExp(`\\b${escape(name)}\\b`), 'string');
assert(first === 'func(string) Kind', `inline new RegExp without g: ${first}`);
const literalPattern = 'a.a.a'.replace(new RegExp('\\.', 'g'), '-');
assert(literalPattern === 'a-a-a', `inline new RegExp, literal pattern: ${literalPattern}`);
const makeRe = (flags: string) => new RegExp(`${name}\\b`, flags);
assert('Kind Kind'.replace(makeRe('g'), 'K') === 'K K', 'a call returning a global RegExp');
assert('Kind Kind'.replace(makeRe(''), 'K') === 'K Kind', 'a call returning a non-global RegExp');
let calls = 0;
const counted = () => {
  calls++;
  return new RegExp(`\\b${name}`, 'g');
};
assert('Kind Kind'.replace(counted(), (m) => m.toLowerCase()) === 'kind kind', 'a callback replacer, global from a call');
assert(calls === 1, `the RegExp expression is evaluated once: ${calls}`);
const flags = ['g', 'i'].join('');
assert('kind KIND'.replace(new RegExp(name, flags), 'x') === 'x x', 'flags computed at run time');
console.log('ok');
