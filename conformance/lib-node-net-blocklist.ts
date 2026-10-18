import net, { BlockList, SocketAddress } from 'node:net';

const list = new BlockList();
list.addAddress('1.2.3.4');
list.addRange('10.0.0.1', '10.0.0.10');
list.addSubnet('8592:757c:efae:4e45::', 64, 'ipv6');
list.addSubnet('192.168.1.0', 24);

assert(list.rules.join('|') === 'Subnet: IPv4 192.168.1.0/24|Subnet: IPv6 8592:757c:efae:4e45::/64|Range: IPv4 10.0.0.1-10.0.0.10|Address: IPv4 1.2.3.4', 'rules, newest first');
assert(list.check('1.2.3.4') && !list.check('1.2.3.5'), 'addAddress');
assert(list.check('10.0.0.5') && list.check('10.0.0.10') && !list.check('10.0.0.11'), 'addRange is inclusive');
assert(list.check('192.168.1.200') && !list.check('192.168.2.1'), 'IPv4 subnet');
assert(list.check('8592:757c:efae:4e45::f', 'ipv6') && !list.check('8592:757c:efae:4e46::1', 'ipv6'), 'IPv6 subnet');
assert(list.check('::ffff:1.2.3.4', 'ipv6'), 'IPv4-mapped IPv6 addresses match IPv4 rules');
assert(!list.check('1.2.3.4', 'ipv6') && !list.check('not an ip'), 'mismatched or invalid addresses do not match');
assert(BlockList.isBlockList(list) && !BlockList.isBlockList({}), 'isBlockList');

let code = '';
try {
  list.addAddress('nope');
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
}
assert(code === 'ERR_INVALID_ADDRESS', 'invalid addresses throw');

const v6 = new SocketAddress({ address: '::1', family: 'ipv6', port: 80 });
assert(v6.address === '::1' && v6.family === 'ipv6' && v6.port === 80 && v6.flowlabel === 0, 'SocketAddress fields');
assert(JSON.stringify(v6) === '{"address":"::1","port":80,"family":"ipv6","flowlabel":0}', 'SocketAddress toJSON');
const defaults = new net.SocketAddress();
assert(defaults.address === '127.0.0.1' && defaults.family === 'ipv4' && defaults.port === 0, 'SocketAddress defaults');
list.addAddress(v6);
assert(list.rules[0] === 'Address: IPv6 ::1' && list.check(v6), 'BlockList accepts SocketAddress');
assert(list.check(new SocketAddress({ address: '1.2.3.4' })), 'check(SocketAddress)');

const parsed = SocketAddress.parse('[::1]:8080');
assert(parsed !== undefined && parsed.address === '::1' && parsed.port === 8080 && parsed.family === 'ipv6', 'SocketAddress.parse');
const parsed4 = SocketAddress.parse('127.0.0.1:443');
assert(parsed4 !== undefined && parsed4.family === 'ipv4' && parsed4.port === 443, 'SocketAddress.parse IPv4');
assert(SocketAddress.parse('garbage') === undefined, 'SocketAddress.parse rejects garbage');

code = '';
try {
  new SocketAddress({ address: 'zz' });
} catch (e) {
  code = (e as NodeJS.ErrnoException).code ?? '';
}
assert(code === 'ERR_INVALID_ADDRESS', 'SocketAddress validates the address');
