// JS regex escapes and classes, also in patterns the backtracking engine runs
// (lookarounds force it): \xHH \uHHHH \u{…} \cJ \p{…} \P{…} \k<name>, JS's
// Unicode \s, group numbers by opening parenthesis
const nbsp = 'a b';
assert(/a\sb/.test(nbsp) && /(?!q)a\sb/.test(nbsp), '\\s is Unicode whitespace');
assert(!/a\Sb/.test(nbsp) && /[\s\S]/.test(' '), '\\S and [\\s\\S]');
assert(/(?!q)^[^ \t\n\x00-\x1f]+$/.test('ab[c]') && !/(?!q)[\x00-\x1f]/.test('abc'), '\\xHH ranges in classes');
assert(/(?!q)\x5b/.test('[') && /(?!q)A/.test('A') && /(?!q)\u{1F600}/u.test('😀'), '\\x \\u \\u{}');
assert(/(?!q)\cJ/.test('\n'), '\\cJ');
assert(/(?!q)^\p{L}+$/u.test('héllo') && /(?!q)^[\p{P}\p{S}]+$/u.test('!$') && /(?!q)\P{L}/u.test('a1'), '\\p{} / \\P{}');
assert(/(?!q)\p{Lu}/u.test('aB') && !/(?!q)\p{Lu}/u.test('ab'), '\\p{Lu}');
const named = /(?!q)(?<q>['"])x\k<q>/.exec('say "x"');
assert(!!named && named[0] === '"x"', '\\k<name>');
const nested = /^(a(?!(b)))(c)/.exec('ac');
assert(!!nested && nested[1] === 'a' && nested[3] === 'c', 'groups numbered by their opening parenthesis');
const built = new RegExp('(?<!\\\\)' + '\\[(\\w+)\\]', 'g');
assert('[a] \\[b] [c]'.replace(built, '<$1>') === '<a> \\[b] <c>', 'lookbehind in a pattern built at run time');
