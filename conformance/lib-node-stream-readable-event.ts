// Paused mode: 'readable' events with read() loops, the final 'readable'
// before 'end', and a 'readable' listener taking precedence over 'data'
import { PassThrough, Readable } from 'node:stream';

const events: string[] = [];
const pt = new PassThrough();
pt.setEncoding('utf8');
pt.on('readable', () => {
  let chunk: any;
  let got = '';
  while ((chunk = pt.read()) !== null) got += chunk;
  events.push(got === '' ? 'readable:empty' : `readable:${got}`);
});
pt.on('end', () => {
  events.push('end');
  assert(events[events.length - 2] === 'readable:empty', `a last readable before end: ${events.join(' ')}`);
  assert(events.slice(0, events.length - 2).join('') !== '', 'data came through readable');
  pulled();
});
pt.write('one ');
pt.end('two');

class Counter extends Readable {
  n = 0;
  _read(): void {
    this.n++;
    this.push(this.n <= 3 ? `#${this.n}` : null);
  }
}

function pulled(): void {
  const counter = new Counter();
  const parts: string[] = [];
  let dataEvents = 0;
  counter.on('data', () => dataEvents++);
  counter.on('readable', () => {
    let chunk: any;
    while ((chunk = counter.read()) !== null) parts.push(String(chunk));
  });
  counter.on('end', () => {
    assert(parts.join('') === '#1#2#3', `pulled chunks: ${parts.join(',')}`);
    assert(dataEvents > 0, "'data' listeners still see what read() returns");
    sized();
  });
}

// read(n): exactly n bytes when buffered, the rest once ended
function sized(): void {
  const src = new PassThrough();
  const sizes: number[] = [];
  src.on('readable', () => {
    let chunk: any;
    while ((chunk = src.read(4)) !== null) sizes.push((chunk as Buffer).length);
  });
  src.on('end', () => {
    assert(sizes.join(',') === '4,4,2', `read(4) sizes: ${sizes.join(',')}`);
    console.log('readable events ok');
  });
  src.end('abcdefghij');
}
