import dgram from 'node:dgram';

const server = dgram.createSocket('udp4');
const client = dgram.createSocket({ type: 'udp4' });

server.on('message', (msg, rinfo) => {
  console.log(`server got ${msg.toString()} from ${rinfo.address} (${rinfo.size} bytes)`);
  assert(rinfo.family === 'IPv4' && rinfo.address === '127.0.0.1' && rinfo.size === msg.length, 'rinfo');
  server.send(`pong:${msg}`, rinfo.port, rinfo.address);
});

server.on('listening', () => {
  const addr = server.address();
  assert(addr.address === '127.0.0.1' && addr.family === 'IPv4' && addr.port > 0, 'address()');
  client.on('message', (msg) => {
    console.log('client got', msg.toString());
    assert(msg.toString() === 'pong:ping', 'reply');
    client.close();
    server.close(() => console.log('closed'));
  });
  client.send(Buffer.from('ping'), addr.port, '127.0.0.1', (err, bytes) => {
    assert(err === null && bytes === 4, 'send callback');
  });
});

server.bind(0, '127.0.0.1');
