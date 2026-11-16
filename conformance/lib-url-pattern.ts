// URLPattern (the URL Pattern Standard): string and init inputs, named groups,
// wildcards, custom regexps, search / hash canonicalization, base URLs
const books = new URLPattern('https://example.com/books/:id');
console.log([books.protocol, books.username, books.password, books.hostname, books.port, books.pathname, books.search, books.hash, books.hasRegExpGroups]);
assert(books.protocol === 'https' && books.hostname === 'example.com' && books.pathname === '/books/:id', 'string input components');
assert(books.username === '*' && books.search === '*' && !books.hasRegExpGroups, 'absent components are wildcards');

const match = books.exec('https://example.com/books/7')!;
assert(match.pathname.input === '/books/7', 'matched pathname input');
assert(match.pathname.groups.id === '7', 'named group');
assert(match.protocol.input === 'https' && match.hostname.input === 'example.com', 'component inputs');
assert(match.inputs.length === 1 && match.inputs[0] === 'https://example.com/books/7', 'inputs');
assert(books.test('https://example.com/books/7') && !books.test('https://example.com/books/'), 'test');

const wildcard = new URLPattern({ pathname: '/f/*' });
assert(wildcard.test('https://a/f/a/b'), 'wildcard across segments');
assert(wildcard.exec('https://a/f/a/b')!.pathname.groups['0'] === 'a/b', 'wildcard group is numbered');

const digits = new URLPattern({ pathname: '/x/:id(\\d+)' });
assert(digits.hasRegExpGroups, 'hasRegExpGroups');
assert(digits.test('https://a/x/12') && !digits.test('https://a/x/ab'), 'custom regexp');
assert(digits.exec('https://a/x/12')!.pathname.groups.id === '12', 'custom regexp group');

const query = new URLPattern({ search: '?q=:q' });
assert(query.search === 'q=:q', 'search canonicalized without ?');
assert(query.test('https://a/?q=hi'), 'search matches');
assert(query.exec('https://a/?q=hi')!.search.groups.q === 'hi', 'search group');
assert(query.exec('https://a/?q=hi')!.search.input === 'q=hi', 'search input without ?');

const fragment = new URLPattern({ hash: '#x' });
assert(fragment.hash === 'x' && fragment.test('https://a/#x'), 'hash canonicalized without #');

const based = new URLPattern('/users/:id', 'https://example.com');
assert(based.protocol === 'https' && based.hostname === 'example.com' && based.test('https://example.com/users/4'), 'base URL');
assert(based.test(new URL('https://example.com/users/4')), 'a URL input');

const init = new URLPattern({ pathname: '/a', baseURL: 'https://u:p@x:8080/b?q=1#h' });
assert(init.protocol === 'https' && init.hostname === 'x' && init.port === '8080' && init.pathname === '/a', 'init baseURL');
assert(init.username === '*' && init.search === '*', 'init keeps other components wildcards');

const host = new URLPattern({ hostname: ':sub.example.com', pathname: '/a/:x?' });
assert(host.exec('https://api.example.com/a')!.hostname.groups.sub === 'api', 'hostname group');
assert(host.exec('https://api.example.com/a/1')!.pathname.groups.x === '1', 'optional group');
assert(host.exec('https://api.example.com/a')!.pathname.groups.x === undefined, 'an unmatched optional group is undefined');

const insensitive = new URLPattern({ pathname: '/a' }, { ignoreCase: true });
assert(insensitive.test('https://x/A'), 'ignoreCase');

assert(new URLPattern({ pathname: '/none' }).exec('https://x/other') === null, 'no match is null');
console.log('url pattern ok');
