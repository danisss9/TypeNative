import os, { EOL, platform } from 'node:os';

assert(['win32', 'linux', 'darwin', 'freebsd'].includes(platform()), 'platform');
assert(['x64', 'arm64', 'ia32', 'arm'].includes(os.arch()), 'arch');
assert(['Windows_NT', 'Linux', 'Darwin', 'FreeBSD'].includes(os.type()), 'type');
assert(os.machine().length > 0, 'machine');
assert(EOL === (platform() === 'win32' ? '\r\n' : '\n'), 'EOL');
assert(os.hostname().length > 0, 'hostname');
assert(os.homedir().length > 0 && os.tmpdir().length > 0, 'homedir / tmpdir');
assert(!os.tmpdir().endsWith('/') || os.tmpdir() === '/', 'tmpdir has no trailing slash');
assert(os.endianness() === 'LE' || os.endianness() === 'BE', 'endianness');
assert(os.cpus().length >= 1 && os.availableParallelism() >= 1, 'cpus');
assert(os.userInfo().username.length > 0, 'userInfo');
assert(os.devNull === (platform() === 'win32' ? '\\\\.\\nul' : '/dev/null'), 'devNull');
assert(os.constants.signals.SIGINT === 2 && os.constants.signals.SIGTERM === 15, 'signals');
const nets = os.networkInterfaces();
assert(Object.keys(nets).length >= 0, 'networkInterfaces');
