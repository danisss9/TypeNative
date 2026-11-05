// The v flag (unicodeSets): class set subtraction, intersection, nested and
// negated classes, \q{…} strings (longest first), case folding per operand
const consonant = /[\p{L}--[aeiou]]/v;
assert(consonant.test('Q') && consonant.test('b') && !consonant.test('a') && !consonant.test('1'), 'subtraction');
assert(!/[\p{L}--[a-z]]/v.test('q') && /[\p{L}--[a-z]]/v.test('É'), 'subtraction of a range');
assert(!/[\p{L}--[a-z]]/vi.test('Q') && /[\p{L}--[a-z]]/vi.test('É'), 'i folds each operand first');
assert(/[\p{Lu}&&[A-F]]/v.test('C') && !/[\p{Lu}&&[A-F]]/v.test('G') && !/[\p{Lu}&&[A-F]]/v.test('c'), 'intersection');
assert(/^[[a-z][0-9]_]+$/v.test('ab_12') && !/^[[a-z][0-9]]+$/v.test('a-1'), 'nested classes in a union');
assert(/^[^[a-z]--[aeiou]]$/v.test('a') && !/^[^[a-z]--[aeiou]]$/v.test('b') && /^[^[a-z]--[aeiou]]$/v.test('B'), 'negated set expression');
assert(/[[^a-z]&&\p{L}]/v.test('Q') && !/[[^a-z]&&\p{L}]/v.test('q'), 'negated nested class');
assert(/[\[\]\-]/v.test('-') && /[a\-z]/v.test('-') && !/[a\-z]/v.test('m'), 'escaped syntax characters');

// \q{…}: strings, tried longest first
assert(/^[\q{abc|d}x]+$/v.test('abcxd') && !/^[\q{abc|d}x]+$/v.test('ab'), 'class strings');
const longest = 'abc'.match(/[\q{a|abc}]/v);
assert(longest !== null && longest[0] === 'abc', 'longest string first');
const repeated = 'xxababy'.match(/[\q{ab}]+/v);
assert(repeated !== null && repeated[0] === 'abab' && repeated.index === 2, 'quantified class strings');
assert(/^[\q{ab|cd}--\q{cd}]$/v.test('ab') && !/^[\q{ab|cd}--\q{cd}]$/v.test('cd'), 'subtracting strings');
assert(/^[\q{ab|cd}&&\q{cd|ef}]$/v.test('cd') && !/^[\q{ab|cd}&&\q{cd|ef}]$/v.test('ab'), 'intersecting strings');
assert(/^[\q{AB}]$/vi.test('ab'), 'class strings with i');

// v implies unicode mode; flags and the unicodeSets property
assert(/\p{Lu}/v.test('A') && /^.$/v.test('\u{1F600}'), 'v is a unicode mode');
assert('a1b2'.replace(/[\w--\d]/gv, '_') === '_1_2', 'replace with gv');
const sets = new RegExp('[\\p{N}--[0-4]]', 'v');
assert(sets.test('7') && !sets.test('3') && sets.unicodeSets && sets.flags === 'v', 'built at run time');
assert(!/x/u.unicodeSets && /x/v.unicodeSets && !/x/v.unicode, 'unicodeSets flag');
