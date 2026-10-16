import { URL as NodeURL, domainToASCII, domainToUnicode, format } from 'node:url';

const u = new URL('HTTPS://User:Pass@Example.com:443/a/./b/../c?x=1&y=two#frag');
assert(u.protocol === 'https:' && u.hostname === 'example.com' && u.port === '', 'scheme / host / default port');
assert(u.username === 'User' && u.password === 'Pass', 'userinfo');
assert(u.pathname === '/a/c' && u.search === '?x=1&y=two' && u.hash === '#frag', 'path / search / hash');
assert(u.origin === 'https://example.com' && u.host === 'example.com', 'origin / host');
assert(u.href === 'https://User:Pass@example.com/a/c?x=1&y=two#frag', 'href');
assert(String(u) === u.href && u.toString() === u.href && u.toJSON() === u.href, 'string forms');

const rel = new URL('../up?q', 'http://h.test/one/two/three');
assert(rel.href === 'http://h.test/one/up?q', 'relative resolution');
assert(new URL('/root', 'http://h.test/a/b').href === 'http://h.test/root', 'absolute-path reference');
assert(new URL('//other.test/x', 'https://h.test/').href === 'https://other.test/x', 'scheme-relative reference');
assert(new URL('#h', 'http://h.test/p?q').href === 'http://h.test/p?q#h', 'fragment-only reference');
assert(new URL('http://h.test:8080').port === '8080' && new URL('http://h.test').pathname === '/', 'port / empty path');
assert(new URL('http://h.test/a b').pathname === '/a%20b', 'path percent-encoding');
assert(new URL('mailto:someone@example.com').pathname === 'someone@example.com', 'non-special scheme');
assert(new NodeURL('file:///tmp/x.txt').pathname === '/tmp/x.txt', 'file URL');

const mutable = new URL('http://a.test/x');
mutable.pathname = '/y z';
mutable.search = 'k=v';
mutable.hash = 'top';
mutable.port = '81';
assert(mutable.href === 'http://a.test:81/y%20z?k=v#top', 'setters');
mutable.host = 'b.test';
assert(mutable.hostname === 'b.test', 'host setter');

let invalid = '';
try {
  new URL('not a url');
} catch (e) {
  invalid = (e as NodeJS.ErrnoException).code ?? '';
}
assert(invalid === 'ERR_INVALID_URL', 'invalid URL throws');
assert(URL.canParse('https://x.test') && !URL.canParse('nope'), 'URL.canParse');
assert(URL.parse('nope') === null && URL.parse('/p', 'http://h.test')?.href === 'http://h.test/p', 'URL.parse');

assert(domainToASCII('español.com') === 'xn--espaol-zwa.com', 'domainToASCII');
assert(domainToUnicode('xn--espaol-zwa.com') === 'español.com', 'domainToUnicode');
assert(new URL('http://münchen.de/').hostname === 'xn--mnchen-3ya.de', 'IDN host');
assert(format(new URL('http://f.test/p')) === 'http://f.test/p', 'url.format');
