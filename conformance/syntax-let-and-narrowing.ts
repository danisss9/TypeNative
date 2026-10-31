// `let x;` assigned on every path before it's read holds its value type;
// array .at() past either end is undefined; unary + on a string is Number()
let total = 1;
let rLength;
const re = /(a)|(b)/g;
let match: RegExpExecArray | null;
while ((match = re.exec('aba')) !== null) {
  const delim = match[1] || match[2];
  if (!delim) continue;
  rLength = [...delim].length;
  total += rLength;
}
assert(total === 4, `let assigned in a loop: ${total}`);
let chosen;
if (total > 2) chosen = 'big';
else chosen = 'small';
assert(chosen.length === 3, 'let assigned in both branches');
const cells = ['x ', ' '];
if (cells.length > 0 && !cells.at(-1)?.trim()) cells.pop();
assert(cells.length === 1 && cells.at(5) === undefined && ([...'ab'].at(-1) ?? '') === 'b', 'at() past the end');
const bull = '12.';
const start = bull.length > 1 ? +bull.slice(0, -1) : '';
assert(start === 12 && +'  7 ' === 7 && Number.isNaN(+'x'), 'unary + on strings');
interface Code { type: 'code'; lang?: string; text: string }
const code = (cap: string[]): Code => ({ type: 'code', lang: cap[2] ? cap[2].trim() : cap[2], text: 'x' });
assert(code(['', '', ' js ']).lang === 'js' && code(['', '', '']).lang === '', 'a conditional into an optional field');
assert(JSON.stringify({ a: 1, b: undefined as string | undefined }) === '{"a":1}', 'undefined fields are left out of JSON');
interface Para { type: string; pre?: boolean; text: string }
const para: Para = { type: 'paragraph', text: 'p' };
assert(JSON.stringify(para) === '{"type":"paragraph","text":"p"}', `an unset optional field is left out: ${JSON.stringify(para)}`);
