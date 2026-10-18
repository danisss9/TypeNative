import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';

const server = http.createServer((req, res) => {
  res.end(`plain:${req.headers.upgrade ?? 'none'}`);
});

server.on('upgrade', (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
  assert(req.headers.upgrade === 'echo' && req.url === '/chat', 'upgrade request');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: echo\r\nConnection: Upgrade\r\n\r\n');
  if (head.length > 0) socket.write(`head:${head.toString()}|`);
  socket.on('data', (chunk) => socket.write(`echo:${chunk}`));
});

server.on('connect', (req: http.IncomingMessage, socket: net.Socket, _head: Buffer) => {
  assert(req.method === 'CONNECT' && req.url === 'example.test:443', 'connect request');
  socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  socket.on('data', (chunk) => {
    socket.end(String(chunk).toUpperCase());
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;
  let pending = 3;
  const done = () => {
    pending--;
    if (pending === 0) server.close();
  };

  // Client 'upgrade'
  const req = http.request({ port, host: '127.0.0.1', path: '/chat', headers: { Connection: 'Upgrade', Upgrade: 'echo' } });
  req.on('upgrade', (res: http.IncomingMessage, socket: net.Socket, _head: Buffer) => {
    assert(res.statusCode === 101 && res.headers.upgrade === 'echo', 'client sees 101');
    socket.once('data', (chunk) => {
      assert(String(chunk) === 'echo:ping', 'upgraded socket round trip');
      socket.destroy();
      done();
    });
    socket.write('ping');
  });
  req.end();

  // Client 'connect' (a tunnel)
  const tunnel = http.request({ port, host: '127.0.0.1', method: 'CONNECT', path: 'example.test:443' });
  tunnel.on('connect', (res: http.IncomingMessage, socket: net.Socket, _head: Buffer) => {
    assert(res.statusCode === 200, 'connect response');
    let reply = '';
    socket.on('data', (chunk) => (reply += chunk));
    socket.on('end', () => {
      assert(reply === 'THROUGH THE TUNNEL', 'tunnel round trip');
      done();
    });
    socket.write('through the tunnel');
  });
  tunnel.end();

  // Bytes after the request's headers arrive as `head`
  const raw = net.connect(port, '127.0.0.1', () => {
    raw.write('GET /chat HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: echo\r\n\r\nearly');
  });
  let rawReply = '';
  raw.on('data', (chunk) => {
    rawReply += chunk;
    if (rawReply.includes('head:early|')) {
      assert(rawReply.startsWith('HTTP/1.1 101 Switching Protocols'), 'raw upgrade response');
      raw.destroy();
      done();
    }
  });
});

// Without an 'upgrade' listener the request is an ordinary one
const plainServer = http.createServer((req, res) => {
  res.end(`plain:${req.headers.upgrade}`);
});
plainServer.listen(0, '127.0.0.1', () => {
  const port = (plainServer.address() as AddressInfo).port;
  const req = http.request({ port, host: '127.0.0.1', headers: { Connection: 'Upgrade', Upgrade: 'foo' } }, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      assert(res.statusCode === 200 && body === 'plain:foo', 'unhandled upgrade is a normal request');
      plainServer.close();
    });
  });
  req.end();
});
