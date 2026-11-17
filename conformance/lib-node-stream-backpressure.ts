import { Readable, Writable, PassThrough, pipeline, getDefaultHighWaterMark } from 'node:stream';

// Writable: write() returns false once highWaterMark bytes are buffered
// (the write in progress included); 'drain' fires once the buffer empties
const slowDone: Array<() => void> = [];
const slow = new Writable({
  highWaterMark: 10,
  write(_chunk, _enc, cb) {
    slowDone.push(() => cb());
  }
});
assert(slow.writableHighWaterMark === 10, 'writableHighWaterMark');
const r1 = slow.write('abcd');
const r2 = slow.write('efghij');
console.log('writes:', r1, r2, slow.writableLength, slow.writableNeedDrain);
assert(r1 === true && r2 === false, 'write() returns false at highWaterMark');
assert(slow.writableLength === 10 && slow.writableNeedDrain, 'writableLength counts bytes; needDrain');
let drains = 0;
slow.on('drain', () => drains++);
function flushSlow(): void {
  const next = slowDone.shift();
  if (next) {
    next();
    setImmediate(flushSlow);
  }
}
setImmediate(flushSlow);

// Defaults: 16 KiB of bytes, 16 objects
assert(new Writable().writableHighWaterMark === 16384, 'default byte highWaterMark');
assert(new Writable({ objectMode: true }).writableHighWaterMark === 16, 'default object highWaterMark');
assert(new Readable().readableHighWaterMark === 16384, 'default readable highWaterMark');
assert(getDefaultHighWaterMark(false) === 16384 && getDefaultHighWaterMark(true) === 16, 'getDefaultHighWaterMark');

// No 'drain' unless a write() returned false
const quick = new Writable({
  write(_chunk, _enc, cb) {
    cb();
  }
});
let quickDrains = 0;
quick.on('drain', () => quickDrains++);
quick.write('a');
quick.write('b');

// Readable: push() returns false once highWaterMark is buffered
const held = new Readable({ highWaterMark: 3, read() {} });
const pushes = [held.push('a'), held.push('b'), held.push('c')];
console.log('pushes:', pushes.join(','), held.readableLength);
assert(pushes.join(',') === 'true,true,false' && held.readableLength === 3, 'push() returns false at highWaterMark');
const objects = new Readable({ objectMode: true, highWaterMark: 2, read() {} });
assert(objects.push({ n: 1 }) && !objects.push({ n: 2 }) && objects.readableLength === 2, 'object-mode push');

// _read is only called while the buffer is below highWaterMark
let reads = 0;
const counted: Readable = new Readable({
  highWaterMark: 4,
  read() {
    reads++;
    counted.push('x');
  }
});
counted.on('readable', () => {});

// pipe(): a fast source pauses while the slow destination is over its highWaterMark
let produced = 0;
let consumed = 0;
let maxAhead = 0;
let sawPaused = false;
const source: Readable = new Readable({
  objectMode: true,
  highWaterMark: 2,
  read() {
    if (produced === 40) {
      source.push(null);
      return;
    }
    produced++;
    source.push(produced);
  }
});
const sink = new Writable({
  objectMode: true,
  highWaterMark: 2,
  write(_chunk, _enc, cb) {
    maxAhead = Math.max(maxAhead, produced - consumed);
    if (source.isPaused()) sawPaused = true;
    setImmediate(() => {
      consumed++;
      cb();
    });
  }
});
source.pipe(sink);
let pipeFinished = false;
sink.on('finish', () => {
  pipeFinished = true;
  check();
});

// pipeline(): the same through a PassThrough
let piped = 0;
let pipedProduced = 0;
let pipedAhead = 0;
const gen: Readable = new Readable({
  objectMode: true,
  highWaterMark: 1,
  read() {
    if (pipedProduced === 30) {
      gen.push(null);
      return;
    }
    pipedProduced++;
    gen.push(`c${pipedProduced}`);
  }
});
const drainSlowly = new Writable({
  objectMode: true,
  highWaterMark: 1,
  write(_chunk, _enc, cb) {
    pipedAhead = Math.max(pipedAhead, pipedProduced - piped);
    setImmediate(() => {
      piped++;
      cb();
    });
  }
});
let pipelineDone = false;
pipeline(gen, new PassThrough({ objectMode: true, highWaterMark: 1 }), drainSlowly, (err) => {
  assert(!err, 'pipeline error');
  pipelineDone = true;
  check();
});

let checked = false;
function check(): void {
  if (!pipeFinished || !pipelineDone || checked) return;
  checked = true;
  console.log('drains:', drains, 'quick drains:', quickDrains, 'reads:', reads);
  assert(drains === 1, 'one drain after the slow writes');
  assert(quickDrains === 0, 'no drain without a false write()');
  assert(reads >= 4 && reads <= 5 && counted.readableLength >= 4, 'reads stop at highWaterMark');
  console.log('pipe:', consumed, 'max ahead', maxAhead, 'paused', sawPaused);
  assert(consumed === 40, 'pipe delivered everything');
  assert(maxAhead <= 6 && sawPaused, 'pipe paused the source');
  console.log('pipeline:', piped, 'max ahead', pipedAhead, pipelineDone);
  assert(piped === 30 && pipelineDone, 'pipeline delivered everything');
  assert(pipedAhead <= 6, 'pipeline held the source back');
}
setTimeout(() => assert(checked, 'pipe and pipeline finished'), 2000);
