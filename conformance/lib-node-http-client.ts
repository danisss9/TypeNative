import http from 'node:http';
import type { AddressInfo } from 'node:net';

const server = http.createServer((req, res) => {
  if (req.url === '/slow') {
    setTimeout(() => res.end('late'), 300);
    return;
  }
  res.setHeader('Set-Cookie', ['a=1', 'b=2']);
  res.setHeader('Content-Type', 'text/plain');
  const auth = req.headers['authorization'] ?? '';
  res.end(`${req.method} ${req.url} host=${req.headers['host']} x=${req.headers['x-test']} auth=${auth}`);
});

server.listen(0, () => {
  const port = (server.address() as AddressInfo).port;
  let pending = 4;
  const done = () => {
    pending--;
    if (pending === 0) server.close();
  };

  // A URL object plus options; the request is sent by end()
  const url = new URL(`http://127.0.0.1:${port}/path?q=1`);
  const req = http.request(url, { method: 'PUT' }, (res) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => {
      const text = Buffer.concat(chunks).toString();
      console.log(text);
      assert(text === `PUT /path?q=1 host=127.0.0.1:${port} x=42 auth=`, 'request line and headers');
      assert(res.headersDistinct['set-cookie'].length === 2, 'headersDistinct');
      assert(res.rawHeaders.includes('Content-Type'), 'rawHeaders');
      assert(res.headers['content-type'] === 'text/plain', 'lower-case header names');
      done();
    });
  });
  req.setHeader('X-Test', '42');
  assert(req.getHeader('x-test') === '42' && req.hasHeader('X-TEST'), 'client headers');
  req.end();

  // Basic auth from the URL
  http.get(`http://user:pw@127.0.0.1:${port}/auth`, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      assert(body.endsWith('auth=Basic dXNlcjpwdw=='), 'basic auth');
      done();
    });
  });

  // Destroying a request before its response: 'error' (socket hang up), then 'close'
  const slow = http.get({ host: '127.0.0.1', port: port, path: '/slow' }, () => {
    assert(false, 'no response after destroy');
  });
  let sawError = false;
  slow.on('error', (err: any) => {
    sawError = true;
    console.log('destroyed:', err.code, err.message);
    assert(err.code === 'ECONNRESET' && err.message === 'socket hang up', 'socket hang up');
  });
  slow.on('close', () => {
    assert(sawError, 'error before close');
    done();
  });
  setTimeout(() => slow.destroy(), 50);

  // Connection refused
  const probe = http.createServer();
  probe.listen(0, '127.0.0.1', () => {
    const closedPort = (probe.address() as AddressInfo).port;
    probe.close(() => {
      http.get(`http://127.0.0.1:${closedPort}/`).on('error', (err: any) => {
        console.log(err.code, err.syscall);
        assert(err.code === 'ECONNREFUSED' && err.address === '127.0.0.1' && err.port === closedPort, 'ECONNREFUSED');
        done();
      });
    });
  });
});
