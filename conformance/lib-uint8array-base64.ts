// Uint8Array.fromBase64 / u8.toBase64() (ES2026)
const bytes = new Uint8Array([72, 101, 108, 108, 111, 0, 255]);
const encoded = bytes.toBase64();
assert(encoded === 'SGVsbG8A/w==', 'toBase64 pads and uses the standard alphabet');
const decoded = Uint8Array.fromBase64(encoded);
assert(decoded.length === 7 && decoded[0] === 72 && decoded[5] === 0 && decoded[6] === 255, 'fromBase64 round-trips');
assert(new Uint8Array(0).toBase64() === '', 'empty array encodes to an empty string');
assert(Uint8Array.fromBase64('').length === 0, 'empty string decodes to no bytes');
assert(bytes.subarray(0, 5).toBase64() === 'SGVsbG8=', 'toBase64 on a subarray');
