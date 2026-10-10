// go:strings — the full function-call surface
import {
  Compare, Contains, ContainsAny, ContainsRune, Count, EqualFold, Fields,
  HasPrefix, HasSuffix, Index, IndexAny, IndexByte, Join, LastIndex,
  Repeat, Replace, ReplaceAll, Split, SplitN, ToLower, ToUpper, ToTitle,
  Trim, TrimLeft, TrimPrefix, TrimRight, TrimSpace, TrimSuffix
} from 'go:strings';

assert(Compare('a', 'b') === -1, 'Compare');
assert(Contains('hello', 'ell') && !Contains('hello', 'xyz'), 'Contains');
assert(ContainsAny('hello', 'lo') && !ContainsAny('hello', 'z'), 'ContainsAny');
assert(ContainsRune('héllo', 'é'), 'ContainsRune');
assert(Count('one two two', 'two') === 2, 'Count');
assert(EqualFold('Hello', 'hELLO'), 'EqualFold');
const fields = Fields('  a  b\tc ');
assert(fields.length === 3 && fields[2] === 'c', 'Fields');
assert(HasPrefix('index.ts', 'index.') && HasSuffix('index.ts', '.ts'), 'HasPrefix/HasSuffix');
assert(Index('banana', 'na') === 2 && LastIndex('banana', 'na') === 4, 'Index/LastIndex');
assert(IndexAny('hello', 'ol') === 2, 'IndexAny');
assert(IndexByte('hello', 'l') === 2, 'IndexByte');
assert(Join(['a', 'b', 'c'], '-') === 'a-b-c', 'Join');
assert(Repeat('ab', 3) === 'ababab', 'Repeat');
assert(Replace('aaa', 'a', 'b', 2) === 'bba', 'Replace');
assert(ReplaceAll('aaa', 'a', 'b') === 'bbb', 'ReplaceAll');
const parts = Split('a,b,c', ',');
assert(parts.length === 3 && parts[1] === 'b', 'Split');
assert(SplitN('a,b,c', ',', 2).length === 2, 'SplitN');
assert(ToLower('HeLLo') === 'hello' && ToUpper('hello') === 'HELLO' && ToTitle('hello') === 'HELLO', 'case');
assert(Trim('xxhixx', 'x') === 'hi', 'Trim');
assert(TrimLeft('  hi', ' ') === 'hi' && TrimRight('hi  ', ' ') === 'hi', 'TrimLeft/TrimRight');
assert(TrimPrefix('hello.go', 'hello') === '.go' && TrimSuffix('hello.go', '.go') === 'hello', 'TrimPrefix/Suffix');
assert(TrimSpace('  hi  ') === 'hi', 'TrimSpace');
console.log('go-strings ok');
