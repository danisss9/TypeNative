// res.addTrailers(): trailing headers after a chunked body, read by the client
// as res.trailers once the body has ended
import * as http from 'node:http';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Trailer', 'X-Checksum');
  res.write('chunk one, ');
  res.addTrailers({ 'X-Checksum': 'abc123', 'X-Count': '2' });
  res.end('chunk two');
});

server.listen(0, '127.0.0.1', () => {
  const address = server.address() as { port: number };
  http.get(`http://127.0.0.1:${address.port}/`, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      assert(body === 'chunk one, chunk two', `body: ${body}`);
      assert(res.headers['transfer-encoding'] === 'chunked', 'chunked encoding');
      assert(res.trailers['x-checksum'] === 'abc123', `trailer: ${res.trailers['x-checksum']}`);
      assert(res.trailers['x-count'] === '2', 'undeclared trailers come too');
      server.close();
      console.log('trailers ok');
    });
  });
});
