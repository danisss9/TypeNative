import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
const seen: string[] = [];
const onData = (value: string, n: number) => seen.push(`${value}:${n}`);
emitter.on('data', onData);
emitter.once('data', (value: string) => seen.push(`once:${value}`));
emitter.prependListener('data', () => seen.push('first'));

assert(emitter.emit('data', 'a', 1) === true, 'emit returns true with listeners');
emitter.emit('data', 'b', 2);
assert(seen.join(' ') === 'first a:1 once:a first b:2', 'order, once, prepend');
assert(emitter.listenerCount('data') === 2 && emitter.eventNames().join() === 'data', 'listenerCount / eventNames');
emitter.off('data', onData);
assert(emitter.listenerCount('data') === 1, 'off removes the listener');
assert(emitter.emit('nothing') === false, 'emit without listeners');

let added = '';
emitter.on('newListener', (name: string) => {
  added = name;
});
emitter.on('later', () => {});
assert(added === 'later', 'newListener event');

emitter.removeAllListeners('data');
assert(emitter.listenerCount('data') === 0, 'removeAllListeners(event)');

let unhandled = '';
try {
  emitter.emit('error', new Error('boom'));
} catch (e) {
  unhandled = (e as Error).message;
}
assert(unhandled === 'boom', "'error' without listeners throws");
emitter.on('error', (err: Error) => {
  unhandled = 'handled ' + err.message;
});
emitter.emit('error', new Error('again'));
assert(unhandled === 'handled again', "'error' listener");
assert(emitter.setMaxListeners(20).getMaxListeners() === 20, 'max listeners');
assert(EventEmitter.defaultMaxListeners === 10, 'defaultMaxListeners');
