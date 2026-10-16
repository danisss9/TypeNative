const params = new URLSearchParams('?a=1&b=two+words&a=3');
assert(params.get('a') === '1' && params.get('b') === 'two words' && params.get('zz') === null, 'get');
assert(params.getAll('a').join(',') === '1,3' && params.has('b') && !params.has('c'), 'getAll / has');
assert(params.size === 3, 'size');
params.append('c', 'x&y');
params.set('a', 'only');
params.delete('b');
assert(params.toString() === 'a=only&c=x%26y', 'mutations and serialization');

const pairs: string[] = [];
for (const [key, value] of params) pairs.push(`${key}:${value}`);
assert(pairs.join(' ') === 'a:only c:x&y', 'for...of');
const seen: string[] = [];
params.forEach((value, key) => seen.push(key + '=' + value));
assert(seen.join('|') === 'a=only|c=x&y', 'forEach');
assert([...params.keys()].length === 2, 'keys');

const sorted = new URLSearchParams('z=1&a=2&m=3');
sorted.sort();
assert(sorted.toString() === 'a=2&m=3&z=1', 'sort');
assert(new URLSearchParams({ q: 'search term', n: '1' }).toString() === 'q=search+term&n=1', 'from object');
assert(new URLSearchParams([['k', 'v']]).get('k') === 'v', 'from pairs');

const url = new URL('https://example.test/path?x=1');
url.searchParams.append('y', '2');
assert(url.href === 'https://example.test/path?x=1&y=2', 'searchParams updates the URL');
url.search = '?fresh=yes';
assert(url.searchParams.get('fresh') === 'yes' && !url.searchParams.has('x'), 'search updates searchParams');

export {};
