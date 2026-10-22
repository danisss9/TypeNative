// process.stdout.columns / rows / getWindowSize, stdin.setRawMode and umask
// (run with output piped: not a terminal, so the size is 0 and raw mode throws)

const out = process.stdout;
if (!out.isTTY) {
  assert(out.columns === 0 && out.rows === 0, 'no size when stdout is not a terminal');
  const size = out.getWindowSize();
  assert(size.length === 2 && size[0] === 0, 'getWindowSize is [columns, rows]');
  const width = process.stdout.columns || 80;
  assert(width === 80, 'columns || 80 falls back');
}
assert(process.stderr.rows >= 0, 'stderr rows');

assert(process.stdin.isRaw === false, 'stdin starts cooked');
if (!process.stdin.isTTY) {
  let threw = false;
  try {
    process.stdin.setRawMode(true);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'setRawMode throws when stdin is not a terminal');
  assert(!process.stdin.isRaw, 'isRaw unchanged after a failed setRawMode');
}

if (process.platform !== 'win32') {
  const original = process.umask();
  const old = process.umask(0o027);
  assert(old === original, 'umask(mask) returns the previous mask');
  assert(process.umask() === 0o027, 'umask() reads the mask back');
  assert(process.umask('022') === 0o027, 'octal string masks');
  assert(process.umask() === 0o022, 'octal string applied');
  process.umask(original);
} else {
  assert(process.umask() === 0, 'no umask on Windows');
}

console.log('process tty ok');
