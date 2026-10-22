// dgram socket options: setBroadcast / setTTL / multicast TTL, loopback and
// interface, addMembership / dropMembership (a multicast round trip on loopback)
import * as dgram from 'node:dgram';

const unbound = dgram.createSocket('udp4');
let code = '';
try {
  unbound.setBroadcast(true);
} catch (e: any) {
  code = e.code;
}
assert(code === 'EBADF', `options before bind throw EBADF (${code})`);
unbound.close();

let badGroup = '';
const other = dgram.createSocket('udp4');
other.bind(0, () => {
  try {
    other.addMembership('10.0.0.1');
  } catch (e: any) {
    badGroup = e.code;
  }
  assert(badGroup === 'EINVAL', `a unicast group is EINVAL (${badGroup})`);
  other.close();
});

const group = '239.255.42.99';
const receiver = dgram.createSocket({ type: 'udp4', reuseAddr: true });
receiver.on('message', (msg, rinfo) => {
  assert(String(msg) === 'hello group', `multicast payload: ${String(msg)}`);
  assert(rinfo.family === 'IPv4', 'rinfo family');
  receiver.dropMembership(group, '127.0.0.1');
  receiver.close();
  sender.close();
  console.log('multicast ok');
});
receiver.bind(0, () => {
  receiver.addMembership(group, '127.0.0.1');
  const port = receiver.address().port;
  sender.bind(0, () => {
    sender.setBroadcast(true);
    assert(sender.setTTL(64) === 64, 'setTTL returns the ttl');
    assert(sender.setMulticastTTL(2) === 2, 'setMulticastTTL returns the ttl');
    assert(sender.setMulticastLoopback(true) === true, 'setMulticastLoopback returns the flag');
    sender.setMulticastInterface('127.0.0.1');
    sender.send('hello group', port, group);
  });
});
const sender = dgram.createSocket('udp4');
