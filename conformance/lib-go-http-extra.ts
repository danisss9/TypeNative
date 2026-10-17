import * as pprof from 'go:net/http/pprof';
import * as cgi from 'go:net/http/cgi';
import * as http from 'go:net/http';
import * as httptest from 'go:net/http/httptest';
import * as os from 'go:os';
import * as strings from 'go:strings';

// net/http/pprof: profile handlers (also registered on DefaultServeMux).
const rec = httptest.NewRecorder();
pprof.Handler('goroutine').ServeHTTP(rec, httptest.NewRequest('GET', '/debug/pprof/goroutine?debug=1', null));
assert(rec.Code === 200 && strings.Contains(rec.Body.String(), 'goroutine') === true, 'pprof.Handler');
const index = httptest.NewRecorder();
http.DefaultServeMux.ServeHTTP(index, httptest.NewRequest('GET', '/debug/pprof/', null));
assert(index.Code === 200, 'pprof routes on DefaultServeMux');

// net/http/cgi: a request rebuilt from CGI environment variables.
os.Setenv('REQUEST_METHOD', 'POST');
os.Setenv('SERVER_PROTOCOL', 'HTTP/1.1');
os.Setenv('REQUEST_URI', '/submit?x=1');
os.Setenv('HTTP_HOST', 'example.com');
os.Setenv('CONTENT_LENGTH', '0');
const req = cgi.Request();
assert(req.Method === 'POST' && req.URL.Path === '/submit' && req.Host === 'example.com', 'cgi.Request');
assert(req.URL.Query().Get('x') === '1', 'cgi.Request query');
