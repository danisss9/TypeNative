import dgram from 'node:dgram';
import dns from 'node:dns';
import { Resolver as PromiseResolver } from 'node:dns/promises';

// A tiny DNS server: A and TXT records for svc.example.test, NXDOMAIN otherwise
function answer(query: Buffer): Buffer {
  let offset = 12;
  const labels: string[] = [];
  while (query[offset] !== 0) {
    const length = query[offset];
    labels.push(query.subarray(offset + 1, offset + 1 + length).toString());
    offset += length + 1;
  }
  const qtype = query.readUInt16BE(offset + 1);
  const question = query.subarray(12, offset + 5);
  const name = labels.join('.').toLowerCase();
  const records: Buffer[] = [];
  if (name === 'svc.example.test' && qtype === 1) {
    for (const ip of ['10.1.2.3', '10.1.2.4']) {
      const rr = Buffer.alloc(16);
      rr.writeUInt16BE(0xc00c, 0);
      rr.writeUInt16BE(1, 2);
      rr.writeUInt16BE(1, 4);
      rr.writeUInt32BE(60, 6);
      rr.writeUInt16BE(4, 10);
      const parts = ip.split('.');
      for (let i = 0; i < 4; i++) rr[12 + i] = Number(parts[i]);
      records.push(rr);
    }
  }
  if (name === 'svc.example.test' && qtype === 16) {
    const text = 'hello=world';
    const rr = Buffer.alloc(12 + 1 + text.length);
    rr.writeUInt16BE(0xc00c, 0);
    rr.writeUInt16BE(16, 2);
    rr.writeUInt16BE(1, 4);
    rr.writeUInt32BE(60, 6);
    rr.writeUInt16BE(1 + text.length, 10);
    rr[12] = text.length;
    rr.write(text, 13);
    records.push(rr);
  }
  const header = Buffer.alloc(12);
  header.writeUInt16BE(query.readUInt16BE(0), 0);
  header.writeUInt16BE(name.endsWith('example.test') && name.startsWith('svc.') ? 0x8180 : 0x8183, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(records.length, 6);
  return Buffer.concat([header, question, ...records]);
}

const server = dgram.createSocket('udp4');
let queries = 0;
server.on('message', (msg, rinfo) => {
  queries++;
  server.send(answer(msg), rinfo.port, rinfo.address);
});
// A server that never answers
const silent = dgram.createSocket('udp4');
silent.on('message', () => {});

const formatting = new dns.Resolver();
formatting.setServers(['1.2.3.4', '[::1]:5353', '8.8.8.8:53', '::2']);
assert(formatting.getServers().join(',') === '1.2.3.4,[::1]:5353,8.8.8.8,::2', 'getServers formats like Node');
let invalid = '';
try {
  formatting.setServers(['not-an-ip']);
} catch (e) {
  invalid = (e as NodeJS.ErrnoException).code ?? '';
}
assert(invalid === 'ERR_INVALID_IP_ADDRESS', 'setServers validates addresses');

let pending = 2;
function bound() {
  pending--;
  if (pending > 0) return;
  const port = server.address().port;
  const silentPort = silent.address().port;
  const resolver = new dns.Resolver();
  resolver.setServers([`127.0.0.1:${port}`]);
  resolver.resolve4('svc.example.test', (err, addresses) => {
    assert(err === null && addresses.join(',') === '10.1.2.3,10.1.2.4', 'Resolver.resolve4 asks its own server');
    resolver.resolveTxt('svc.example.test', (err2, records) => {
      assert(err2 === null && records[0][0] === 'hello=world', 'Resolver.resolveTxt');
      resolver.resolve4('missing.example.test', (err3, _none) => {
        assert(err3 !== null && err3.code === 'ENOTFOUND' && err3.hostname === 'missing.example.test', 'NXDOMAIN is ENOTFOUND');
        promises(port, silentPort);
      });
    });
  });
}

async function promises(port: number, silentPort: number) {
  const resolver = new PromiseResolver();
  resolver.setServers([`127.0.0.1:${port}`]);
  const addresses = await resolver.resolve('svc.example.test', 'A');
  assert(addresses.length === 2 && addresses[0] === '10.1.2.3', 'promises Resolver.resolve');
  assert(queries >= 4, 'queries reached the fake server');

  const slow = new PromiseResolver({ timeout: 100, tries: 1 });
  slow.setServers([`127.0.0.1:${silentPort}`]);
  let timeoutCode = '';
  try {
    await slow.resolve4('svc.example.test');
  } catch (e) {
    timeoutCode = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(timeoutCode === 'ETIMEOUT', 'timeout option');

  const cancelled = new dns.Resolver();
  cancelled.setServers([`127.0.0.1:${silentPort}`]);
  cancelled.resolve4('svc.example.test', (err, _addresses) => {
    assert(err !== null && err.code === 'ECANCELLED', 'cancel() fails outstanding queries');
    dns.lookupService('127.0.0.1', 22, (err2, hostname, service) => {
      assert(err2 === null && hostname === 'localhost' && service === 'ssh', 'lookupService');
      server.close();
      silent.close();
    });
  });
  setTimeout(() => cancelled.cancel(), 20);
}

server.bind(0, '127.0.0.1', bound);
silent.bind(0, '127.0.0.1', bound);
