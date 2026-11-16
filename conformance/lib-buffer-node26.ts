// Node 26 Buffer additions: stringLength, isLatin1, indexOf end, lastIndexOf offset, poolSize, textStream
import { isLatin1 } from 'node:buffer';

assert(Buffer.stringLength(Buffer.from('héllo')) === 5 && Buffer.stringLength(Buffer.from('héllo'), 'latin1') === 6, 'stringLength');
assert(Buffer.stringLength(Buffer.from('hi'), 'base64') === 4 && Buffer.stringLength(new Uint8Array([0xe2, 0x82, 0xac])) === 1, 'stringLength by encoding');
assert(isLatin1('café') && !isLatin1('€'), 'isLatin1 on strings');
assert(Buffer.poolSize === 65536, 'poolSize is 64 KiB');
assert(Buffer.allocUnsafe(16, 8).length === 16, 'allocUnsafe with an alignment');

const buf = Buffer.from('abcabcabc');
assert(buf.indexOf('c', 0, 2) === -1 && buf.indexOf('c', 0, 3) === 2, 'indexOf with an end');
assert(buf.includes('a', 1, 3) === false && buf.includes('a', 1, 4) === true, 'includes with an end');
assert(buf.lastIndexOf('abc') === 6 && buf.lastIndexOf('abc', 5) === 3 && buf.lastIndexOf('abc', -4) === 3, 'lastIndexOf from a byteOffset');
assert(Buffer.from('00ff', 'hex').includes('ff', 0, 'hex'), 'includes with an encoding');

async function main() {
  const blob = new Blob(['hello ', 'world']);
  const reader = blob.textStream().getReader();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += value;
  }
  console.log(text);
  assert(text === 'hello world', 'blob.textStream');
}
main();
