// The module-level node:dns functions (setServers / getServers, resolve4 /
// resolve6 / resolveCname / resolveMx / resolveTxt / resolveNs / resolveSrv /
// resolve with an rrtype / reverse), against a loopback server
import dgram from 'node:dgram';
import dns from 'node:dns';
import { resolve4 as resolve4Promise, resolveCname as resolveCnamePromise, resolveTxt as resolveTxtPromise } from 'node:dns/promises';

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
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

function answerFor(name: string, qtype: number): Buffer[] {
  const rr = (type: number, data: Buffer, owner?: Buffer): Buffer =>
    Buffer.concat([owner ?? u16(0xc00c), u16(type), u16(1), Buffer.alloc(4), u16(data.length), data]);
  // A real recursive response to an alias puts the address records under the
  // canonical name, which is how Go's resolver learns the CNAME
  const alias = wireName('alias.example.test');
  const out: Buffer[] = [];
  if (name === 'all.example.test') {
    if (qtype === 1) out.push(rr(1, Buffer.from([10, 2, 3, 4]), alias));
    if (qtype === 28) out.push(rr(28, Buffer.from([0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]), alias));
    if (qtype === 5) out.push(rr(5, wireName('alias.example.test')));
    if (qtype === 15) out.push(rr(15, Buffer.concat([u16(10), wireName('mail.example.test')])));
    if (qtype === 16) out.push(rr(16, charString('a=1')));
    if (qtype === 2) out.push(rr(2, wireName('ns1.example.test')));
    if (qtype === 33) out.push(rr(33, Buffer.concat([u16(1), u16(2), u16(8080), wireName('srv.example.test')])));
  }
  if (name === '4.3.2.10.in-addr.arpa' && qtype === 12) out.push(rr(12, wireName('host.example.test')));
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
  const answers = answerFor(name, qtype);
  const header = Buffer.concat([u16(query.readUInt16BE(0)), u16(found ? 0x8180 : 0x8183), u16(1), u16(answers.length), u16(0), u16(0)]);
  return Buffer.concat([header, question, ...answers]);
}

// The callback form behind a promise, so the checks read top to bottom
function fromCallback<T>(call: (cb: (err: NodeJS.ErrnoException | null, value: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    call((err, value) => {
      if (err) reject(err);
      else resolve(value);
    });
  });
}

const server = dgram.createSocket('udp4');
server.on('message', (msg, rinfo) => {
  server.send(answer(msg), rinfo.port, rinfo.address);
});

server.bind(0, '127.0.0.1', () => {
  const port = server.address().port;
  const address = `127.0.0.1:${port}`;
  dns.setServers([address]);
  assert(dns.getServers().join(',') === address, 'setServers / getServers');

  const addresses = fromCallback<string[]>((cb) => dns.resolve4('all.example.test', cb));
  const v6 = fromCallback<string[]>((cb) => dns.resolve6('all.example.test', cb));
  const cname = fromCallback<string[]>((cb) => dns.resolveCname('all.example.test', cb));
  const mx = fromCallback<{ exchange: string; priority: number }[]>((cb) => dns.resolveMx('all.example.test', cb));
  const txt = fromCallback<string[][]>((cb) => dns.resolveTxt('all.example.test', cb));
  const ns = fromCallback<string[]>((cb) => dns.resolveNs('all.example.test', cb));
  const srv = fromCallback<{ name: string; port: number; priority: number; weight: number }[]>((cb) => dns.resolveSrv('all.example.test', cb));
  const anyMx = fromCallback<{ exchange: string; priority: number }[]>((cb) => dns.resolve('all.example.test', 'MX', cb));
  const hostnames = fromCallback<string[]>((cb) => dns.reverse('10.2.3.4', cb));
  const promised4 = resolve4Promise('all.example.test');
  const promisedCname = resolveCnamePromise('all.example.test');
  const promisedTxt = resolveTxtPromise('all.example.test');

  run(addresses, v6, cname, mx, txt, ns, srv, anyMx, hostnames, promised4, promisedCname, promisedTxt);
});

async function run(
  addresses: Promise<string[]>,
  v6: Promise<string[]>,
  cname: Promise<string[]>,
  mx: Promise<{ exchange: string; priority: number }[]>,
  txt: Promise<string[][]>,
  ns: Promise<string[]>,
  srv: Promise<{ name: string; port: number; priority: number; weight: number }[]>,
  anyMx: Promise<{ exchange: string; priority: number }[]>,
  hostnames: Promise<string[]>,
  promised4: Promise<string[]>,
  promisedCname: Promise<string[]>,
  promisedTxt: Promise<string[][]>
): Promise<void> {
  const a = await addresses;
  assert(a.join(',') === '10.2.3.4', `resolve4: ${a}`);
  const six = await v6;
  assert(six.join(',') === '2001:db8::1', `resolve6: ${six}`);
  const alias = await cname;
  assert(alias.join(',') === 'alias.example.test', `resolveCname: ${alias}`);
  const mail = await mx;
  assert(mail.length === 1 && mail[0].exchange === 'mail.example.test' && mail[0].priority === 10, 'resolveMx');
  const texts = await txt;
  assert(texts.length === 1 && texts[0][0] === 'a=1', `resolveTxt: ${texts}`);
  const nameservers = await ns;
  assert(nameservers.join(',') === 'ns1.example.test', `resolveNs: ${nameservers}`);
  const records = await srv;
  assert(records.length === 1 && records[0].name === 'srv.example.test' && records[0].port === 8080 && records[0].priority === 1 && records[0].weight === 2, 'resolveSrv');
  const grouped = await anyMx;
  assert(grouped.length === 1 && grouped[0].exchange === 'mail.example.test', `resolve(host, 'MX'): ${grouped}`);
  const reverseNames = await hostnames;
  assert(reverseNames.join(',') === 'host.example.test', `reverse: ${reverseNames}`);

  const promised = await promised4;
  assert(promised.join(',') === '10.2.3.4', 'dns/promises resolve4');
  const promisedAlias = await promisedCname;
  assert(promisedAlias.join(',') === 'alias.example.test', `dns/promises resolveCname: ${promisedAlias}`);
  const promisedTexts = await promisedTxt;
  assert(promisedTexts[0][0] === 'a=1', 'dns/promises resolveTxt');

  let code = '';
  try {
    await fromCallback((cb) => dns.resolve4('missing.example.test', cb));
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code === 'ENOTFOUND', `NXDOMAIN is ENOTFOUND: ${code}`);

  server.close();
  console.log('dns module ok');
}
