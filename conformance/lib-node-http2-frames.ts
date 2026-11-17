// node:http2 frame-level session APIs: the server's 'session' event, ping
// (both ways), settings with localSettings / remoteSettings, altsvc, goaway,
// and getPackedSettings / getUnpackedSettings. Only settings this probe sets
// are compared: each implementation advertises its own initial values.
import http2 from 'node:http2';
import type { AddressInfo } from 'node:net';

const defaults = http2.getDefaultSettings();
console.log(
  'defaults',
  defaults.maxFrameSize,
  defaults.maxConcurrentStreams,
  defaults.maxHeaderSize
);
assert(
  defaults.maxFrameSize === 16384 &&
    defaults.maxConcurrentStreams === 4294967295 &&
    defaults.maxHeaderSize === 65535 &&
    defaults.enablePush === true,
  'getDefaultSettings'
);

const packed = http2.getPackedSettings({
  maxConcurrentStreams: 100,
  initialWindowSize: 65535,
  enablePush: false
});
console.log('packed', packed.toString('hex'));
assert(packed.toString('hex') === '00020000000000030000006400040000ffff', 'packed settings bytes');
const unpacked = http2.getUnpackedSettings(packed);
assert(
  unpacked.enablePush === false &&
    unpacked.maxConcurrentStreams === 100 &&
    unpacked.initialWindowSize === 65535,
  'unpacked settings'
);
const custom = http2.getUnpackedSettings(Buffer.from('000700000001', 'hex'));
assert(
  custom.customSettings !== undefined && custom.customSettings['7'] === 1,
  'unknown settings id'
);

let badLength = '';
try {
  http2.getUnpackedSettings(Buffer.alloc(3));
} catch (err: any) {
  badLength = err.code;
}
assert(
  badLength === 'ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH',
  'packed length must be a multiple of six'
);

let badValue = '';
try {
  http2.getPackedSettings({ maxFrameSize: 1 });
} catch (err: any) {
  badValue = err.code;
}
assert(badValue === 'ERR_HTTP2_INVALID_SETTING_VALUE', 'settings range check');

const events: string[] = [];
let serverSession: http2.ServerHttp2Session | undefined;
let serverSawConcurrency = 0;
let serverClosed = false;
const server = http2.createServer();
server.on('session', (session) => {
  serverSession = session;
  console.log('server session', session.type, session.alpnProtocol, session.encrypted);
  assert(
    session.type === 0 && session.alpnProtocol === 'h2c' && !session.encrypted,
    'server session state'
  );
  session.on('ping', (payload: Buffer) => events.push(`server ping ${payload.toString()}`));
  session.on('remoteSettings', (settings: http2.Settings) => {
    if (settings.maxConcurrentStreams === 50) serverSawConcurrency = 50;
  });
  session.on('close', () => (serverClosed = true));
});
server.on('stream', (stream, headers) => {
  assert(stream.session === serverSession, 'a stream belongs to its connection session');
  if (headers[':path'] === '/alt') {
    stream.session.altsvc('h2=":8000"', stream.id ?? 0);
    stream.session.altsvc('h2=":9000"', 'http://example.org');
  }
  stream.respond({ ':status': 200 });
  stream.end(`frames ${headers[':path']}`);
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
const port = (server.address() as AddressInfo).port;
const client = http2.connect(`http://127.0.0.1:${port}`);
assert(client.type === 1, 'client session type');
client.on('error', (err) => console.log('client error', err.message));
client.on('ping', (payload: Buffer) => events.push(`client ping ${payload.toString()}`));
client.on('altsvc', (alt: string, origin: string, streamId: number) =>
  events.push(`altsvc ${alt} ${origin || '-'} ${streamId}`)
);
let localSettingsEvents = 0;
client.on('localSettings', () => localSettingsEvents++);

await new Promise<void>((resolve) => client.on('connect', () => resolve()));

// ping: the callback follows the peer's ACK, with the payload echoed
const echoed = await new Promise<string>((resolve) => {
  const sent = client.ping(Buffer.from('abcdefgh'), (err, duration, payload) => {
    assert(err === null && duration >= 0, 'ping callback');
    resolve(payload.toString());
  });
  assert(sent === true, 'ping returns true');
});
console.log('ping', echoed);
assert(echoed === 'abcdefgh', 'ping payload is echoed');

// settings: a SETTINGS frame; the callback and 'localSettings' follow the ACK
const acked = await new Promise<number>((resolve) => {
  client.settings({ maxConcurrentStreams: 50, enablePush: false }, (err, settings) => {
    assert(err === null, 'settings callback');
    assert(!client.pendingSettingsAck, 'acknowledged');
    resolve(Number(settings.maxConcurrentStreams));
  });
  assert(client.pendingSettingsAck, 'waiting for the ACK');
});
console.log(
  'settings',
  acked,
  client.localSettings.maxConcurrentStreams,
  client.localSettings.enablePush
);
assert(
  acked === 50 &&
    client.localSettings.maxConcurrentStreams === 50 &&
    client.localSettings.enablePush === false,
  'local settings'
);
assert(localSettingsEvents >= 1, "'localSettings' events");

// A stream: the server answers with two ALTSVC frames first
const body = await new Promise<string>((resolve, reject) => {
  const stream = client.request({ ':path': '/alt' });
  let text = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => (text += chunk));
  stream.on('end', () => resolve(text));
  stream.on('error', reject);
  stream.end();
});
console.log('body', body);
assert(body === 'frames /alt', 'streams still work');
assert(serverSawConcurrency === 50, "the server's remoteSettings");

// The server pings the client too
const serverEcho = await new Promise<string>((resolve) => {
  serverSession!.ping(Buffer.from('12345678'), (err, duration, payload) => {
    assert(err === null, 'server ping callback');
    resolve(payload.toString());
  });
});
assert(serverEcho === '12345678', 'server ping payload');

// goaway: the client hears it (code, last stream id, opaque data)
const goaway = await new Promise<string>((resolve) => {
  client.on('goaway', (code: number, lastStreamID: number, opaque: Buffer) =>
    resolve(`${code} ${lastStreamID} ${opaque.toString()}`)
  );
  serverSession!.goaway(0, 1, Buffer.from('bye'));
});
console.log('goaway', goaway);
assert(goaway === '0 1 bye', "the client's 'goaway'");

client.destroy();
await new Promise<void>((resolve) => server.close(() => resolve()));
await new Promise<void>((resolve) => setTimeout(resolve, 50));
console.log(events.join(' | '));
assert(
  events.join(' | ') ===
    'server ping abcdefgh | altsvc h2=":8000" - 1 | altsvc h2=":9000" http://example.org 0 | client ping 12345678',
  'frames seen by the peers'
);
assert(serverClosed, 'server session closed');
