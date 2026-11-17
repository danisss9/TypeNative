// allowHTTP1: one TLS server answers HTTP/2 (ALPN h2) and HTTP/1.1 clients
// (ALPN http/1.1) through the same compatibility handler; certificate of lib-node-tls.ts
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
import https from 'node:https';

const server = http2.createSecureServer({ key: KEY, cert: CERT, allowHTTP1: true }, (req, res) => {
  res.end(`${req.httpVersion} ${req.url}`);
});
server.listen(0, () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  https.get({ host: 'localhost', port, path: '/one', ca: CERT }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk: string) => (body += chunk));
    res.on('end', () => {
      console.log('https', body);
      assert(body === '1.1 /one', 'HTTP/1.1 over the HTTP/2 server');
      const client = http2.connect(`https://localhost:${port}`, { ca: CERT });
      const req = client.request({ ':path': '/two' });
      let text = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => (text += chunk));
      req.on('end', () => {
        console.log('h2', text);
        assert(text === '2.0 /two', 'HTTP/2 on the same server');
        client.close();
        server.close();
      });
      req.end();
    });
  });
});
