import http2 from 'node:http2';

const { HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS, HTTP2_HEADER_METHOD } = http2.constants;

// Cleartext HTTP/2 (h2c): the 'stream' API
const server = http2.createServer();
server.on('stream', (stream, headers) => {
  const path = String(headers[HTTP2_HEADER_PATH]);
  if (path === '/echo') {
    const parts: string[] = [];
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => parts.push(chunk));
    stream.on('end', () => {
      stream.respond({ [HTTP2_HEADER_STATUS]: 201, 'content-type': 'text/plain', 'x-method': String(headers[HTTP2_HEADER_METHOD]) });
      stream.end(`echo:${parts.join('')}`);
    });
    return;
  }
  stream.respond({ ':status': 200, 'content-type': 'application/json' });
  stream.end(JSON.stringify({ path, scheme: headers[':scheme'], agent: headers['user-agent'] ?? 'none' }));
});

server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const client = http2.connect(`http://127.0.0.1:${port}`);
  client.on('error', (err) => console.log('client error', err.message));
  let connected = false;
  client.on('connect', () => (connected = true));

  const get = client.request({ ':path': '/hello?x=1', 'user-agent': 'probe' });
  get.setEncoding('utf8');
  let body = '';
  get.on('response', (headers) => {
    console.log('status', headers[':status'], headers['content-type']);
    assert(headers[':status'] === 200 && headers['content-type'] === 'application/json', 'response headers');
  });
  get.on('data', (chunk: string) => (body += chunk));
  get.on('end', () => {
    const parsed = JSON.parse(body);
    console.log('body', parsed.path, parsed.scheme, parsed.agent);
    assert(parsed.path === '/hello?x=1' && parsed.scheme === 'http' && parsed.agent === 'probe', 'request headers reach the stream');

    const post = client.request({ ':method': 'POST', ':path': '/echo' });
    let reply = '';
    let status = 0;
    post.on('response', (headers) => {
      status = Number(headers[':status']);
      assert(headers['x-method'] === 'POST', 'custom response header');
    });
    post.setEncoding('utf8');
    post.on('data', (chunk: string) => (reply += chunk));
    post.on('end', () => {
      console.log('post', status, reply);
      assert(status === 201 && reply === 'echo:part1,part2', 'request body / response');
      assert(connected && client.alpnProtocol === 'h2c' && !client.encrypted, 'session state');
      client.close(() => {
        console.log('session closed');
        server.close();
      });
    });
    post.write('part1,');
    post.end('part2');
  });
  get.end();
});

// The compatibility API: (req, res) handlers on HTTP/2
const compat = http2.createServer((req, res) => {
  assert(req.httpVersion === '2.0' && req.headers[':method'] === 'GET', 'compat request');
  res.setHeader('content-type', 'text/plain');
  res.end(`compat ${req.url}`);
});
compat.listen(0, '127.0.0.1', () => {
  const address = compat.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const client = http2.connect(`http://127.0.0.1:${port}`);
  const req = client.request({ ':path': '/compat' });
  req.setEncoding('utf8');
  let text = '';
  req.on('data', (chunk: string) => (text += chunk));
  req.on('end', () => {
    console.log(text);
    assert(text === 'compat /compat', 'compat response');
    client.close();
    compat.close();
  });
  req.end();
});
