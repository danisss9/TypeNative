// String.prototype.replace with a pattern typed string | RegExp, a function
// value as the replacer, optional (undefined) groups, and an offset
// parameter when the regex comes from a const object
function sub(s: string, pattern: string | RegExp, to: string): string {
  return s.replace(pattern, to);
}
assert(sub('a-a', 'a', '[$&]') === '[a]-a', 'string pattern, $& expanded');
assert(sub('a-a', /a/g, 'b') === 'b-b' && sub('a-a', /a/, 'b') === 'b-a', 'regex pattern keeps its flags');
const escapes: { [ch: string]: string } = { '<': '&lt;', '>': '&gt;' };
const escapeChar = (ch: string) => escapes[ch];
assert('<b>'.replace(/[<>]/g, escapeChar) === '&lt;b&gt;', 'a function value as the replacer');
const refs = /&#(?:(\d+)|[xX]([0-9a-f]+));|&/g;
const decoded = '&#65;&#x42;&'.replace(refs, (ref: string, dec?: string, hex?: string) =>
  dec === undefined && hex === undefined ? '&amp;' : String.fromCodePoint(dec === undefined ? parseInt(hex!, 16) : parseInt(dec, 10)));
assert(decoded === 'AB&amp;', `unmatched groups are undefined: ${decoded}`);
const other = { findPipe: /\|/g };
const escapedPipes = 'a\\|b|c'.replace(other.findPipe, (match, offset, str) => {
  let escaped = false;
  let curr = offset;
  while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
  return escaped ? '|' : ' |';
});
assert(escapedPipes === 'a\\|b |c', `offset of a const object's regex: ${escapedPipes}`);
assert(encodeURI('a b/c?d=é#f') === 'a%20b/c?d=%C3%A9#f', 'encodeURI keeps reserved characters');
