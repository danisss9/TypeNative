import * as strings from 'go:strings';

assert(strings.ToUpper('hello') === 'HELLO', 'ToUpper');
assert(strings.ToLower('HeLLo') === 'hello', 'ToLower');
assert(strings.Repeat('ab', 3) === 'ababab', 'Repeat int conversion');
assert(strings.Contains('hello world', 'world') === true, 'Contains');
assert(strings.HasPrefix('hello', 'he') === true, 'HasPrefix');
assert(strings.HasSuffix('hello', 'lo') === true, 'HasSuffix');
assert(strings.Count('hello', 'l') === 2, 'Count returns int');
assert(strings.Index('hello', 'll') === 2, 'Index returns int');
assert(strings.TrimSpace('  hi  ') === 'hi', 'TrimSpace');
assert(strings.Split('a,b,c', ',').join(';') === 'a;b;c', 'Split slice');
assert(strings.Join(['x', 'y'], '-') === 'x-y', 'Join');
assert(strings.ReplaceAll('aaa', 'a', 'b') === 'bbb', 'ReplaceAll');
assert(strings.TrimPrefix('prefix', 'pre') === 'fix', 'TrimPrefix');
