// Legacy url.parse / url.resolve
import * as url from 'node:url';

const u = url.parse('http://user:pw@Host.com:8080/p/a/t/h?query=string#hash');
console.log(u.href);
assert(u.protocol === 'http:' && u.slashes === true && u.auth === 'user:pw', 'protocol, slashes, auth');
assert(u.host === 'host.com:8080' && u.hostname === 'host.com' && u.port === '8080', 'host');
assert(u.pathname === '/p/a/t/h' && u.search === '?query=string' && u.query === 'query=string' && u.hash === '#hash', 'path parts');
assert(u.path === '/p/a/t/h?query=string' && u.href === 'http://user:pw@host.com:8080/p/a/t/h?query=string#hash', 'path and href');

const bare = url.parse('http://example.com');
assert(bare.pathname === '/' && bare.path === '/' && bare.search === null && bare.hash === null, 'missing parts are null');
const relative = url.parse('/a/b?x=1');
assert(relative.protocol === null && relative.host === null && relative.pathname === '/a/b', 'a relative URL');
const withQuery = url.parse('/s?q=1&r=two', true);
assert(withQuery.query.q === '1' && withQuery.query.r === 'two', 'parseQueryString');

assert(url.resolve('/one/two/three', 'four') === '/one/two/four', 'resolve a relative path');
assert(url.resolve('http://example.com/', '/one') === 'http://example.com/one', 'resolve an absolute path');
assert(url.resolve('http://example.com/one', '/two') === 'http://example.com/two', 'resolve replaces the path');
