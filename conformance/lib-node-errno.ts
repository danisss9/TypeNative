// Node's errno numbers for the target OS (libuv's: the OS's errno on Unix,
// fixed numbers such as ENOENT = -4058 on Windows) and libuv's messages
import * as fs from 'node:fs';
import * as util from 'node:util';

let errno = 0;
let code = '';
let message = '';
try {
  fs.readFileSync('/definitely/missing/file.txt');
} catch (e: any) {
  errno = e.errno;
  code = e.code;
  message = e.message;
}
assert(code === 'ENOENT', `code ${code}`);
assert(errno === (process.platform === 'win32' ? -4058 : -2), `ENOENT errno ${errno}`);
assert(message.startsWith('ENOENT: no such file or directory, open'), message);
assert(util.getSystemErrorName(errno) === 'ENOENT', 'errno names round-trip');
assert(util.getSystemErrorMessage(errno) === 'no such file or directory', 'libuv message');

const map = util.getSystemErrorMap();
assert(map.size === 85, `85 libuv errors (${map.size})`);
const eof = map.get(-4095) ?? [];
assert(eof[0] === 'EOF' && eof[1] === 'end of file', 'EOF is -4095 everywhere');
assert(util.getSystemErrorName(-3008) === 'EAI_NONAME', 'getaddrinfo errors');
assert(util.getSystemErrorName(-4080) === 'ECHARSET', 'libuv-only errors');
if (process.platform === 'linux') {
  assert(util.getSystemErrorName(-111) === 'ECONNREFUSED', 'Linux numbers');
} else if (process.platform === 'darwin') {
  assert(util.getSystemErrorName(-61) === 'ECONNREFUSED', 'macOS numbers');
} else if (process.platform === 'win32') {
  assert(util.getSystemErrorName(-4078) === 'ECONNREFUSED', 'Windows numbers');
}
console.log('errno ok');
