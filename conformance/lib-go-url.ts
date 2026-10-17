import * as url from 'go:net/url';
import * as html from 'go:html';

const u = url.Parse('https://example.com/path?q=1');
assert(u.Host === 'example.com', 'URL Host field');
assert(u.Path === '/path', 'URL Path field');

assert(html.EscapeString('<b>') === '&lt;b&gt;', 'EscapeString');

let threw = '';
try {
  url.Parse('://bad-url');
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'Parse error throws');
