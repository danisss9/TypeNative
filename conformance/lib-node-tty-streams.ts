// tty.WriteStream / ReadStream
import * as tty from 'node:tty';

// (as in Node, an fd that is not a terminal fails)
if (!tty.isatty(1)) {
  let code = '';
  try {
    new tty.WriteStream(1);
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code === 'ERR_TTY_INIT_FAILED', 'WriteStream on a pipe');
  process.exit(0);
}
const out = new tty.WriteStream(1);
assert(out.fd === 1 && typeof out.isTTY === 'boolean', 'WriteStream');
assert(out.columns >= 0 && out.rows >= 0, 'size');
const depth = out.getColorDepth();
assert([1, 4, 8, 24].includes(depth), 'getColorDepth');
assert(out.hasColors(2) === (depth >= 1), 'hasColors(2)');
if (out.isTTY) {
  const [cols, rows] = out.getWindowSize();
  assert(cols === out.columns && rows === out.rows, 'getWindowSize');
}
const input = new tty.ReadStream(0);
assert(input.fd === 0 && input.isRaw === false && typeof input.isTTY === 'boolean', 'ReadStream');
console.log('tty streams ok');
