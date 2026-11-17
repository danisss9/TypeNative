// node:http2 frame-level session APIs: ping, settings, goaway, altsvc, 'session',
// and getPackedSettings / getUnpackedSettings
import http2 from 'node:http2';
import type { AddressInfo } from 'node:net';

const defaults = http2.getDefaultSettings();
console.log('defaults', defaults.maxFrameSize, defaults.maxConcurrentStreams, defaults.maxHeaderSize);
assert(
  defaults.maxFrameSize === 16384 &&
    defaults.maxConcurrentStreams === 4294967295 &&
    defaults.maxHeaderSize === 65535 &&
    defaults.enablePush === true,
  'getDefaultSettings'
);

const packed = http2.getPackedSettings({ maxConcurrentStreams: 100, initialWindowSize: 65535, enablePush: false });
console.log('packed', packed.toString('hex'));
assert(packed.toString('hex') === '00020000000000030000006400040000ffff', 'packed settings bytes');
const unpacked = http2.getUnpackedSettings(packed);
assert(
  unpacked.enablePush === false && unpacked.maxConcurrentStreams === 100 && unpacked.initialWindowSize === 65535,
  'unpacked settings'
);
const custom = http2.getUnpackedSettings(Buffer.from('000700000001', 'hex'));
assert(custom.customSettings !== undefined && custom.customSettings['7'] === 1, 'unknown settings id');

let badLength = '';
try {
  http2.getUnpackedSettings(Buffer.alloc(3));
} catch (err: any) {
  badLength = err.code;
}
assert(badLength === 'ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH', 'packed length must be a multiple of six');

let badValue = '';
try {
  http2.getPackedSettings({ maxFrameSize: 1 });
} catch (err: any) {
  badValue = err.code;
}
assert(badValue === 'ERR_HTTP2_INVALID_SETTING_VALUE', 'settings range check');

let serverSession: http2.ServerHttp2Session | undefined;
let serverPinged = false;
let serverSettings = false;
const server = http2.createServer();
server.on('session', (session, socket) => {
  serverSession = session;
  console.log('server session', session.type, session.alpnProtocol, socket.remotePort);
  assert(session.type === 'server' && !session.encrypted && session.alpnProtocol === 'h2c', 'server session state');
  assert(session.localSettings.maxFrameSize === 16384 && !session.pendingSettingsAck, 'session settings');
  session.ping((err, duration) => {
    assert(err === null && duration >= 0, 'server ping callback');
    serverPinged = true;
  });
  session.settings({ maxFrameSize: 32768 }, (err) => {
    assert(err === null, 'server settings callback');
    serverSettings = true;
  });
  session.altsvc('h2=":8443"', 'https://example.com');
});
server.on('stream', (stream) => {
  assert(stream.session === serverSession, 'stream uses its connection session');
  stream.respond({ ':status': 200 });
  stream.end('frames');
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
const port = (server.address() as AddressInfo).port;
const client = http2.connect(`http://127.0.0.1:${port}`);
client.on('error', (err) => console.log('client error', err.message));

const payload = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
await new Promise<void>((resolve, reject) => {
  client.on('connect', () => {
    const sent = client.ping(payload, (err, duration, data) => {
      console.log('ping', err === null, duration >= 0, data.toString('hex'));
      assert(err === null && duration >= 0, 'ping callback');
      assert(data.toString('hex') === payload.toString('hex'), 'ping payload is echoed');
      resolve();
    });
    assert(sent === true, 'ping returns true');
  });
});

await new Promise<void>((resolve) => {
  client.settings({ initialWindowSize: 65536 }, (err, settings) => {
    console.log('settings', err === null, settings.initialWindowSize);
    assert(err === null && settings.initialWindowSize === 65536, 'client settings callback');
    resolve();
  });
});

const response = await new Promise<string>((resolve, reject) => {
  const stream = client.request({ ':path': '/' });
  let body = '';
  stream.setEncoding('utf8');
  stream.on('response', (headers) => assert(headers[':status'] === 200, 'response after frames'));
  stream.on('data', (chunk: string) => (body += chunk));
  stream.on('end', () => resolve(body));
  stream.on('error', reject);
  stream.end();
});
console.log('body', response);
assert(response === 'frames', 'streams still work');

client.goaway(0, 0, Buffer.from('bye'));
assert(serverSession !== undefined && serverPinged && serverSettings, 'server session frames');
client.close();
server.close();
