// dgram source-specific multicast: addSourceSpecificMembership /
// dropSourceSpecificMembership (IP_ADD_SOURCE_MEMBERSHIP, MCAST_JOIN_SOURCE_GROUP)
import * as dgram from 'node:dgram';

function codeOf(f: () => void): string {
  try {
    f();
  } catch (e: any) {
    return String(e.code);
  }
  return '';
}

const plat = process.platform;
const supported = plat === 'win32' || plat === 'linux' || plat === 'darwin' || plat === 'freebsd';

const s4 = dgram.createSocket({ type: 'udp4', reuseAddr: true });
if (supported) {
  // An unbound socket binds first, as in Node
  s4.addSourceSpecificMembership('127.0.0.1', '232.1.1.1');
  assert(s4.address().port > 0, 'membership binds the socket');
  s4.dropSourceSpecificMembership('127.0.0.1', '232.1.1.1');
  s4.addSourceSpecificMembership('127.0.0.1', '232.1.1.2', '127.0.0.1');
  s4.dropSourceSpecificMembership('127.0.0.1', '232.1.1.2', '127.0.0.1');
  const again = codeOf(() => s4.dropSourceSpecificMembership('127.0.0.1', '232.1.1.2', '127.0.0.1'));
  assert(again !== '', `dropping a membership twice throws (${again})`);
  console.log('ipv4 ssm ok');
}
assert(codeOf(() => s4.addSourceSpecificMembership('bad', '232.1.1.1')) === 'EINVAL', 'bad source is EINVAL');
assert(codeOf(() => s4.addSourceSpecificMembership('::1', '232.1.1.1')) === 'EINVAL', 'an IPv6 source on udp4 is EINVAL');
let err: any = null;
try {
  s4.addSourceSpecificMembership('nope', '232.1.1.1');
} catch (e: any) {
  err = e;
}
assert(err.syscall === 'addSourceSpecificMembership' && err.message === 'addSourceSpecificMembership EINVAL', `error shape: ${err.message}`);
s4.close();
assert(codeOf(() => s4.addSourceSpecificMembership('127.0.0.1', '232.1.1.1')) === 'ERR_SOCKET_DGRAM_NOT_RUNNING', 'closed socket');

const s6 = dgram.createSocket('udp6');
s6.bind(0, () => {
  // CI containers may have no IPv6 multicast route: only Windows must join
  const joined = codeOf(() => s6.addSourceSpecificMembership('::1', 'ff3e::1234'));
  if (joined === '') {
    s6.dropSourceSpecificMembership('::1', 'ff3e::1234');
    console.log('ipv6 ssm ok');
  }
  assert(joined === '' || plat !== 'win32', `ipv6 join (${joined})`);
  assert(codeOf(() => s6.addSourceSpecificMembership('127.0.0.1', 'ff3e::1234')) === 'EINVAL', 'an IPv4 source on udp6 is EINVAL');
  s6.close();
});
