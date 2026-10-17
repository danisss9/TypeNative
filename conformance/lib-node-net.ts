import * as net from 'node:net';

assert(net.isIP('127.0.0.1') === 4 && net.isIP('::1') === 6 && net.isIP('nope') === 0, 'isIP');
assert(net.isIPv4('10.0.0.1') && !net.isIPv4('::1') && net.isIPv6('fe80::1'), 'isIPv4 / isIPv6');

const events: string[] = [];
const server = net.createServer((socket) => {
  events.push('connection');
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    socket.write(`echo:${chunk}`);
  });
  socket.on('end', () => {
    events.push('server end');
    socket.end();
  });
});

server.listen(0, '127.0.0.1', () => {
  const addr = server.address() as net.AddressInfo;
  assert(addr.address === '127.0.0.1' && addr.family === 'IPv4' && addr.port > 0, 'address()');
  events.push('listening');
  let received = '';
  const client = net.connect(addr.port, '127.0.0.1', () => {
    events.push('connect');
    assert(client.remotePort === addr.port && client.remoteAddress === '127.0.0.1', 'remote address');
    client.write('hello');
    client.end();
  });
  client.on('data', (chunk) => {
    received += chunk.toString();
  });
  client.on('close', (hadError) => {
    console.log('received', received);
    assert(received === 'echo:hello', 'echo');
    assert(!hadError, 'hadError');
    events.push('client close');
    server.close(() => {
      events.push('server close');
      // 'connect' (client) and 'connection' (server) race, as in Node
      const ordered = events.filter((e) => e !== 'connect' && e !== 'connection');
      console.log(ordered.join(', '));
      assert(ordered.join(',') === 'listening,server end,client close,server close', 'event order');
      assert(events.includes('connect') && events.includes('connection'), 'connect events');
      refused();
    });
  });
});

function refused(): void {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1', () => {
    const port = (probe.address() as net.AddressInfo).port;
    probe.close(() => {
      const socket = net.createConnection({ port: port, host: '127.0.0.1' });
      socket.on('error', (err: any) => {
        console.log(err.code, err.syscall);
        assert(err.code === 'ECONNREFUSED' && err.syscall === 'connect', 'ECONNREFUSED');
        assert(err.message === `connect ECONNREFUSED 127.0.0.1:${port}`, 'refused message');
      });
    });
  });
}
