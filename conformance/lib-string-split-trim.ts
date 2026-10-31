// split with a limit (string and regex separators), trim as JS defines
// whitespace (U+0085 isn't), and strings built with += in a loop
assert('a,b,c,d'.split(',', 2).join('|') === 'a|b', 'string separator, limit');
assert('a1b22c333d'.split(/\d+/, 3).join('|') === 'a|b|c', 'regex separator, limit');
assert('abc'.split('', 2).join('|') === 'a|b' && 'a,b'.split(',', 0).length === 0, 'empty separator, zero limit');
assert('   x ﻿\t'.trim() === 'x', 'JS whitespace and line terminators trimmed');
assert('\u0085x\u0085'.trim() === '\u0085x\u0085' && '​x'.trim() === '​x', 'U+0085 and U+200B are not whitespace');
assert(' x '.trimStart() === 'x ' && ' x '.trimEnd() === ' x', 'trimStart / trimEnd');
let out = '';
const seen: number[] = [];
for (let i = 0; i < 1000; i++) {
  out += String(i % 10);
  if (i % 250 === 0) seen.push(out.length);
  if (out.endsWith('9')) out += ';';
}
assert(out.length === 1100 && out.startsWith('0123456789;0') && seen.join(',') === '1,276,551,826', `accumulated: ${out.length} ${seen.join(',')}`);
function render(items: string[]): string {
  let html = '<ul>';
  for (const item of items) html += `<li>${item}</li>`;
  return html + '</ul>';
}
assert(render(['a', 'b']) === '<ul><li>a</li><li>b</li></ul>', 'accumulator returned');
function joinAll(parts: string[][]): string {
  let code = '';
  for (const group of parts) code += '[';
  parts.forEach((group) => {
    code += group.join('+');
  });
  return code;
}
assert(joinAll([['a', 'b'], ['c']]) === '[[a+bc', 'appended to in a loop and in a closure');
