// Regex groups that don't take part in a match are undefined (not ''), the
// sticky flag matches only at lastIndex, lookarounds keep their captures, and
// replacement strings understand $&, $1, $<name>, $` and $'
const m = /(a)|(b)/.exec('b');
assert(m !== null && m[1] === undefined && m[2] === 'b', 'unmatched group is undefined');
assert(m !== null && m.length === 3 && m.index === 0, 'match shape');
const opt = 'x'.match(/(x)(y)?/);
assert(opt !== null && opt[2] === undefined && opt[1] === 'x', 'optional group');

const sticky = /foo/y;
sticky.lastIndex = 3;
assert(sticky.test('barfoo') && sticky.lastIndex === 6, 'sticky matches at lastIndex');
sticky.lastIndex = 1;
assert(!sticky.test('barfoo') && sticky.lastIndex === 0, 'sticky does not search ahead');

const ahead = /(?=(\d+))\d/.exec('x123');
assert(ahead !== null && ahead[1] === '123', 'lookahead capture');
const behind = /(?<=(\$))\d+/.exec('cost: $42');
assert(behind !== null && behind[0] === '42' && behind[1] === '$', 'lookbehind capture');

assert('a-b'.replace(/(\w)-(\w)/, '$2-$1') === 'b-a', '$n');
assert('abc'.replace(/b/, '[$&]') === 'a[b]c', '$&');
assert('abc'.replace(/b/, "[$`|$']") === 'a[a|c]c', "$` and $'");
assert('2024-05'.replace(/(?<y>\d+)-(?<m>\d+)/, '$<m>/$<y>') === '05/2024', '$<name>');
assert('a.b'.replace('.', '$$') === 'a$b', '$$');
assert('aaa'.replace(/a/g, (s, i: number) => `${i}`) === '012', 'function replacer');
console.log(m !== null, opt !== null && opt[2] === undefined, behind && behind[1]);
