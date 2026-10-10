// go:net/url — Parse, fields, methods, escaping
import * as url from 'go:net/url';

const u = url.Parse('https://user:pass@example.com:8443/path/to/page?q=go+lang&x=1#section');
assert(u.Scheme === 'https', `Scheme: ${u.Scheme}`);
assert(u.Host === 'example.com:8443', `Host: ${u.Host}`);
assert(u.Path === '/path/to/page', `Path: ${u.Path}`);
assert(u.RawQuery === 'q=go+lang&x=1', `RawQuery: ${u.RawQuery}`);
assert(u.Fragment === 'section', `Fragment: ${u.Fragment}`);
assert(u.Hostname() === 'example.com', 'Hostname()');
assert(u.Port() === '8443', 'Port()');
assert(u.RequestURI() === '/path/to/page?q=go+lang&x=1', 'RequestURI()');
assert(u.String().includes('example.com:8443'), 'String()');
assert(!u.IsAbs() === false, 'IsAbs()');

const rel = url.Parse('/relative/path');
assert(rel.Scheme === '' && rel.Path === '/relative/path', 'relative parse');

const q = u.Query();
assert(q.Get('q') === 'go lang', `Query Get: ${q.Get('q')}`);
assert(q.Get('x') === '1', 'Query Get x');
assert(q.Has('q'), 'Query Has');
q.Set('new', 'val');
assert(q.Encode().includes('new=val'), 'Query Set/Encode');

assert(url.QueryEscape('a b&c') === 'a+b%26c', 'QueryEscape');
assert(url.QueryUnescape('a+b%26c') === 'a b&c', 'QueryUnescape');
assert(url.PathEscape('a b/c') === 'a%20b%2Fc', 'PathEscape');
assert(url.PathUnescape('a%20b%2Fc') === 'a b/c', 'PathUnescape');

// Parse failure throws and is catchable
let caught = false;
try {
  url.Parse('http://[::1');
} catch (e) {
  caught = true;
}
assert(caught, 'Parse error not caught');
console.log('go-net-url ok');
