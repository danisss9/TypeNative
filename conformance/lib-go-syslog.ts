// conformance-skip: win32 (Go's log/syslog has no Windows build)
import * as syslog from 'go:log/syslog';
import * as net from 'go:net';
import * as bytes from 'go:bytes';
import * as os from 'go:os';
import * as strings from 'go:strings';
import * as time from 'go:time';

// A UDP "syslog daemon" on loopback: each write is one datagram in the network
// format, <priority>timestamp hostname tag[pid]: message
const daemon = net.ListenPacket('udp', '127.0.0.1:0');
daemon.SetReadDeadline(time.Now().Add(10 * time.Second));

function receive(): string {
  const buf = new Uint8Array(2048);
  const [n] = daemon.ReadFrom(buf);
  return bytes.NewBuffer(buf.slice(0, n)).String();
}

const writer = syslog.Dial('udp', daemon.LocalAddr().String(), syslog.LOG_WARNING | syslog.LOG_DAEMON, 'tnprobe');
const suffix = ` tnprobe[${os.Getpid()}]: `;

// The severity comes from the method, the facility from Dial (daemon = 3 << 3)
writer.Info('hello');
const info = receive();
assert(strings.HasPrefix(info, '<30>') && strings.HasSuffix(info, suffix + 'hello\n'), 'Info');
writer.Err('boom\n');
const err = receive();
assert(strings.HasPrefix(err, '<27>') && strings.HasSuffix(err, suffix + 'boom\n'), 'Err keeps a trailing newline');
writer.Write(bytes.NewBufferString('raw').Bytes());
assert(strings.HasPrefix(receive(), '<28>'), 'Write uses the Dial priority');
writer.Close();

// A second writer with another facility
const local0 = syslog.Dial('udp', daemon.LocalAddr().String(), syslog.LOG_NOTICE | syslog.LOG_LOCAL0, 'tnlog');
local0.Notice('notice');
assert(strings.HasPrefix(receive(), `<${16 * 8 + 5}>`), 'LOG_LOCAL0 | LOG_NOTICE');
local0.Close();
daemon.Close();
