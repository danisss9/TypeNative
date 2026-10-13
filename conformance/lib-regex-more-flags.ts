const re = /a.b/s;
const sticky = /foo/y;
sticky.lastIndex = 3;
assert(re.test('a\nb') && sticky.test('barfoo') && re.source === 'a.b' && re.flags === 's' && /\u{1F600}/u.test('\u{1F600}'), 'regex flags');
const plain = /a\d+(?<n>x)/im;
assert(plain.source === 'a\\d+(?<n>x)' && plain.flags === 'im' && plain.ignoreCase && !plain.global && /z/g.global, 'source / flags');
