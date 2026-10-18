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

// Node's matching rules on plain certificate objects
const wild = { subject: { CN: 'ignored.example' }, subjectaltname: 'DNS:*.example.com, DNS:api.test.org, IP Address:10.0.0.1' };
assert(tls.checkServerIdentity('www.example.com', wild) === undefined, 'wildcard altname');
assert(tls.checkServerIdentity('API.test.org.', wild) === undefined, 'case-insensitive, trailing dot');
assert(tls.checkServerIdentity('10.0.0.1', wild) === undefined, 'IP altname');
const deep = tls.checkServerIdentity('a.b.example.com', wild);
assert(deep !== undefined && (deep as NodeJS.ErrnoException).code === 'ERR_TLS_CERT_ALTNAME_INVALID', 'a wildcard covers one label');
assert(deep !== undefined && deep.message === "Hostname/IP does not match certificate's altnames: Host: a.b.example.com. is not in the cert's altnames: DNS:*.example.com, DNS:api.test.org, IP Address:10.0.0.1", 'altname message');
const ipErr = tls.checkServerIdentity('10.0.0.2', wild);
assert(ipErr !== undefined && ipErr.message.endsWith("IP: 10.0.0.2 is not in the cert's list: 10.0.0.1"), 'IP mismatch message');
assert(tls.checkServerIdentity('host.local', { subject: { CN: 'host.local' } }) === undefined, 'CN without altnames');
const cnErr = tls.checkServerIdentity('other.local', { subject: { CN: 'host.local' } });
assert(cnErr !== undefined && cnErr.message.endsWith("Host: other.local. is not cert's CN: host.local"), 'CN mismatch');
const none = tls.checkServerIdentity('x.y', { subjectaltname: '' });
assert(none !== undefined && none.message.endsWith('Cert does not contain a DNS name'), 'no names');
assert(tls.checkServerIdentity('bar.com', { subjectaltname: 'DNS:*.com' }) !== undefined, 'no wildcard on two-label names');

const server = tls.createServer({ key: KEY, cert: CERT }, (socket) => {
  socket.end('hi');
});

server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;
  const seen: string[] = [];
  // The default check uses the real certificate
  const client = tls.connect({
    host: '127.0.0.1',
    port: port,
    ca: CERT,
    servername: 'localhost',
    checkServerIdentity: (host: string, cert: tls.PeerCertificate) => {
      seen.push(host);
      assert(tls.checkServerIdentity(host, cert) === undefined, 'checkServerIdentity accepts the peer certificate');
      return undefined;
    }
  }, () => {
    assert(client.authorized && seen.join(',') === 'localhost', 'custom checkServerIdentity is called with the servername');
    client.resume();
    client.end();
    // A custom check that rejects
    const rejected = tls.connect({
      host: '127.0.0.1',
      port: port,
      ca: CERT,
      checkServerIdentity: (_host: string, _cert: tls.PeerCertificate) => new Error('pinned key mismatch')
    });
    rejected.on('error', (err: Error) => {
      assert(err.message === 'pinned key mismatch', 'an error from checkServerIdentity fails the connection');
      server.close();
    });
  });
});
