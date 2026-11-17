// node:http httpValidation ('strict' | 'relaxed' | 'insecure', Node 26.3)
import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';

const raw = (port: number, byte: number): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(
        Buffer.concat([
          Buffer.from('GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nX-V: a'),
          Buffer.from([byte]),
          Buffer.from('b\r\nConnection: close\r\n\r\n')
        ])
      );
    });
    const chunks: Buffer[] = [];
    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('close', () => resolve(Buffer.concat(chunks).toString('latin1')));
    socket.on('error', reject);
    setTimeout(() => socket.destroy(), 1000);
  });

const status = (response: string): number => Number(response.slice(9, 12));

const strict = http.createServer({ httpValidation: 'strict' }, (req, res) => res.end('ok'));
await new Promise<void>((resolve) => strict.listen(0, '127.0.0.1', () => resolve()));
const strictPort = (strict.address() as AddressInfo).port;
console.log('strict', status(await raw(strictPort, 0x01)), status(await raw(strictPort, 0xe9)), status(await raw(strictPort, 0x7f)));
assert(status(await raw(strictPort, 0x01)) === 400, 'strict rejects a control byte');
assert(status(await raw(strictPort, 0xe9)) === 200, 'strict allows obs-text');
assert(status(await raw(strictPort, 0x7f)) === 400, 'strict rejects DEL');
strict.close();

const relaxed = http.createServer({ httpValidation: 'relaxed' }, (req, res) => res.end('ok'));
await new Promise<void>((resolve) => relaxed.listen(0, '127.0.0.1', () => resolve()));
const relaxedPort = (relaxed.address() as AddressInfo).port;
console.log('relaxed', status(await raw(relaxedPort, 0x01)), status(await raw(relaxedPort, 0x7f)));
assert(status(await raw(relaxedPort, 0x01)) === 200 && status(await raw(relaxedPort, 0x7f)) === 200, 'relaxed accepts control bytes');
relaxed.close();

const insecure = http.createServer({ httpValidation: 'insecure' }, (req, res) => res.end('ok'));
await new Promise<void>((resolve) => insecure.listen(0, '127.0.0.1', () => resolve()));
const insecurePort = (insecure.address() as AddressInfo).port;
console.log('insecure', status(await raw(insecurePort, 0x01)));
assert(status(await raw(insecurePort, 0x01)) === 200, 'insecure accepts control bytes');
insecure.close();

const legacy = http.createServer({ insecureHTTPParser: true }, (req, res) => res.end('ok'));
await new Promise<void>((resolve) => legacy.listen(0, '127.0.0.1', () => resolve()));
assert(status(await raw((legacy.address() as AddressInfo).port, 0x01)) === 200, 'insecureHTTPParser');
legacy.close();

let threw = '';
try {
  http.createServer({ httpValidation: 'lax' as any });
} catch (err: any) {
  threw = err.code;
}
assert(threw === 'ERR_INVALID_ARG_VALUE', 'invalid server httpValidation');

// Outgoing header values: strict rejects control bytes, relaxed/insecure allow them
const check = (options: http.RequestOptions): string => {
  try {
    const req = http.request({ port: strictPort, ...options });
    req.on('error', () => {});
    req.destroy();
    return '';
  } catch (err: any) {
    return err.code;
  }
};
assert(check({ headers: { 'x-v': 'a\x01b' } }) === 'ERR_INVALID_CHAR', 'client strict rejects a control byte');
assert(check({ headers: { 'x-v': 'a\x7fb' } }) === 'ERR_INVALID_CHAR', 'client strict rejects DEL');
assert(check({ headers: { 'x-v': 'aéb' } }) === '', 'client strict allows obs-text');
assert(check({ httpValidation: 'relaxed', headers: { 'x-v': 'a\x01b' } }) === '', 'client relaxed accepts a control byte');
assert(check({ insecureHTTPParser: true, headers: { 'x-v': 'a\x01b' } }) === '', 'client insecureHTTPParser');

let late = '';
try {
  const req = http.request({ port: strictPort });
  req.on('error', () => {});
  req.setHeader('x-v', 'a\x01b');
  req.destroy();
} catch (err: any) {
  late = err.code;
}
assert(late === 'ERR_INVALID_CHAR', 'setHeader validates too');

console.log('validation probe done');
