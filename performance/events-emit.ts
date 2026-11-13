// perf: `EventEmitter` `emit` to listeners taking 0, 1 and 2 arguments
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';

const bus = new EventEmitter();
let total = 0;
bus.on('tick', () => {
  total++;
});
bus.on('data', (n: number) => {
  total += n & 7;
});
bus.on('pair', (a: number, b: string) => {
  total += a + b.length;
});

const n = 3_000_000;
const start = performance.now();
for (let i = 0; i < n; i++) {
  bus.emit('tick');
  bus.emit('data', i);
  bus.emit('pair', i & 3, 'ab');
}
const elapsed = performance.now() - start;

console.log(`checksum: ${total}`);
console.log(`elapsed: ${elapsed.toFixed(2)} ms`);
