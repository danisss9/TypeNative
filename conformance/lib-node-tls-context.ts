// tls.createSecureContext / getCiphers / DEFAULT_MIN_VERSION / DEFAULT_MAX_VERSION
import * as tls from 'node:tls';

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

const ctx = tls.createSecureContext({ key: KEY, cert: CERT, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.3' });
assert(ctx !== undefined && ctx.options.minVersion === 'TLSv1.2' && ctx.options.maxVersion === 'TLSv1.3', 'createSecureContext keeps its options');
assert(tls.createSecureContext() !== undefined, 'createSecureContext() without options');

let badKey = false;
try {
  tls.createSecureContext({ key: 'not a key' });
} catch {
  badKey = true;
}
assert(badKey, 'an unusable key throws');

const ciphers = tls.getCiphers();
assert(ciphers.length > 0 && ciphers.every((name) => name.startsWith('tls_')), 'getCiphers names Go suites');
assert(ciphers.includes('tls_aes_128_gcm_sha256') && ciphers.includes('tls_chacha20_poly1305_sha256'), 'TLS 1.3 suites are listed');

assert(tls.DEFAULT_MIN_VERSION === 'TLSv1.2' && tls.DEFAULT_MAX_VERSION === 'TLSv1.3', 'default versions');
assert(tls.DEFAULT_ECDH_CURVE === 'auto', 'DEFAULT_ECDH_CURVE');
