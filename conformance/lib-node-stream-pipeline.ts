import { Readable, Transform, Writable, pipeline, finished } from 'node:stream';
import { pipeline as pipelinePromise } from 'node:stream/promises';
import { text, json, buffer } from 'node:stream/consumers';

const doubler = () =>
  new Transform({
    objectMode: true,
    transform(n, encoding, callback) {
      callback(null, (n as number) * 2);
    }
  });

const results: number[] = [];
const collect = () =>
  new Writable({
    objectMode: true,
    write(n, encoding, callback) {
      results.push(n as number);
      callback();
    }
  });

let pipelineError: unknown = 'pending';
pipeline(Readable.from([1, 2, 3]), doubler(), collect(), (err) => {
  pipelineError = err;
});

const failing = new Transform({
  transform(chunk, encoding, callback) {
    callback(new Error('transform failed'));
  }
});
let failure = '';
pipeline(Readable.from(['x'], { objectMode: false }), failing, collect(), (err) => {
  failure = err ? (err as Error).message : 'none';
});

let finishedCalled = false;
const watched = Readable.from(['z']);
finished(watched, () => {
  finishedCalled = true;
});
watched.resume();

async function main() {
  const seen: number[] = [];
  await pipelinePromise(
    Readable.from([5, 6]),
    new Writable({
      objectMode: true,
      write(n, encoding, callback) {
        seen.push(n as number);
        callback();
      }
    })
  );
  assert(seen.join() === '5,6', 'stream/promises pipeline');
  assert((await text(Readable.from(['he', 'llo']))) === 'hello', 'consumers.text');
  assert((await buffer(Readable.from([Buffer.from('ab')]))).length === 2, 'consumers.buffer');
  const value = (await json(Readable.from(['{"a":', '1}']))) as { a: number };
  assert(value.a === 1, 'consumers.json');
}
main();

setTimeout(() => {
  assert(results.join() === '2,4,6' && !pipelineError, 'pipeline with callback');
  assert(failure === 'transform failed', 'pipeline reports errors');
  assert(finishedCalled, 'finished');
}, 300);
