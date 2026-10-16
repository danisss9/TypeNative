import EventEmitter from 'node:events';

class Counter extends EventEmitter {
  count = 0;
  label: string;
  constructor(label: string) {
    super();
    this.label = label;
  }
  increment(): void {
    this.count++;
    this.emit('change', this.count);
    if (this.count === 3) this.emit('done');
  }
}

const counter = new Counter('clicks');
const values: number[] = [];
counter.on('change', (n: number) => values.push(n));
let finished = false;
counter.once('done', () => {
  finished = true;
});
counter.increment();
counter.increment();
counter.increment();
assert(values.join(',') === '1,2,3' && finished, 'subclass emits through inherited methods');
assert(counter.label === 'clicks' && counter.listenerCount('change') === 1, 'subclass state and inherited queries');
