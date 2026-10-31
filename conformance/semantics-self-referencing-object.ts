// An object literal whose methods return the object itself (a fluent
// builder): chained calls of any length, a pattern composed at run time
function edit(regex: string | RegExp, opt = '') {
  let source = typeof regex === 'string' ? regex : regex.source;
  const obj = {
    replace: (name: string | RegExp, val: string | RegExp) => {
      let valSource = typeof val === 'string' ? val : val.source;
      valSource = valSource.replace(caret, '$1');
      source = source.replace(name, valSource);
      return obj;
    },
    getRegex: () => {
      return new RegExp(source, opt);
    },
  };
  return obj;
}
const caret = /(^|[^\[])\^/g;
const bullet = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
const re = edit(/^(bull) x(hr)(code)(q)(j)(k)(m)(u)/)
  .replace(/bull/g, bullet)
  .replace('hr', '^-+')
  .replace(/code/g, / {4}/)
  .replace('q', 'Q').replace('j', 'J').replace('k', 'K').replace('m', 'M').replace('u', 'U')
  .getRegex();
assert(re.source === '^( {0,3}(?:[*+-]|\\d{1,9}[.)])) x(-+)( {4})(Q)(J)(K)(M)(U)', `composed source: ${re.source}`);
assert(re.test('- x--    QJKMU') && !re.test('x'), 'composed regex matches');
const flagged = edit('a|b', 'i').getRegex();
assert(flagged.flags === 'i' && flagged.test('B'), 'flags');
