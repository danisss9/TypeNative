// String.replace / replaceAll with regular expressions, truthiness, and narrowing

// Without /g only the first match is replaced; with /g every match
assert('a-b-c'.replace(/-/, '+') === 'a+b-c', 'regex replace (first) failed');
assert('a-b-c'.replace(/-/g, '+') === 'a+b+c', 'regex replace (global) failed');
assert('a-b-c'.replaceAll(/-/g, '') === 'abc', 'regex replaceAll failed');

// Replacement patterns: $1 groups and $& (whole match)
assert('john smith'.replace(/(\w+) (\w+)/, '$2 $1') === 'smith john', 'group pattern failed');
assert('abc'.replace(/b/, '[$&]') === 'a[b]c', 'whole-match pattern failed');

// Function replacer receives (match, ...groups)
const shouted = 'x=1, y=22'.replace(/(\w)=(\d+)/g, (match, name, value) => {
  return `${name.toUpperCase()}:${value.length}`;
});
assert(shouted === 'X:1, Y:2', `function replacer failed: ${shouted}`);

// JS truthiness on strings, numbers and optional values
function describe(label: string, count: number, note?: string): string {
  let out = label || 'none';
  if (count) out += ` x${count}`;
  if (note) out += ` (${note})`;
  return out;
}
assert(describe('', 0) === 'none', `falsy values failed: ${describe('', 0)}`);
assert(describe('a', 2, 'n') === 'a x2 (n)', `truthy values failed: ${describe('a', 2, 'n')}`);

// Narrowing of `string | undefined` after guards
function firstWord(text: string | undefined): string {
  if (!text) return '';
  return text.split(' ')[0];
}
assert(firstWord('hello world') === 'hello', 'early-return narrowing failed');
assert(firstWord(undefined) === '', 'undefined input failed');

function suffix(value: string | undefined): string {
  return value !== undefined && value.endsWith('!') ? 'loud' : 'calm';
}
assert(suffix('hi!') === 'loud' && suffix(undefined) === 'calm', '&& narrowing failed');

// Collections declared without type annotations
const seen = new Set<string>();
const counts = new Map<string, number>();
for (const word of ['a', 'b', 'a']) {
  seen.add(word);
  counts.set(word, (counts.get(word) ?? 0) + 1);
}
assert(seen.size === 2 && counts.get('a') === 2, 'inferred Set/Map dispatch failed');
