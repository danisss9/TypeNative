import * as unicode from 'go:unicode';
import * as utf8 from 'go:unicode/utf8';

assert(unicode.IsLetter(65) === true, 'IsLetter rune conversion');
assert(unicode.IsDigit(53) === true, 'IsDigit');
assert(unicode.IsSpace(32) === true, 'IsSpace');
assert(unicode.ToUpper(97) === 65, 'ToUpper rune');
assert(utf8.RuneCountInString('hello') === 5, 'RuneCountInString');
assert(utf8.ValidString('hello') === true, 'ValidString');
