// The regex engine: JS backtracking semantics, whichever engine could run the pattern

// Backtracking into groups and alternatives
assert(/^(a|ab)(c|bcd)(d*)$/.exec('abcd')![1] === 'a', 'first alternative that lets the rest match');
assert(/^(a|ab)(c|bcd)(d*)$/.exec('abcd')![2] === 'bcd', 'second group after backtracking');
assert(/(a+)(a+)/.exec('aaaa')![1] === 'aaa', 'greedy gives back one');
assert(/(a+?)(a+)/.exec('aaaa')![1] === 'a', 'lazy takes the minimum');
assert(/x*y/.exec('xxxz') === null, 'a loop that keeps nothing still fails');
assert(/[^\n]*\n/.exec('ab\ncd')![0] === 'ab\n', 'a repeat followed by a disjoint character');
assert(/a.*c/.exec('abcabc')![0] === 'abcabc', 'greedy steps back to the last c');
assert(/a.*?c/.exec('abcabc')![0] === 'abc', 'lazy stops at the first c');
assert(/a{2,3}/.exec('aaaa')![0] === 'aaa', 'a bounded repeat');
assert(/a{2,3}?/.exec('aaaa')![0] === 'aa', 'a bounded lazy repeat');
assert(/(?:ab){2}/.exec('ababab')![0] === 'abab', 'a counted group');
assert(/(?:ab){2,}?c/.exec('abababc')![0] === 'abababc', 'a lazy counted group');

// Empty iterations stop a loop; captures reset per iteration
assert(/(a*)*/.exec('b')![0] === '', 'a loop over an empty match ends');
assert(/(a*)*/.exec('b')![1] === undefined, 'its capture stays unset');
assert(/(a*)?/.exec('b')![1] === undefined, 'an optional empty group is unset');
assert(/(?:(a)|b)*/.exec('ab')![1] === undefined, 'a capture resets each iteration');
assert(/(?:(a)|(b))+/.exec('ab')![2] === 'b', 'the last iteration keeps its capture');
assert(/(z)((a+)?(b+)?(c))*/.exec('zaacbbbcac')![4] === undefined, 'captures of an earlier iteration are gone');
assert(/(z)((a+)?(b+)?(c))*/.exec('zaacbbbcac')![3] === 'a', 'captures of the last iteration stay');

// Lookaround
assert(/a(?=b)/.exec('acab')!.index === 2, 'lookahead');
assert(/a(?!b)/.exec('abac')!.index === 2, 'negative lookahead');
assert(/(?<=\$)\d+/.exec('cost $42')![0] === '42', 'lookbehind');
assert(/(?<!\$)\b\d+/.exec('$42 17')![0] === '17', 'negative lookbehind');
assert(/(?=(a+))a*b\1/.exec('baaabac')![1] === 'a', 'a lookahead is atomic');
assert(/(?!(a))b/.exec('b')![1] === undefined, 'a negative lookahead keeps no capture');
assert(/(?:(?=(a))a|b)+/.exec('ab')![1] === undefined, 'captures of a lookahead reset too');
assert(/(?=x|$)/.exec('')![0] === '', 'a lookahead with $ at the end of the input');
assert(/a(?=x|$)/.exec('ab a')!.index === 3, 'a lookahead with $ past other text');

// Backreferences
assert(/(a|b)\1/.exec('abba')![0] === 'bb', 'a backreference');
assert(/(?<q>['"]).*?\k<q>/.exec(`say "it's"`)![0] === `"it's"`, 'a named backreference');
assert(/\1(a)/.exec('aa')![0] === 'a', 'a backreference to a group not yet set matches empty');
assert(/(a)\1/i.exec('aA')![0] === 'aA', 'a backreference ignoring case');

// JS, not RE2: line terminators, classes, whitespace
assert(/a.b/.exec('a\rb') === null, 'dot excludes \\r');
assert(/a.b/.exec('a b') === null, 'dot excludes \\u2028');
assert(/a.b/s.exec('a\rb') !== null, 's: dot matches every character');
assert(/^b/m.exec('a\rb')!.index === 2, 'm: ^ after \\r');
assert(/a$/m.exec('a b')!.index === 0, 'm: $ before \\u2029');
assert(/[]/.exec('a') === null, 'an empty class matches nothing');
assert(/[^]/.exec('\n')![0] === '\n', 'a negated empty class matches anything');
assert(/\s/.exec(' ') !== null, 'space escapes as JS reads them');
assert(/\w/.exec('é') === null, 'word characters are ASCII');
assert(/\bé/.exec('é') === null, 'word boundaries are ASCII');
assert(/\p{L}/u.exec('é')![0] === 'é', 'a property with u');
assert(/\P{L}/u.exec('é1')![0] === '1', 'a negated property with u');
assert(new RegExp('^\\p{L}$').exec('pL') === null, 'without u, \\p is a p');

// Case, and non-ASCII text
assert(/straSSe/i.exec('STRASSE') !== null, 'i on letters');
assert(/[a-z]+/i.exec('ABC')![0] === 'ABC', 'i on a class');
assert(/é+/i.exec('xÉé')![0] === 'Éé', 'i outside ASCII');
assert(/[^a]+/.exec('aéb')![0] === 'éb', 'a negated class over non-ASCII text');
assert(/(?<=é)b/.exec('aéb')!.index === 2, 'lookbehind over a multi-byte character');
assert(/.*b/.exec('éaéb')![0] === 'éaéb', 'giving back over multi-byte characters');
assert('日本語テキスト'.replace(/本|キ/g, '_') === '日_語テ_スト', 'replace in non-ASCII text');

// lastIndex, sticky, global
const sticky = /a/y;
sticky.lastIndex = 1;
assert(sticky.exec('ba') !== null && sticky.lastIndex === 2, 'sticky advances lastIndex');
assert(sticky.exec('ba') === null && sticky.lastIndex === 0, 'a sticky miss resets it');
const stickyWord = /\bb/y;
stickyWord.lastIndex = 1;
assert(stickyWord.exec('ab') === null, 'sticky keeps the text before the match in view');
const caret = /^b/g;
caret.lastIndex = 1;
assert(caret.exec('ab') === null, '^ does not match at lastIndex');
const unicodeIndex = /b/g;
assert(unicodeIndex.exec('éb')!.index === 1 && unicodeIndex.lastIndex === 2, 'indices count characters');
assert('a1b2'.replace(/\d/g, (d) => `<${d}>`) === 'a<1>b<2>', 'replace with a function');
assert('abc'.replace(/b/, '[$&]') === 'a[b]c', 'replace with a pattern');
assert('abc'.replace(/x/, 'y') === 'abc', 'replace without a match');
assert('aXbxc'.split(/x/i).join('|') === 'a|b|c', 'split');
assert('a1b'.split(/(\d)/).join('|') === 'a|1|b', 'split keeps captures');
assert(/x/g.test('axb') && /^$/.test(''), 'test');
const all = [...'a1b22'.matchAll(/\d+/g)].map((m) => `${m[0]}@${m.index}`).join(',');
assert(all === '1@1,22@3', 'matchAll with indices');
assert('xaya'.match(/a/g)!.length === 2, 'match with g');

// A match array's .index and unset groups survive what is done with it
const unset = /(a)|(b)/.exec('b')!;
assert(unset[1] === undefined && unset[2] === 'b' && unset.index === 0, 'an unset group');
const [whole, first, second] = unset;
assert(whole === 'b' && first === undefined && second === 'b', 'destructured');

// A pattern that explodes on a backtracker: RE2 takes over and finishes
// (sized so that a backtracking engine with no budget, as V8's, still finishes)
const nested = /^(a|aa)+$/;
assert(nested.test('a'.repeat(30)), 'matches');
assert(!nested.test('a'.repeat(34) + 'b'), 'fails');
assert(/(x+x+)+y/.test('x'.repeat(23)) === false, 'nested repeats fail');

// Long subjects, and a repeat of a group over all of them
const long = 'ab'.repeat(200000);
assert(/^(?:ab)*$/.test(long), 'a group repeated over a long input');
assert(long.replace(/a/g, '').length === 200000, 'replace over a long input');
