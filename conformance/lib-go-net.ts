import * as net from 'go:net';
import * as textproto from 'go:net/textproto';
import * as cookiejar from 'go:net/http/cookiejar';
import * as httputil from 'go:net/http/httputil';
import * as httptrace from 'go:net/http/httptrace';
import * as http from 'go:net/http';
import * as url from 'go:net/url';
import * as context from 'go:context';
import * as bufio from 'go:bufio';
import * as bytes from 'go:bytes';
import * as strings from 'go:strings';
import * as io from 'go:io';

// net: addresses.
const ip = net.ParseIP('192.168.1.10');
assert(ip.String() === '192.168.1.10' && ip.To4() !== null, 'net.ParseIP');
assert(net.ParseIP('not-an-ip') === null, 'net.ParseIP invalid');
const [host, port] = net.SplitHostPort('example.com:8080');
assert(host === 'example.com' && port === '8080', 'net.SplitHostPort');
assert(net.JoinHostPort('::1', '80') === '[::1]:80', 'net.JoinHostPort');
const [, network] = net.ParseCIDR('10.0.0.0/8');
assert(network.Contains(net.ParseIP('10.1.2.3')) === true, 'net.ParseCIDR Contains');
assert(network.String() === '10.0.0.0/8', 'net.IPNet String');

// net: loopback TCP round-trip.
const ln = net.Listen('tcp', '127.0.0.1:0');
assert(strings.HasPrefix(ln.Addr().String(), '127.0.0.1:') === true, 'net.Listen addr');
const client = net.Dial('tcp', ln.Addr().String());
client.Write(bytes.NewBufferString('ping').Bytes());
client.Close();
const server = ln.Accept();
assert(bytes.NewBuffer(io.ReadAll(server)).String() === 'ping', 'net loopback read');
server.Close();
ln.Close();

// net/textproto.
assert(textproto.CanonicalMIMEHeaderKey('content-type') === 'Content-Type', 'textproto.CanonicalMIMEHeaderKey');
const tr = textproto.NewReader(bufio.NewReader(strings.NewReader('X-Key: one\r\nX-Key: two\r\n\r\n')));
const header = tr.ReadMIMEHeader();
assert(header.Get('X-Key') === 'one' && header.Values('X-Key').length === 2, 'textproto ReadMIMEHeader');

// net/http/cookiejar.
const jar = cookiejar.New(null);
const site = url.Parse('http://example.com/');
jar.SetCookies(site, [new http.Cookie({ Name: 'session', Value: 'abc' })]);
const cookies = jar.Cookies(site);
assert(cookies.length === 1 && cookies[0].Value === 'abc', 'cookiejar Set/Get');

// net/http/httputil.
const req = http.NewRequest('GET', 'http://example.com/path?q=1', null);
const dump = bytes.NewBuffer(httputil.DumpRequest(req, false)).String();
assert(strings.HasPrefix(dump, 'GET /path?q=1 HTTP/1.1') === true, 'httputil.DumpRequest');

// net/http/httptrace: hooks attach to a context.
let hooked = false;
const trace = new httptrace.ClientTrace({
  GetConn: (hostPort: string) => {
    hooked = hostPort !== '';
  }
});
const ctx = httptrace.WithClientTrace(context.Background(), trace);
assert(httptrace.ContextClientTrace(ctx) !== null, 'httptrace.WithClientTrace');
httptrace.ContextClientTrace(ctx).GetConn('example.com:80');
assert((hooked as boolean) === true, 'httptrace hook runs');
