// go:unicode + go:unicode/utf8 — rune classification and UTF-8
import { IsUpper, IsLower, IsDigit, IsSpace, IsLetter, ToUpper, ToLower, ToTitle, SimpleFold } from 'go:unicode';
import { RuneCountInString, RuneLen, ValidRune, ValidString, FullRuneInString } from 'go:unicode/utf8';

assert(IsUpper('A') && !IsUpper('a'), 'IsUpper');
assert(IsLower('a') && !IsLower('A'), 'IsLower');
assert(IsDigit('7') && !IsDigit('x'), 'IsDigit');
assert(IsSpace(' ') && IsSpace('\t') && !IsSpace('a'), 'IsSpace');
assert(IsLetter('Q') && !IsLetter('5'), 'IsLetter');

assert(ToUpper('a') === 65, `ToUpper rune value: ${ToUpper('a')}`);
assert(ToLower('Z') === 122, 'ToLower');
assert(ToTitle('l') === 76, 'ToTitle');
assert(SimpleFold('A') === 97, 'SimpleFold');

assert(RuneCountInString('hello') === 5, 'RuneCountInString ascii');
assert(RuneCountInString('héllo') === 5, 'RuneCountInString é');
assert(RuneCountInString('🚀x') === 2, 'RuneCountInString emoji');
assert(RuneLen('A') === 1 && RuneLen('é') === 2 && RuneLen('🚀') === 4, 'RuneLen');
assert(ValidRune('A') && ValidRune('🚀'), 'ValidRune');
assert(ValidString('héllo 🚀'), 'ValidString');
assert(FullRuneInString('héllo'), 'FullRuneInString');
console.log('go-unicode ok');
