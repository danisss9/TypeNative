import { EventEmitter, captureRejectionSymbol } from 'node:events';

// A subclass's [Symbol.for('nodejs.rejection')] method handles rejections
// that captureRejections catches, instead of an 'error' event
const handled: string[] = [];
class Job extends EventEmitter {
  constructor() {
    super({ captureRejections: true });
  }
  [Symbol.for('nodejs.rejection')](err: Error, event: string | symbol, ...args: unknown[]): void {
    handled.push(`${err.message}:${String(event)}:${args.join('/')}`);
  }
}
const job = new Job();
let errorEvents = 0;
job.on('error', () => errorEvents++);
async function run(n: number, label: string): Promise<void> {
  throw new Error(`boom${n}${label}`);
}
job.on('run', (n: number, label: string) => run(n, label));
job.emit('run', 7, 'x');

// captureRejectionSymbol is the same symbol
assert(captureRejectionSymbol === Symbol.for('nodejs.rejection'), 'captureRejectionSymbol');
assert(EventEmitter.captureRejectionSymbol === captureRejectionSymbol, 'static captureRejectionSymbol');
class Worker extends EventEmitter {
  [captureRejectionSymbol](err: Error, event: string | symbol): void {
    handled.push(`worker ${err.message}:${String(event)}`);
  }
}
const worker = new Worker({ captureRejections: true });
async function task(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  throw new Error('late');
}
worker.on('task', () => task());
worker.emit('task');

// Without the method, the rejection is still an 'error' event
class Plain extends EventEmitter {}
const plain = new Plain({ captureRejections: true });
const plainErrors: string[] = [];
plain.on('error', (err: Error) => plainErrors.push(err.message));
async function fail(): Promise<void> {
  throw new Error('y');
}
plain.on('x', () => fail());
plain.emit('x');

setTimeout(() => {
  console.log(handled.join(', '), plainErrors.join(','));
  assert(handled.join(', ') === 'boom7x:run:7/x, worker late:task', 'rejection handlers');
  assert(errorEvents === 0, 'no error event when the handler exists');
  assert(plainErrors.join(',') === 'y', 'plain subclass gets an error event');
}, 20);
