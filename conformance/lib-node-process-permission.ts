// process.permission (`has`, `drop`) under --permission: grants come from
// NODE_OPTIONS; without the flag process.permission is undefined; the model
// gates fs / child_process / worker access with ERR_ACCESS_DENIED
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as net from 'node:net';

const self = process.argv[1];
const mode = process.env.TN_ROLE ?? '';
const perm = (process as any).permission;

if (mode === 'gc') {
  process.exit(0);
} else if (mode === 'nop') {
  assert(perm === undefined, `permission without --permission: ${String(perm)}`);
  console.log('nop ok');
} else if (mode === 'deny') {
  assert(perm !== undefined, 'permission exists under --permission');
  assert(perm.has('fs.read') === false && perm.has('fs.write') === false, 'fs denied');
  assert(perm.has('fs.read', process.cwd()) === false, 'fs.read of a path denied');
  assert(perm.has('child') === false && perm.has('worker') === false && perm.has('addon') === false, 'child/worker/addon denied');
  assert(perm.has('bogus') === false, 'unknown permission denied');
  const target = path.join(os.tmpdir(), 'tn-perm-target.txt');
  try {
    fs.readFileSync(target);
    assert(false, 'readFileSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `readFileSync ${e.code}`);
    assert(String(e.message).includes('Access to this API has been restricted'), e.message);
    assert(e.permission === 'FileSystemRead', `permission ${e.permission}`);
    assert(String(e.resource).endsWith('tn-perm-target.txt'), `resource ${e.resource}`);
  }
  // reads that only look are gated too
  const denied = (f: () => void): string => {
    try {
      f();
    } catch (e: any) {
      return String(e.code);
    }
    return 'allowed';
  };
  assert(denied(() => fs.readdirSync(os.tmpdir())) === 'ERR_ACCESS_DENIED', 'readdirSync');
  assert(denied(() => fs.statSync(target)) === 'ERR_ACCESS_DENIED', 'statSync');
  assert(denied(() => fs.existsSync(target)) === 'ERR_ACCESS_DENIED', 'existsSync');
  assert(denied(() => fs.copyFileSync(target, target + '.copy')) === 'ERR_ACCESS_DENIED', 'copyFileSync');
  assert(perm.has('net') === false && perm.has('fs') === false, 'net / fs denied');
  assert(denied(() => net.createServer().listen(0)) === 'ERR_ACCESS_DENIED', 'listen throws');
  try {
    fs.writeFileSync(path.join(os.tmpdir(), 'tn-perm-denied.txt'), 'x');
    assert(false, 'writeFileSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `writeFileSync ${e.code}`);
  }
  try {
    fs.openSync(target, 'r');
    assert(false, 'openSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `openSync ${e.code}`);
  }
  try {
    fs.mkdirSync(path.join(os.tmpdir(), 'tn-perm-denied-dir'));
    assert(false, 'mkdirSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `mkdirSync ${e.code}`);
  }
  try {
    spawnSync(process.execPath, ['--version']);
    assert(false, 'spawnSync should be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `spawnSync ${e.code}`);
    assert(String(e.message).includes('--allow-child-process'), e.message);
  }
  // drop() at runtime
  perm.drop('child');
  assert(perm.has('child') === false, 'drop is idempotent');
  perm.drop('fs.read');
  assert(perm.has('fs.read') === false && perm.has('fs.read', self) === false, 'drop fs.read');
  // connect: an 'error' event, as in Node
  net.connect(1, '127.0.0.1').on('error', (e: any) => {
    assert(e.code === 'ERR_ACCESS_DENIED' && e.syscall === 'connect' && e.permission === undefined, `connect ${e.code} ${e.syscall}`);
    assert(String(e.message).startsWith('connect ERR_ACCESS_DENIED') && String(e.message).includes('--allow-net'), e.message);
    console.log('deny ok');
  });
} else if (mode === 'allow') {
  // --permission --allow-fs-read=<dir> --allow-child-process
  const dir = process.env.TN_PERM_DIR!;
  assert(perm.has('fs.read') === false, 'a scoped fs.read grant is not the wildcard');
  assert(perm.has('fs.read', path.join(dir, 'probe.txt')) === true, 'a path under the grant');
  assert(perm.has('fs.read', path.join(dir, 'nope.txt')) === true, 'any path under the granted dir');
  assert(perm.has('fs.read', 'C:/Windows/system32') === false, 'a path outside the grant');
  assert(perm.has('fs.write') === false, 'writes still denied');
  assert(perm.has('child') === true, 'child allowed');
  assert(perm.has('worker') === false, 'worker still denied');
  // paths are resolved and matched at directory boundaries
  const sep = path.sep;
  assert(perm.has('fs.read', dir + 'X' + sep + 'probe.txt') === false, 'a sibling sharing the prefix');
  assert(perm.has('fs.read', dir + sep + '..' + sep + 'tn-perm-target.txt') === false, '.. out of the grant');
  assert(perm.has('fs.read', dir + sep + 'sub' + sep + '..' + sep + 'probe.txt') === true, '.. inside the grant');
  let escaped = '';
  try {
    escaped = fs.readFileSync(dir + sep + '..' + sep + 'tn-perm-target.txt', 'utf8');
  } catch (e: any) {
    escaped = e.code;
  }
  assert(escaped === 'ERR_ACCESS_DENIED', `reading through .. is denied: ${escaped}`);
  const cwd = process.cwd();
  let chdirOut = '';
  try {
    process.chdir(path.dirname(dir));
  } catch (e: any) {
    chdirOut = e.code;
  }
  assert(chdirOut === 'ERR_ACCESS_DENIED', `chdir out of the grant: ${chdirOut}`);
  process.chdir(dir);
  assert(perm.has('fs.read', 'probe.txt') === true && perm.has('fs.read', '..' + sep + 'tn-perm-target.txt') === false, 'relative paths resolve against the cwd');
  assert(fs.readFileSync('probe.txt', 'utf8') === 'granted\n', 'relative read under the grant');
  assert(cwd !== '', 'cwd');
  assert(perm.has('net') === true, '--allow-net');
  const data = fs.readFileSync(path.join(dir, 'probe.txt'), 'utf8');
  assert(data === 'granted\n', `readFileSync under the grant: ${JSON.stringify(data)}`);
  const r = spawnSync(process.execPath, [self], { env: { ...process.env, TN_ROLE: 'gc' }, encoding: 'utf8' });
  assert(r.status === 0, `spawnSync allowed: ${r.status} ${r.stderr}`);
  try {
    fs.writeFileSync(path.join(dir, 'no.txt'), 'x');
    assert(false, 'writeFileSync should still be denied');
  } catch (e: any) {
    assert(e.code === 'ERR_ACCESS_DENIED', `writeFileSync ${e.code}`);
  }
  // dropping a path inside the granted directory leaves the grant; dropping
  // the granted directory removes it
  perm.drop('fs.read', path.join(dir, 'probe.txt'));
  assert(perm.has('fs.read', path.join(dir, 'probe.txt')) === true, 'still covered by the directory grant');
  perm.drop('fs.read', dir);
  assert(perm.has('fs.read', path.join(dir, 'other.txt')) === false, 'the directory grant is gone');
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => {
    srv.close();
    console.log('allow ok');
  });
} else {
  // the parent: run this program again under three permission configurations
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-perm-'));
  fs.writeFileSync(path.join(dir, 'probe.txt'), 'granted\n');
  fs.writeFileSync(path.join(dir, 'other.txt'), 'other\n');
  fs.writeFileSync(path.join(os.tmpdir(), 'tn-perm-target.txt'), 'target\n');
  const run = (role: string, nodeOptions: string) => {
    const r = spawnSync(process.execPath, [self], {
      env: { ...process.env, TN_ROLE: role, NODE_OPTIONS: nodeOptions, TN_PERM_DIR: dir },
      encoding: 'utf8'
    });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
  const nop = run('nop', '');
  assert(nop.out === 'nop ok\n' && nop.code === 0, `no permission: ${JSON.stringify(nop)}`);
  const deny = run('deny', '--permission');
  assert(deny.out === 'deny ok\n' && deny.code === 0, `denied model: ${JSON.stringify(deny)}`);
  // (quoted, as a path with spaces would need: backslashes escape inside quotes)
  const quoted = dir.split('\\').join('\\\\');
  const allow = run('allow', `--permission "--allow-fs-read=${quoted}" --allow-child-process --allow-net`);
  assert(allow.out === 'allow ok\n' && allow.code === 0, `granted model: ${JSON.stringify(allow)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('process.permission ok');
}
