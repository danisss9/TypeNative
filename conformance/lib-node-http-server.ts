import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

assert(http.STATUS_CODES[404] === 'Not Found' && http.METHODS.includes('PATCH'), 'STATUS_CODES / METHODS');

const server = http.createServer((req, res) => {
  if (req.url === '/json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Custom', 'yes');
    assert(res.getHeader('content-type') === 'application/json' && res.hasHeader('x-custom'), 'getHeader');
    res.end(JSON.stringify({ method: req.method, ua: req.headers['user-agent'] ?? '' }));
    return;
  }
  if (req.url === '/echo' && req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end(`got ${body} (${req.headers['content-type']})`);
    });
    return;
  }
  if (req.url === '/chunks') {
    res.write('a');
    res.write('b');
    res.end('c');
    return;
  }
  res.statusCode = 404;
  res.end('missing');
});

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  let pending = 4;
  const done = () => {
    pending--;
    if (pending === 0) server.close(() => console.log('closed'));
  };

  http.get(`${base}/json`, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(res.statusCode, res.headers['content-type'], res.headers['x-custom'], data);
      assert(res.statusCode === 200 && res.statusMessage === 'OK', 'status 200');
      assert(res.headers['content-type'] === 'application/json', 'content-type');
      assert(res.headers['content-length'] === String(data.length), 'content-length');
      assert(JSON.parse(data).method === 'GET', 'json body');
      done();
    });
  });

  const req = http.request(
    { hostname: '127.0.0.1', port: port, path: '/echo', method: 'POST', headers: { 'Content-Type': 'text/plain' } },
    (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(res.statusCode, data);
        assert(res.statusCode === 201 && data === 'got hello world (text/plain)', 'POST echo');
        done();
      });
    }
  );
  req.write('hello ');
  req.end('world');

  http.get(`${base}/chunks`, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('chunked', res.headers['transfer-encoding'], data);
      assert(data === 'abc' && res.headers['transfer-encoding'] === 'chunked', 'chunked response');
      done();
    });
  });

  http.get(`${base}/nope`, (res) => {
    res.resume();
    res.on('end', () => {
      console.log(res.statusCode, res.statusMessage);
      assert(res.statusCode === 404 && res.statusMessage === 'Not Found', '404');
      done();
    });
  });
});
