// ES2026 Uint8Array base64 / hex: options, set-into forms, strict decoding
const bytes = new Uint8Array([251, 255, 0, 104, 105]);
console.log(bytes.toBase64(), bytes.toBase64({ alphabet: 'base64url', omitPadding: true }), bytes.toHex());
assert(bytes.toBase64() === '+/8AaGk=', 'toBase64');
assert(bytes.toBase64({ alphabet: 'base64url' }) === '-_8AaGk=', 'toBase64 base64url');
assert(bytes.toBase64({ omitPadding: true }) === '+/8AaGk', 'toBase64 omitPadding');
assert(bytes.toHex() === 'fbff006869', 'toHex');

const back = Uint8Array.fromBase64('-_8AaGk', { alphabet: 'base64url' });
assert(back.length === 5 && back[0] === 251 && back[4] === 105, 'fromBase64 base64url without padding');
assert(Uint8Array.fromBase64(' aGk = ').length === 2, 'fromBase64 skips whitespace');
assert(Uint8Array.fromHex('cafe').length === 2 && Uint8Array.fromHex('CAFE')[0] === 0xca, 'fromHex');

let threw = '';
try {
  Uint8Array.fromBase64('aGk*');
} catch (e) {
  threw = (e as Error).name;
}
assert(threw === 'SyntaxError', 'fromBase64 rejects a bad character');
threw = '';
try {
  Uint8Array.fromHex('abc');
} catch (e) {
  threw = (e as Error).name;
}
assert(threw === 'SyntaxError', 'fromHex rejects an odd length');
threw = '';
try {
  Uint8Array.fromBase64('aGk', { lastChunkHandling: 'strict' });
} catch (e) {
  threw = (e as Error).name;
}
assert(threw === 'SyntaxError', 'strict needs padding');
assert(Uint8Array.fromBase64('aGVsbG8', { lastChunkHandling: 'stop-before-partial' }).length === 3, 'stop-before-partial');

const target = new Uint8Array(4);
const r1 = target.setFromBase64('aGVsbG8=');
console.log(r1.read, r1.written);
assert(r1.read === 4 && r1.written === 3 && target[0] === 104 && target[2] === 108, 'setFromBase64 stops at whole chunks that fit');
const r2 = target.setFromHex('0a0b0c0d0e');
assert(r2.read === 8 && r2.written === 4 && target[3] === 13, 'setFromHex fills the array');

// ArrayBuffer#transfer: the bytes, resized, in a new buffer; the source is detached
const buf = new Uint8Array([1, 2, 3]).buffer;
const moved = buf.transfer(5);
assert(moved.byteLength === 5 && new Uint8Array(moved)[2] === 3 && new Uint8Array(moved)[4] === 0, 'transfer resizes');
assert(buf.detached && buf.byteLength === 0, 'transfer detaches the source');
