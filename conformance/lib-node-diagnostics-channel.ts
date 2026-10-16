import diagnostics, { channel, subscribe, unsubscribe, hasSubscribers } from 'node:diagnostics_channel';

const requests = channel('app:request');
assert(requests.name === 'app:request' && !requests.hasSubscribers, 'channel');
const received: string[] = [];
const onMessage = (message: unknown, name: string | symbol) => {
  received.push(`${String(name)}:${(message as { path: string }).path}`);
};
requests.subscribe(onMessage);
assert(requests.hasSubscribers && hasSubscribers('app:request'), 'hasSubscribers');
requests.publish({ path: '/a' });
assert(channel('app:request') === requests, 'channels are shared by name');
assert(requests.unsubscribe(onMessage) && !requests.unsubscribe(onMessage), 'unsubscribe');
requests.publish({ path: '/ignored' });

let viaModule = 0;
const counter = () => viaModule++;
subscribe('app:tick', counter);
diagnostics.channel('app:tick').publish(1);
unsubscribe('app:tick', counter);
diagnostics.channel('app:tick').publish(2);
assert(received.join() === 'app:request:/a' && viaModule === 1, 'messages reach current subscribers only');
