// go:regexp — MustCompile + the method surface
import { MustCompile, Compile, QuoteMeta } from 'go:regexp';

const re = MustCompile('(\\d+)');
assert(re.MatchString('abc123'), 'MatchString match');
assert(!re.MatchString('abc'), 'MatchString no match');
assert(re.FindString('abc123def45') === '123', 'FindString');
assert(re.FindAllString('a1b22c333', -1).length === 3, 'FindAllString all');
assert(re.FindAllString('a1b22c333', 2).length === 2, 'FindAllString limit');
assert(re.FindStringSubmatch('x77')[1] === '77', 'FindStringSubmatch group');
assert(re.NumSubexp() === 1, 'NumSubexp');

const word = MustCompile('\\w+');
assert(word.ReplaceAllString('a b c', 'X') === 'X X X', 'ReplaceAllString');
assert(word.Split('one,two,three', -1).length === 4, 'Split returns between-text');
assert(re.FindStringIndex('abc123')[0] === 3, 'FindStringIndex');
assert(re.SubexpNames()[1] === '', 'SubexpNames');
assert(re.String() === '(\\d+)', 'String roundtrip');

const float = MustCompile('^[0-9]+\\.[0-9]+$');
assert(float.MatchString('3.14') && !float.MatchString('3'), 'anchored pattern');

const compiled = Compile('a+b');
assert(compiled.MatchString('aaab'), 'Compile');

assert(QuoteMeta('a.b*') === 'a\\.b\\*', 'QuoteMeta');

re.Longest();
assert(re.FindString('abc123def45') === '123', 'Longest does not break FindString');
console.log('go-regexp ok');
