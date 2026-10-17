import * as http from 'go:net/http';
import * as httptest from 'go:net/http/httptest';

assert(http.StatusText(200) === 'OK', 'StatusText');
assert(http.StatusText(404) === 'Not Found', 'StatusText 404');

const req = http.NewRequest('GET', 'http://example.com/path', null);
assert(req.Method === 'GET', 'NewRequest method');
assert(req.URL.Path === '/path', 'NewRequest URL');

const rec = httptest.NewRecorder();
assert(rec.Code === 200, 'Recorder default code');

const detected = http.DetectContentType([104, 105]);
assert(detected === 'text/plain; charset=utf-8', 'DetectContentType');

let threw = '';
try {
  http.NewRequest('GET', '://bad-url', null);
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'NewRequest error throws');
