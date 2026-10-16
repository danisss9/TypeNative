import querystring, { parse, stringify, escape, unescape } from 'node:querystring';

const parsed = parse('a=1&b=x%20y&a=2&flag');
assert(parsed.b === 'x y' && parsed.flag === '', 'parse values');
const a = parsed.a as string[];
assert(Array.isArray(a) && a.length === 2 && a[1] === '2', 'repeated keys become arrays');
assert(parse('k:v;m:n', ';', ':').m === 'n', 'custom separators');
assert(querystring.decode('p=1').p === '1', 'decode alias');

assert(stringify({ name: 'Ana Lu', n: 3, ok: true }) === 'name=Ana%20Lu&n=3&ok=true', 'stringify');
assert(stringify({ tags: ['x', 'y'] }) === 'tags=x&tags=y', 'stringify arrays');
assert(querystring.encode({ k: 'v' }, ';', ':') === 'k:v', 'encode with separators');
assert(escape('a b&c') === 'a%20b%26c' && unescape('a%20b') === 'a b', 'escape / unescape');
