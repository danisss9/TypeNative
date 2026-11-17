// node:http Agent connection pooling and client request trailers
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const defaults = new http.Agent();
assert(
  defaults.maxSockets === Infinity &&
    defaults.maxTotalSockets === Infinity &&
    defaults.maxFreeSockets === 256 &&
    defaults.keepAliveMsecs === 1000 &&
    defaults.scheduling === 'lifo' &&
    defaults.keepAlive === false &&
    defaults.timeout === undefined,
  'Agent defaults'
);
const configured = new http.Agent({
  maxSockets: 3,
  maxTotalSockets: 4,
  maxFreeSockets: 2,
  keepAlive: true,
  keepAliveMsecs: 1234,
  scheduling: 'fifo'
});
assert(
  configured.maxSockets === 3 &&
    configured.maxTotalSockets === 4 &&
    configured.maxFreeSockets === 2 &&
    configured.keepAlive &&
    configured.keepAliveMsecs === 1234 &&
    configured.scheduling === 'fifo',
  'Agent options'
);
configured.destroy();
assert(http.globalAgent.keepAlive, 'globalAgent keeps connections alive');

const server = http.createServer((req, res) => {
  ports.add(req.socket.remotePort ?? 0);
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    res.setHeader('x-trailer', req.trailers['x-sum'] ?? 'none');
    setTimeout(() => res.end(Buffer.concat(chunks).toString()), 30);
  });
});
let connections = 0;
const ports = new Set<number>();

const get = (agent: http.Agent): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const req = http.get({ port, host: '127.0.0.1', agent }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
  });

const post = (headers: http.OutgoingHttpHeaders, body: string, trailers: http.OutgoingHttpHeaders): Promise<http.IncomingMessage> =>
  new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = http.request({ port, host: '127.0.0.1', method: 'POST', headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
    req.addTrailers(trailers);
    req.end(body);
  });

let port = 0;
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
port = (server.address() as AddressInfo).port;

// keepAlive false: one connection per request
ports.clear();
let agent = new http.Agent({ keepAlive: false });
await get(agent);
await get(agent);
await get(agent);
connections = ports.size;
console.log('no-keepAlive connections', connections);
assert(connections === 3, 'keepAlive false opens a connection per request (' + connections + ')');
agent.destroy();

// keepAlive true: an idle connection is reused
ports.clear();
agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
await get(agent);
await get(agent);
await get(agent);
connections = ports.size;
console.log('keepAlive connections', connections);
assert(connections === 1, 'keepAlive reuses the connection');
agent.destroy();

// maxSockets 1: four concurrent requests share one socket
ports.clear();
agent = new http.Agent({ maxSockets: 1, keepAlive: true });
const batch = await Promise.all([get(agent), get(agent), get(agent), get(agent)]);
assert(batch.length === 4, 'all requests finish');
connections = ports.size;
console.log('maxSockets connections', connections);
assert(connections === 1, 'maxSockets 1 keeps one socket (' + connections + ')');
agent.destroy();

// A chunked request whose Trailer header declares the trailer
const withTrailer = await post({ Trailer: 'x-sum' }, 'abc', { 'x-sum': '42' });
console.log('trailers', withTrailer.trailers['x-sum'], withTrailer.headers['x-trailer']);
assert(withTrailer.headers['x-trailer'] === '42' && withTrailer.trailers['x-sum'] === undefined, 'request trailer');

// end(data) gets a Content-Length, which has no trailers (as Node does)
const withLength = await post({}, 'abc', { 'x-sum': 'ignored' });
assert(withLength.headers['x-trailer'] === 'none', 'no request trailer with a Content-Length');

server.close();
