import { Transform, PassThrough, Readable, Writable, type TransformCallback } from 'node:stream';

const upper = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  },
  flush(callback) {
    callback(null, '!');
  }
});

class Exclaim extends Transform {
  _transform(chunk: Buffer, encoding: string, callback: TransformCallback): void {
    this.push(chunk.toString() + '?');
    callback();
  }
}

const out: string[] = [];
const collector = new Writable({
  write(chunk, encoding, callback) {
    out.push(chunk.toString());
    callback();
  }
});

Readable.from(['ab', 'cd'], { objectMode: false }).pipe(upper).pipe(new Exclaim()).pipe(new PassThrough()).pipe(collector);

let done = false;
collector.on('finish', () => {
  done = true;
});

setTimeout(() => {
  assert(done, 'pipe chain finishes');
  assert(out.join('|') === 'AB?|CD?|!?', 'transform + flush + subclass _transform through pipes');
}, 200);
