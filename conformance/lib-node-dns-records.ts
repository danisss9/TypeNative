// dns record types Go's resolver hides: resolveAny / resolveCaa / resolveNaptr /
// resolvePtr / resolveSoa, resolve4 { ttl: true }, and the record-query errors,
// against a tiny DNS server on loopback
import dgram from 'node:dgram';
import dns from 'node:dns';
import { Resolver as PromiseResolver } from 'node:dns/promises';

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function wireName(name: string): Buffer {
  const parts: Buffer[] = [];
  for (const label of name.split('.')) {
    parts.push(Buffer.from([label.length]));
    parts.push(Buffer.from(label));
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

function charString(text: string): Buffer {
  return Buffer.concat([Buffer.from([text.length]), Buffer.from(text)]);
}

// One answer record for the question's name (a pointer to offset 12)
function rr(type: number, ttl: number, data: Buffer): Buffer {
  return Buffer.concat([u16(0xc00c), u16(type), u16(1), u32(ttl), u16(data.length), data]);
}

function records(name: string, qtype: number): Buffer[] {
  const out: Buffer[] = [];
  if (name !== 'rec.example.test' && name !== '4.3.2.10.in-addr.arpa') return out;
  const a = rr(1, 300, Buffer.from([10, 2, 3, 4]));
  const soa = rr(6, 60, Buffer.concat([wireName('ns1.example.test'), wireName('admin.example.test'), u32(2024010101), u32(7200), u32(900), u32(1209600), u32(86400)]));
  const caa = rr(257, 60, Buffer.concat([Buffer.from([0, 5]), Buffer.from('issue'), Buffer.from('letsencrypt.org')]));
  const naptr = rr(35, 60, Buffer.concat([u16(100), u16(10), charString('S'), charString('SIP+D2U'), charString(''), wireName('_sip._udp.example.test')]));
  const ptr = rr(12, 60, wireName('host.example.test'));
  const txt = rr(16, 60, Buffer.concat([charString('v=1'), charString('k=x')]));
  if (qtype === 1) out.push(a);
  if (qtype === 6) out.push(soa);
  if (qtype === 257) out.push(caa);
  if (qtype === 35) out.push(naptr);
  if (qtype === 12) out.push(ptr);
  if (qtype === 255) {
    out.push(a);
    out.push(soa);
    out.push(txt);
    out.push(caa);
  }
  return out;
}

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
  const found = name.endsWith('example.test') || name.endsWith('in-addr.arpa');
  const answers = records(name, qtype);
  const header = Buffer.concat([u16(query.readUInt16BE(0)), u16(found ? 0x8180 : 0x8183), u16(1), u16(answers.length), u16(0), u16(0)]);
  return Buffer.concat([header, question, ...answers]);
}

const server = dgram.createSocket('udp4');
server.on('message', (msg, rinfo) => {
  server.send(answer(msg), rinfo.port, rinfo.address);
});

server.bind(0, '127.0.0.1', () => {
  const port = server.address().port;
  const resolver = new dns.Resolver({ timeout: 2000, tries: 1 });
  resolver.setServers([`127.0.0.1:${port}`]);
  resolver.resolveSoa('rec.example.test', (err, soa) => {
    assert(err === null, `resolveSoa: ${err}`);
    assert(soa.nsname === 'ns1.example.test' && soa.hostmaster === 'admin.example.test', 'SOA names');
    assert(soa.serial === 2024010101 && soa.refresh === 7200 && soa.retry === 900 && soa.expire === 1209600 && soa.minttl === 86400, 'SOA numbers');
    resolver.resolve4('rec.example.test', { ttl: true }, (err2, addresses) => {
      assert(err2 === null, `resolve4 ttl: ${err2}`);
      assert(addresses.length === 1 && addresses[0].address === '10.2.3.4' && addresses[0].ttl === 300, 'A with its TTL');
      resolver.resolve('rec.example.test', 'NAPTR', (err3, naptr) => {
        assert(err3 === null, `NAPTR: ${err3}`);
        const n = naptr[0];
        assert(n.order === 100 && n.preference === 10 && n.flags === 'S' && n.service === 'SIP+D2U' && n.regexp === '', 'NAPTR fields');
        assert(n.replacement === '_sip._udp.example.test', 'NAPTR replacement');
        promises(port);
      });
    });
  });
});

async function promises(port: number): Promise<void> {
  const resolver = new PromiseResolver({ timeout: 2000, tries: 1 });
  resolver.setServers([`127.0.0.1:${port}`]);
  const caa = await resolver.resolveCaa('rec.example.test');
  assert(caa.length === 1 && caa[0].critical === 0 && caa[0].issue === 'letsencrypt.org', 'CAA record');
  const ptr = await resolver.resolvePtr('4.3.2.10.in-addr.arpa');
  assert(ptr.length === 1 && ptr[0] === 'host.example.test', 'PTR record');

  const any = await resolver.resolveAny('rec.example.test');
  const types = any.map((r) => r.type).join(',');
  assert(types === 'A,TXT,SOA,CAA', `ANY record types: ${types}`);
  for (const record of any) {
    if (record.type === 'A') assert(record.address === '10.2.3.4' && record.ttl === 300, 'ANY A');
    if (record.type === 'TXT') assert(record.entries.join(' ') === 'v=1 k=x', 'ANY TXT entries');
    if (record.type === 'SOA') assert(record.minttl === 86400, 'ANY SOA');
  }

  let code = '';
  let syscall = '';
  try {
    await resolver.resolveSoa('missing.invalid');
  } catch (e: any) {
    code = e.code;
    syscall = e.syscall;
  }
  assert(code === 'ENOTFOUND' && syscall === 'querySoa', `NXDOMAIN: ${code} ${syscall}`);
  code = '';
  try {
    await resolver.resolveCaa('empty.example.test');
  } catch (e: any) {
    code = e.code;
  }
  assert(code === 'ENODATA', `no records: ${code}`);
  server.close();
  console.log('dns records ok');
}
