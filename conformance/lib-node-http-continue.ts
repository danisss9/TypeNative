// node:http custom reason phrases and the 'checkContinue' event (Expect: 100-continue)
import http from 'node:http';
import type { AddressInfo } from 'node:net';

let continued = 0;
let requests = 0;
const server = http.createServer((req, res) => {
  requests++;
  req.resume();
  req.on('end', () => {
    res.writeHead(207, 'Multi-Status Custom');
    res.end('plain');
  });
});
server.on('checkContinue', (req, res) => {
  continued++;
  assert(req.headers['expect'] === '100-continue', 'checkContinue sees Expect');
  res.writeContinue();
  req.resume();
  req.on('end', () => {
    res.statusMessage = 'Totally Custom';
    res.end('continued');
  });
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
const port = (server.address() as AddressInfo).port;

// Expect: 100-continue goes to 'checkContinue' instead of 'request'
const first = await new Promise<http.IncomingMessage>((resolve, reject) => {
  const req = http.request(
    { port, host: '127.0.0.1', method: 'POST', headers: { Expect: '100-continue' } },
    (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    }
  );
  req.on('error', reject);
  req.end('payload');
});
console.log('continued', first.statusCode, first.statusMessage);
assert(first.statusCode === 200 && first.statusMessage === 'Totally Custom', 'res.statusMessage reaches the client');
assert(continued === 1 && requests === 0, 'checkContinue replaces request');

// No Expect: the ordinary 'request' path, with a writeHead reason phrase
const second = await new Promise<http.IncomingMessage>((resolve, reject) => {
  http
    .get({ port, host: '127.0.0.1' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    })
    .on('error', reject);
});
console.log('plain', second.statusCode, second.statusMessage);
assert(second.statusCode === 207 && second.statusMessage === 'Multi-Status Custom', 'writeHead(status, message)');
assert(requests === 1 && continued === 1, 'request path');

// Without a 'checkContinue' listener the server answers 100 itself, then 'request'
const auto = http.createServer((req, res) => {
  req.resume();
  req.on('end', () => res.end('auto'));
});
await new Promise<void>((resolve) => auto.listen(0, '127.0.0.1', () => resolve()));
const autoPort = (auto.address() as AddressInfo).port;
const third = await new Promise<http.IncomingMessage>((resolve, reject) => {
  const req = http.request(
    { port: autoPort, host: '127.0.0.1', method: 'POST', headers: { Expect: '100-continue' } },
    (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    }
  );
  req.on('error', reject);
  req.end('payload');
});
console.log('auto', third.statusCode, third.statusMessage);
assert(third.statusCode === 200 && third.statusMessage === 'OK', 'automatic 100 Continue');

auto.close();
server.close();
