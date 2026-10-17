// HTTP/2 over TLS with the certificate of lib-node-tls.ts
const KEY = [
  '-----BEGIN PRIVATE KEY-----',
  'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg13CLkrNZBxi3bccl',
  'VaIBY81AFrn93mOnHev5x9YIwLihRANCAARY1NDgSaUwBm8T35pc9SFkV0IQfXKC',
  'Z1/eTUxCPUHwrLCzmOmGa7+CsOE1ymxwDSpfKg70OhdGWQm0ceUAqRFq',
  '-----END PRIVATE KEY-----'
].join('\n');
const CERT = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBnDCCAUGgAwIBAgIUXEjmf68L//PSvfeG0sKBfa7wXUEwCgYIKoZIzj0EAwIw',
  'FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAxNzE4NTE1N1oYDzIxMjYwOTIz',
  'MTg1MTU3WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO',
  'PQMBBwNCAARY1NDgSaUwBm8T35pc9SFkV0IQfXKCZ1/eTUxCPUHwrLCzmOmGa7+C',
  'sOE1ymxwDSpfKg70OhdGWQm0ceUAqRFqo28wbTAdBgNVHQ4EFgQUc63MuYxj8gxs',
  'qnKjILfVod1e5KwwHwYDVR0jBBgwFoAUc63MuYxj8gxsqnKjILfVod1e5KwwDwYD',
  'VR0TAQH/BAUwAwEB/zAaBgNVHREEEzARgglsb2NhbGhvc3SHBH8AAAEwCgYIKoZI',
  'zj0EAwIDSQAwRgIhAJXDRYy6sItdqipwx+X7oGzomx9NtxetSMjqeN5fd1G4AiEA',
  'y76gM5xPrbYc01vZM8zNJidnsWdUtbQZxXH+u97KOrA=',
  '-----END CERTIFICATE-----'
].join('\n');

import http2 from 'node:http2';

const server = http2.createSecureServer({ key: KEY, cert: CERT });
server.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200 });
  stream.end(`secure ${headers[':path']} ${headers[':scheme']}`);
});
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  // An untrusted certificate fails the session; its stream is canceled...
  const strict = http2.connect(`https://127.0.0.1:${port}`);
  let sessionCode = '';
  let streamCode = '';
  let seen = 0;
  const failed = () => {
    seen++;
    if (seen < 2) return;
    console.log('untrusted', sessionCode, streamCode);
    assert(sessionCode === 'DEPTH_ZERO_SELF_SIGNED_CERT', 'self-signed certificate rejected');
    assert(streamCode === 'ERR_HTTP2_STREAM_CANCEL', 'stream canceled');
    strict.destroy();
    // ...and passes with the certificate as a CA
    const client = http2.connect(`https://localhost:${port}`, { ca: CERT });
    const req = client.request({ ':path': '/tls' });
    req.setEncoding('utf8');
    let body = '';
    req.on('response', (headers) => assert(headers[':status'] === 200, 'status'));
    req.on('data', (chunk: string) => (body += chunk));
    req.on('end', () => {
      console.log(body, client.alpnProtocol, client.encrypted);
      assert(body === 'secure /tls https' && client.alpnProtocol === 'h2' && client.encrypted === true, 'TLS session');
      client.close();
      server.close();
    });
    req.end();
  };
  strict.on('error', (err: NodeJS.ErrnoException) => {
    sessionCode = String(err.code);
    failed();
  });
  const failing = strict.request({ ':path': '/' });
  failing.on('error', (err: NodeJS.ErrnoException) => {
    streamCode = String(err.code);
    failed();
  });
  failing.end();
});
