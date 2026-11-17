// process.kill / getuid / getgid / emitWarning
assert(process.kill(process.pid, 0) === true, 'signal 0 checks the process');

const uid = process.getuid();
const gid = process.getgid();
assert(typeof uid === 'number' && typeof gid === 'number', 'getuid / getgid return numbers');
assert(uid === process.geteuid() && gid === process.getegid(), 'the effective ids match');
if (process.platform !== 'win32') {
  assert(uid >= 0 && gid >= 0, 'real ids on Unix');
}

process.emitWarning('conformance probe', 'DeprecationWarning');
assert(true, 'emitWarning does not throw');
