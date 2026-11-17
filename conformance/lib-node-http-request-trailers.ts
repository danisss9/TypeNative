// req.addTrailers() on a ClientRequest with a streamed body: the trailers go
// after the chunked body without a Trailer header naming them, as in Node, and
// the server reads them as req.trailers once the body has ended
import * as http from 'node:http';

const server = http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => (body += chunk));
  req.on('end', () => {
    console.log(body, req.headers['transfer-encoding'], JSON.stringify(req.trailers));
    assert(body === 'part one, part two', `body: ${body}`);
    assert(req.headers['transfer-encoding'] === 'chunked', 'a chunked request body');
    assert(req.trailers['x-checksum'] === 'abc123', `trailer: ${req.trailers['x-checksum']}`);
    assert(req.trailers['x-parts'] === '1, 2', 'repeated trailer values are joined');
    assert(req.headers['trailer'] === undefined, 'no Trailer header is declared for us');
    res.end(`trailers ${Object.keys(req.trailers).length}`);
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as { port: number }).port;
  const req = http.request({ port, host: '127.0.0.1', method: 'POST', path: '/upload' }, (res) => {
    let text = '';
    res.setEncoding('utf8');
    res.on('data', (chunk: string) => (text += chunk));
    res.on('end', () => {
      console.log(text);
      assert(text === 'trailers 2', 'server saw both trailers');
      server.close();
    });
  });
  req.write('part one, ');
  req.addTrailers({ 'X-Checksum': 'abc123', 'x-parts': ['1', '2'] });
  req.end('part two');
});
