// node:http in Node 26: header checks, WebSocket masking, res.writeInformation, req.signal
import * as http from 'node:http';
import * as net from 'node:net';

assert(http.isValidHeaderName('x-ok') && !http.isValidHeaderName('bad name') && !http.isValidHeaderName(''), 'isValidHeaderName');
assert(http.isValidHeaderValue('v\tw') && !http.isValidHeaderValue('a\nb'), 'isValidHeaderValue');

const src = Buffer.from('hello');
const out = Buffer.alloc(8);
http.websocketMask(src, Buffer.from([1, 2, 3, 4]), out, 1, 5);
assert(out.toString('hex') === '0069676f686e0000', 'websocketMask');
const masked = Buffer.from('hello');
http.websocketUnmask(masked, Buffer.from([1, 2, 3, 4]));
assert(masked.toString('hex') === '69676f686e', 'websocketUnmask');

let aborted = false;
const server = http.createServer((req, res) => {
  assert(!req.signal.aborted, 'req.signal');
  req.signal.addEventListener('abort', () => {
    aborted = true;
  });
  res.writeInformation(103, { link: '</style.css>; rel=preload' });
  res.end('done');
});
server.listen(0, () => {
  const port = (server.address() as net.AddressInfo).port;
  // a raw request shows the 103 before the 200
  const socket = net.connect(port, '127.0.0.1', () => {
    socket.write('GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
  });
  let raw = '';
  socket.on('data', (d: Buffer) => (raw += d.toString()));
  socket.on('end', () => {
    console.log(raw.split('\r\n')[0]);
    const info = raw.indexOf('HTTP/1.1 103');
    const final = raw.indexOf('HTTP/1.1 200');
    assert(info === 0 && final > info && /link: <\/style.css>; rel=preload/i.test(raw), '103 then 200');
    server.close();
    // (a request that completes leaves its signal alone, as in Node)
    setTimeout(() => assert(!aborted, 'req.signal stays unaborted'), 50);
  });
});
