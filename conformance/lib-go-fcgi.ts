import * as fcgi from 'go:net/http/fcgi';
import * as http from 'go:net/http';
import * as httptest from 'go:net/http/httptest';
import * as maps from 'go:maps';
import * as slices from 'go:slices';
import * as net from 'go:net';
import * as io from 'go:io';
import * as strings from 'go:strings';
import * as time from 'go:time';

// A TS class as the http.Handler behind a FastCGI responder
class Handler {
  ServeHTTP(w: http.ResponseWriter, r: http.Request): void {
    const env = fcgi.ProcessEnv(r);
    w.Header().Set('Content-Type', 'text/plain');
    w.WriteHeader(201);
    io.WriteString(w, `${r.Method} ${r.URL.Path} ${r.Header.Get('X-Probe')} ${env['SCRIPT_FILENAME']}`);
  }
}

// Outside FastCGI there is no extra environment
const plain = httptest.NewRequest('GET', '/', null);
assert(slices.Collect(maps.Keys(fcgi.ProcessEnv(plain))).length === 0, 'ProcessEnv of a plain request');

const listener = net.Listen('tcp', '127.0.0.1:0');
time.AfterFunc(0, () => {
  fcgi.Serve(listener, new Handler());
});

// The web server side of FastCGI: records of [version, type, id, length, padding]
function record(type: number, content: number[]): number[] {
  return [1, type, 0, 1, content.length >> 8, content.length & 0xff, 0, 0, ...content];
}

function pair(name: string, value: string): number[] {
  const out = [name.length, value.length];
  for (let i = 0; i < name.length; i++) out.push(name.charCodeAt(i));
  for (let i = 0; i < value.length; i++) out.push(value.charCodeAt(i));
  return out;
}

const params = [
  ...pair('REQUEST_METHOD', 'POST'),
  ...pair('SERVER_PROTOCOL', 'HTTP/1.1'),
  ...pair('REQUEST_URI', '/probe/hello?x=1'),
  ...pair('SCRIPT_FILENAME', '/srv/probe.ts'),
  ...pair('HTTP_X_PROBE', 'yes')
];
const conn = net.Dial('tcp', listener.Addr().String());
conn.Write(
  new Uint8Array([
    ...record(1, [0, 1, 0, 0, 0, 0, 0, 0]), // BEGIN_REQUEST: responder, close when done
    ...record(4, params),
    ...record(4, []),
    ...record(5, []) // empty stdin
  ])
);
const reply = io.ReadAll(conn);
conn.Close();

// Concatenate the STDOUT records up to END_REQUEST
let stdout = '';
let ended = false;
for (let at = 0; at + 8 <= reply.length; ) {
  const type = reply[at + 1];
  const length = reply[at + 4] * 256 + reply[at + 5];
  if (type === 6) {
    for (let i = 0; i < length; i++) stdout += String.fromCharCode(reply[at + 8 + i]);
  }
  if (type === 3) ended = true;
  at += 8 + length + reply[at + 6];
}
assert(ended, 'END_REQUEST record');
assert(strings.HasPrefix(stdout, 'Status: 201 Created\r\n'), 'status line');
assert(strings.Contains(stdout, 'Content-Type: text/plain\r\n'), 'response header');
assert(strings.HasSuffix(stdout, '\r\n\r\nPOST /probe/hello yes /srv/probe.ts'), 'handler body with ProcessEnv');
