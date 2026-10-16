import { Writable } from 'node:stream';

const written: string[] = [];
let finalized = false;
const sink = new Writable({
  write(chunk, encoding, callback) {
    written.push(chunk.toString());
    callback();
  },
  final(callback) {
    finalized = true;
    callback();
  }
});

let callbackRan = false;
assert(sink.write('one') === true, 'write returns true below the high-water mark');
sink.write(Buffer.from('two'), () => {
  callbackRan = true;
});
let finished = false;
sink.on('finish', () => {
  finished = true;
});
sink.end('three');
assert(sink.writableEnded && !sink.writableFinished, 'ended, not finished yet');

let afterEnd = '';
sink.on('error', (err) => {
  afterEnd = (err as NodeJS.ErrnoException).code ?? '';
});
sink.write('four');

setTimeout(() => {
  assert(written.join(',') === 'one,two,three', 'chunks arrive in order as Buffers');
  assert(callbackRan && finalized && finished && sink.writableFinished, 'write callback, final, finish');
  assert(afterEnd === 'ERR_STREAM_WRITE_AFTER_END', 'write after end');
}, 100);
