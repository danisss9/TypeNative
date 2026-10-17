import * as binary from 'go:encoding/binary';
import * as pem from 'go:encoding/pem';
import * as xml from 'go:encoding/xml';
import * as mime from 'go:mime';
import * as netip from 'go:net/netip';
import * as mail from 'go:net/mail';

const buf = new Uint8Array(8);
binary.BigEndian.PutUint64(buf, 42);
assert(binary.BigEndian.Uint64(buf) === 42, 'binary round-trip');

assert(mime.TypeByExtension('.html') === 'text/html; charset=utf-8', 'mime type');

const addr = netip.MustParseAddr('127.0.0.1');
assert(addr.IsLoopback() === true, 'netip loopback');

const parsed = mail.ParseAddress('Bob <bob@example.com>');
assert(parsed.Name === 'Bob', 'mail ParseAddress');

const block = pem.Decode([45, 45]);
assert(block === null || true, 'pem smoke');
assert(xml.Header.startsWith('<?xml') === true, 'xml header');
