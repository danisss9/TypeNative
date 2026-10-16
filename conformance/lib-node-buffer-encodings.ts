const text = 'Hello, wörld';
const buf = Buffer.from(text);

assert(buf.toString('hex') === '48656c6c6f2c2077c3b6726c64', 'hex encode');
assert(Buffer.from('48656c6c6f', 'hex').toString() === 'Hello', 'hex decode');
assert(buf.toString('base64') === 'SGVsbG8sIHfDtnJsZA==', 'base64 encode');
assert(Buffer.from('SGVsbG8sIHfDtnJsZA==', 'base64').toString() === text, 'base64 decode');
assert(Buffer.from([251, 255]).toString('base64url') === '-_8', 'base64url encode');
assert(Buffer.from('-_8', 'base64url').toString('hex') === 'fbff', 'base64url decode');
assert(Buffer.from('é', 'latin1').length === 1 && Buffer.from([233]).toString('latin1') === 'é', 'latin1');
assert(Buffer.from('hi', 'utf16le').toString('hex') === '68006900', 'utf16le encode');
assert(Buffer.from('68006900', 'hex').toString('utf16le') === 'hi', 'utf16le decode');
assert(Buffer.from([0xc3]).toString() === '�', 'invalid utf8 replaced');

assert(btoa('hi') === 'aGk=' && atob('aGk=') === 'hi', 'atob / btoa');

const encoder = new TextEncoder();
const bytes = encoder.encode('ö');
assert(bytes.length === 2 && bytes[0] === 0xc3, 'TextEncoder');
assert(new TextDecoder().decode(bytes) === 'ö', 'TextDecoder');
assert(new TextDecoder('utf-16le').decode(Buffer.from('ok', 'utf16le')) === 'ok', 'TextDecoder utf-16le');

const arr = new Uint8Array(3);
arr[0] = 7;
assert(arr.length === 3 && arr[0] === 7 && arr[2] === 0, 'Uint8Array');
assert(new Uint8Array([1, 2, 3])[1] === 2, 'Uint8Array from array');

export {};
