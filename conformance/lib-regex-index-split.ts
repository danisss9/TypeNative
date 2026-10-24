// Match arrays carry .index (in characters), and split includes capture groups

// exec: plain, stateful (/g), backtracking and named-group patterns
const plain = /b+/.exec('aabbb');
assert(plain !== null && plain.index === 2, 'exec index');
assert(/(?<=a)b/.exec('cab')?.index === 2, 'lookbehind exec index');
const named = /(?<d>\d)/.exec('ab3');
assert(named !== null && named.index === 2 && named.groups?.d === '3', 'named exec index');

const re = /o/g;
const indices: number[] = [];
let m: RegExpExecArray | null;
while ((m = re.exec('föo bóo')) !== null) indices.push(m.index);
assert(indices.join(',') === '2,6', 'global exec indices count characters');

// match / matchAll
const first = 'xyzé!'.match(/!/);
assert(first !== null && first.index === 4, 'match index');
const all: number[] = [];
for (const hit of 'a1b22é333'.matchAll(/\d+/g)) all.push(hit.index ?? -1);
assert(all.join(',') === '1,3,6', 'matchAll indices');

// search counts characters too
assert('éa1'.search(/\d/) === 2, 'search index');
assert('éa1'.search(/(?<=a)\d/) === 2, 'backtracking search index');

// split includes captures
assert('a1b2c'.split(/(\d)/).join('|') === 'a|1|b|2|c', 'split with a capture');
assert('a1b2c'.split(/(\d)()/).length === 7, 'split with two captures');
assert('aXbXc'.split(/(?<=(X))/).join('|') === 'aX|X|bX|X|c', 'backtracking split with a capture');
assert('a1b2c3d'.split(/(\d)/, 3).join('|') === 'a|1|b', 'split limit counts captures');
assert('a1b2c'.split(/\d/).join('|') === 'a|b|c', 'split without captures');

// match with /g returns every whole match
const digits = 'a1b22c'.match(/\d+/g);
assert(digits !== null && digits.join('|') === '1|22', 'match /g returns all matches');
assert('abc'.match(/\d/g) === null, 'match /g without matches is null');
