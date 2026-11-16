// process in Node 25/26: version, ref / unref, execve, uncaught exception capture callbacks
// (plus v8 heap spaces and module.findPackageJSON)
import { getHeapSpaceStatistics, getHeapCodeStatistics } from 'node:v8';
import { findPackageJSON } from 'node:module';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

assert(process.version.startsWith('v26.') && process.versions.node.startsWith('26.'), 'reports Node 26');

// ref / unref a timer through process
const timer = setTimeout(() => {
  throw new Error('an unref-ed timer must not keep the process alive');
}, 60000);
process.unref(timer);
process.ref(timer);
process.unref(timer);

// execve: Windows has none
if (process.platform === 'win32') {
  let code = '';
  try {
    process.execve('cmd.exe');
  } catch (e) {
    code = (e as NodeJS.ErrnoException).code ?? '';
  }
  assert(code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM', 'execve on Windows');
}

// v8 heap spaces / code statistics
const spaces = getHeapSpaceStatistics();
const old = spaces.find((s) => s.space_name === 'old_space');
assert(spaces.length > 3 && old !== undefined && old.space_size >= old.space_used_size, 'getHeapSpaceStatistics');
assert(getHeapCodeStatistics().cpu_profiler_metadata_size === 0, 'getHeapCodeStatistics');

// module.findPackageJSON: the nearest package.json at or above the specifier
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-pkg-'));
fs.mkdirSync(path.join(root, 'src', 'deep'), { recursive: true });
fs.mkdirSync(path.join(root, 'node_modules', 'dep'), { recursive: true });
fs.writeFileSync(path.join(root, 'package.json'), '{}');
fs.writeFileSync(path.join(root, 'node_modules', 'dep', 'package.json'), '{}');
const base = path.join(root, 'src', 'deep', 'file.js');
// (Node on Windows answers with a \\?\ long-path prefix)
const found = (p: string | undefined) => (p ?? '').replace('\\\\?\\', '');
assert(found(findPackageJSON('.', base)) === path.join(root, 'package.json'), 'findPackageJSON walks up');
assert(found(findPackageJSON('dep', base)) === path.join(root, 'node_modules', 'dep', 'package.json'), 'findPackageJSON of a package');
fs.rmSync(root, { recursive: true, force: true });

// capture callbacks (last: they take every later uncaught error)
assert(!process.hasUncaughtExceptionCaptureCallback(), 'no capture callback yet');
let captured = '';
process.addUncaughtExceptionCaptureCallback((err: Error) => {
  captured = err.message;
  return true;
});
setTimeout(() => {
  throw new Error('boom');
}, 1);
setTimeout(() => {
  console.log('captured', captured);
  assert(captured === 'boom', 'addUncaughtExceptionCaptureCallback');
  process.setUncaughtExceptionCaptureCallback((err: Error) => {
    captured = 'set:' + err.message;
  });
  assert(process.hasUncaughtExceptionCaptureCallback(), 'set callback');
  setTimeout(() => {
    throw new Error('again');
  }, 1);
  setTimeout(() => assert(captured === 'set:again', 'setUncaughtExceptionCaptureCallback'), 20);
}, 20);
