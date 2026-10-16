import { StringDecoder } from 'node:string_decoder';

const euro = Buffer.from('€'); // e2 82 ac
const decoder = new StringDecoder('utf8');
assert(decoder.encoding === 'utf8', 'encoding');
assert(decoder.write(euro.subarray(0, 1)) === '', 'holds an incomplete sequence');
assert(decoder.write(euro.subarray(1, 2)) === '', 'still incomplete');
assert(decoder.write(euro.subarray(2)) === '€', 'completes the character');
assert(decoder.write(Buffer.from('ok')) === 'ok', 'plain ASCII');
decoder.write(euro.subarray(0, 2));
assert(decoder.end() === '�', 'end() flushes an incomplete sequence');

const b64 = new StringDecoder('base64');
assert(b64.write(Buffer.from('ab')) + b64.write(Buffer.from('c')) + b64.end() === 'YWJj', 'base64 groups');
const utf16 = new StringDecoder('utf16le');
const hi = Buffer.from('hi', 'utf16le');
assert(utf16.write(hi.subarray(0, 3)) === 'h' && utf16.end(hi.subarray(3)) === 'i', 'utf16le');
