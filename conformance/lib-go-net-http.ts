// go:net/http — response/property/method surface, offline-safe error paths.
// No live server needed: a closed port fails fast and exercises TnTry.
import * as http from 'go:net/http';
import * as url from 'go:net/url';

// Request construction and mutation without touching the network
const req = http.NewRequest('GET', 'http://example.com/health', null);
assert(req.Method === 'GET', `Method: ${req.Method}`);
assert(req.URL.Path === '/health', `URL.Path: ${req.URL.Path}`);
assert(req.URL.Host === 'example.com', `URL.Host: ${req.URL.Host}`);
req.SetBasicAuth('user', 'pass');
assert(typeof req.UserAgent() === 'string', 'UserAgent');
assert(req.Context() !== null, 'Request context');

// A connection-refused GET throws (TnTry) and is caught like a JS error
let caught = false;
try {
  http.Get('http://127.0.0.1:1/nope');
} catch (e) {
  caught = true;
  const msg = (e as any).message as string;
  assert(msg.length > 0, `error message empty: ${msg}`);
}
assert(caught, 'connection-refused error not caught');

// PostForm against a closed port: same catch path
let postCaught = false;
try {
  const form = url.Parse('http://x').Query();
  http.PostForm('http://127.0.0.1:1/submit', form);
} catch (e) {
  postCaught = true;
}
assert(postCaught, 'PostForm error not caught');

assert(http.DefaultMaxHeaderBytes > 0, 'DefaultMaxHeaderBytes');
console.log('go-net-http ok');
