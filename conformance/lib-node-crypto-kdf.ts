import { pbkdf2Sync, hkdfSync } from 'node:crypto';

const key = pbkdf2Sync('password', 'salt', 1, 20, 'sha1');
assert(key.toString('hex') === '0c60c80f961f0e71f3a9b524af6012062fe037a6', 'pbkdf2 (RFC 6070 vector)');
assert(pbkdf2Sync('pw', 'salt', 1000, 32, 'sha256').length === 32, 'pbkdf2 key length');

const okm = Buffer.from(hkdfSync('sha256', 'secret', 'salt', 'info', 16));
assert(okm.length === 16, 'hkdf length');
assert(okm.toString('hex') === Buffer.from(hkdfSync('sha256', 'secret', 'salt', 'info', 16)).toString('hex'), 'hkdf is deterministic');
