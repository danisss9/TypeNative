// A self-signed P-256 certificate for localhost / 127.0.0.1 (valid until 2126)
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

import * as https from 'node:https';
import type { AddressInfo } from 'node:net';

const server = https.createServer({ key: KEY, cert: CERT }, (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(`hello over ${req.socket.encrypted ? 'tls' : 'tcp'}`);
});

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;
  let pending = 2;
  const done = () => {
    pending--;
    if (pending === 0) server.close();
  };
  https.get({ host: '127.0.0.1', port: port, path: '/', ca: CERT }, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log(res.statusCode, body);
      assert(res.statusCode === 200 && body === 'hello over tls', 'https round trip');
      done();
    });
  });
  https.get(`https://127.0.0.1:${port}/`, () => assert(false, 'untrusted certificate')).on('error', (err: any) => {
    console.log(err.code);
    assert(err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT', 'rejects untrusted certificates');
    done();
  });
});
