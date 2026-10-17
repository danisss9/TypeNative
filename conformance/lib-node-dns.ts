import dns from 'node:dns';
import * as dnsPromises from 'node:dns/promises';

dns.lookup('127.0.0.1', (err, address, family) => {
  console.log('literal', address, family);
  assert(err === null && address === '127.0.0.1' && family === 4, 'lookup of an IP literal');
});

dns.lookup('localhost', { all: true }, (err, addresses) => {
  assert(err === null && addresses.length > 0, 'lookup all');
  const loopback = addresses.some((a) => a.address === '127.0.0.1' || a.address === '::1');
  console.log('localhost resolves to loopback:', loopback);
  assert(loopback, 'localhost is loopback');
});

dns.lookup('localhost', 4, (err, address, family) => {
  assert(err === null && address === '127.0.0.1' && family === 4, 'lookup family 4');
});

dns.lookup('no-such-host.invalid', (err) => {
  console.log(err?.code, err?.syscall, err?.message);
  assert(err !== null && err.code === 'ENOTFOUND' && err.syscall === 'getaddrinfo', 'ENOTFOUND');
  assert(err!.message === 'getaddrinfo ENOTFOUND no-such-host.invalid', 'ENOTFOUND message');
});

async function main(): Promise<void> {
  const first = await dnsPromises.lookup('127.0.0.1');
  assert(first.address === '127.0.0.1' && first.family === 4, 'promises.lookup');
  const all = await dns.promises.lookup('localhost', { all: true });
  assert(all.length > 0, 'dns.promises.lookup all');
  try {
    await dnsPromises.lookup('no-such-host.invalid');
    assert(false, 'should reject');
  } catch (err: any) {
    assert(err.code === 'ENOTFOUND' && err.hostname === 'no-such-host.invalid', 'rejection');
  }
  console.log('servers is an array:', Array.isArray(dns.getServers()));
}
main();
