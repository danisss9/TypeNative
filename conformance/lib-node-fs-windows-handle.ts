// The windowsHandle stream option: a Windows HANDLE (bigint) the stream reads
// or writes through, converted into a file descriptor at construction. A real
// HANDLE cannot be obtained from pure JS, so the probe exercises the errors,
// which are exactly Node's: a non-bigint is a TypeError and an unusable handle
// is EBADF, thrown synchronously before the path is opened
import { createReadStream, createWriteStream } from 'node:fs';

function code(fn: () => void): string {
  try {
    fn();
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return `${e.code}: ${e.message}`;
  }
  return 'no error';
}

let failures = 0;
function assert(ok: boolean, label: string): void {
  if (!ok) {
    failures++;
    console.log(`FAIL ${label}`);
  }
}

const NOT_BIGINT = 'ERR_INVALID_ARG_TYPE: The "options.windowsHandle" property must be of type bigint.';
const BAD_HANDLE = 'EBADF: EBADF, Bad file descriptor';

assert(code(() => createReadStream('package.json', { windowsHandle: true as any })) === `${NOT_BIGINT} Received type boolean (true)`, 'a boolean handle on a read stream');
assert(code(() => createReadStream('package.json', { windowsHandle: 123 as any })) === `${NOT_BIGINT} Received type number (123)`, 'a number handle on a read stream');
assert(code(() => createReadStream('package.json', { windowsHandle: 1234567n })) === BAD_HANDLE, 'an invalid handle on a read stream');
// the path is never opened when a handle is given, so a missing file is EBADF too
assert(code(() => createReadStream('no-such-file-windows-handle', { windowsHandle: 1234567n })) === BAD_HANDLE, 'a handle skips opening the path');
assert(code(() => createWriteStream('out-windows-handle.tmp', { windowsHandle: true as any })) === `${NOT_BIGINT} Received type boolean (true)`, 'a boolean handle on a write stream');
assert(code(() => createWriteStream('out-windows-handle.tmp', { windowsHandle: 1234567n })) === BAD_HANDLE, 'an invalid handle on a write stream');

console.log(failures === 0 ? 'ok' : `failures: ${failures}`);
