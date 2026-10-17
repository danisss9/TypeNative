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

import * as tls from 'node:tls';
import type { AddressInfo } from 'node:net';

const server = tls.createServer({ key: KEY, cert: CERT }, (socket) => {
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => socket.end(`secure:${chunk}`));
});

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;
  let pending = 4;
  const done = () => {
    pending--;
    if (pending === 0) server.close();
  };

  // Trusted through `ca`
  const client = tls.connect({ host: '127.0.0.1', port: port, ca: CERT }, () => {
    console.log('authorized:', client.authorized, client.getProtocol());
    assert(client.authorized && client.encrypted, 'authorized with ca');
    const cert = client.getPeerCertificate();
    assert(cert.subject.CN === 'localhost' && cert.issuer.CN === 'localhost', 'peer certificate names');
    assert(cert.subjectaltname === 'DNS:localhost, IP Address:127.0.0.1', 'subjectaltname');
    assert(cert.fingerprint256.startsWith('CE:55:E7:33'), 'fingerprint256');
    assert(cert.valid_to === 'Sep 23 18:51:57 2126 GMT', 'valid_to');
    client.write('ping');
  });
  let reply = '';
  client.on('data', (chunk) => (reply += chunk));
  client.on('close', () => {
    console.log(reply);
    assert(reply === 'secure:ping', 'round trip');
    done();
  });

  // Self-signed and not trusted: rejected by default
  tls.connect(port, '127.0.0.1', {}).on('error', (err: any) => {
    console.log(err.code, err.message);
    assert(err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' && err.message === 'self-signed certificate', 'untrusted');
    done();
  });

  // rejectUnauthorized: false connects and reports the reason
  const lax = tls.connect({ host: '127.0.0.1', port: port, rejectUnauthorized: false }, () => {
    console.log('lax:', lax.authorized, lax.authorizationError);
    assert(!lax.authorized && lax.authorizationError === 'DEPTH_ZERO_SELF_SIGNED_CERT', 'authorizationError');
    lax.end();
    done();
  });

  // A trusted certificate for another name
  tls.connect({ host: '127.0.0.1', port: port, ca: CERT, servername: 'example.com' }).on('error', (err: any) => {
    console.log(err.code);
    assert(err.code === 'ERR_TLS_CERT_ALTNAME_INVALID', 'altname mismatch');
    done();
  });
});
